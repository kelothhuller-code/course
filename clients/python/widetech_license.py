"""
WideTech licence client for Python desktop apps (Windows / macOS / Linux).

Only dependency: `cryptography` (pip install cryptography).

    from widetech_license import LicenseClient
    lic = LicenseClient(
        api_base="https://widetech.in/api/license/v1",
        app_id="your-app-id",                 # admin → Software → App ID
        public_key="BASE64_PUBLIC_KEY",       # from scripts/generate-license-keypair.mjs (safe to embed)
        app_version="1.0.0",
    )
    state = lic.check()                       # call on every launch
    if not state["allowed"]:
        show_lock_screen(state["message"])

Every server answer is signed (Ed25519). Answers that fail the signature, nonce, device or app
checks are rejected. See docs/LICENSING.md.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import platform
import re
import secrets
import socket
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

ALLOWED = {"active", "trial"}


class LicenseError(Exception):
    def __init__(self, message: str, http_status: int | None = None):
        super().__init__(message)
        self.http_status = http_status


def _ms(iso: str | None) -> float | None:
    if not iso:
        return None
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000


def raw_machine_id() -> str | None:
    """Stable per-machine id that survives reinstalling the app."""
    try:
        system = platform.system()
        if system == "Windows":
            import winreg  # type: ignore

            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography",
                                0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as k:
                return "win:" + winreg.QueryValueEx(k, "MachineGuid")[0]
        if system == "Darwin":
            out = subprocess.run(["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
                                 capture_output=True, text=True, timeout=5).stdout
            m = re.search(r'"IOPlatformUUID"\s*=\s*"([^"]+)"', out)
            if m:
                return "mac:" + m.group(1)
        for f in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
            p = Path(f)
            if p.exists() and p.read_text().strip():
                return "linux:" + p.read_text().strip()
    except Exception:
        pass
    return None


class LicenseClient:
    def __init__(self, api_base: str, app_id: str, public_key: str, app_version: str = "",
                 storage_dir: str | None = None, offline_grace_hours: float = 0,
                 clock_skew_seconds: int = 300, device_id: str | None = None,
                 device_name: str | None = None, timeout: float = 15):
        self.api_base = api_base.rstrip("/")
        self.app_id = app_id
        self.app_version = app_version
        self.offline_grace_ms = max(0.0, float(offline_grace_hours or 0)) * 3600e3
        self.skew_ms = clock_skew_seconds * 1000
        self.timeout = timeout
        self.device_name = device_name or socket.gethostname()
        base = Path(storage_dir) if storage_dir else Path.home() / ".widetech" / app_id
        self.storage_file = base / "license.json"
        raw = base64.b64decode(public_key)
        if len(raw) != 32:
            raise LicenseError("public_key must be a base64 32-byte Ed25519 key")
        self._public_key = Ed25519PublicKey.from_public_bytes(raw)
        self._device_id = device_id

    # ---- storage --------------------------------------------------------------------------
    def _load(self) -> dict:
        try:
            return json.loads(self.storage_file.read_text())
        except Exception:
            return {}

    def _save(self, state: dict) -> None:
        self.storage_file.parent.mkdir(parents=True, exist_ok=True)
        self.storage_file.write_text(json.dumps(state, indent=2))
        try:
            os.chmod(self.storage_file, 0o600)
        except OSError:
            pass

    def device_id(self) -> str:
        if self._device_id:
            return self._device_id
        raw = raw_machine_id()
        if not raw:
            # Fallback: random id saved next to the licence file (weaker: deleting the file resets it)
            s = self._load()
            if not s.get("fallbackDeviceId"):
                s["fallbackDeviceId"] = str(uuid.uuid4())
                self._save(s)
            raw = "fallback:" + s["fallbackDeviceId"]
        self._device_id = hashlib.sha256(f"widetech:{self.app_id}:{raw}".encode()).hexdigest()
        return self._device_id

    def saved_key(self) -> str | None:
        return self._load().get("licenseKey")

    # ---- signed responses -----------------------------------------------------------------
    def verify(self, envelope: dict, expected_nonce: str | None = None) -> dict:
        """Verifies a {payload, signature} answer and returns the payload, or raises."""
        if not isinstance(envelope, dict) or not isinstance(envelope.get("payload"), str) \
                or not isinstance(envelope.get("signature"), str):
            raise LicenseError("Unsigned response")
        try:
            self._public_key.verify(base64.b64decode(envelope["signature"]), envelope["payload"].encode("utf-8"))
        except (InvalidSignature, ValueError):
            raise LicenseError("Invalid signature (response was tampered with or came from the wrong server)")
        p = json.loads(envelope["payload"])
        if expected_nonce is not None and p.get("nonce") != expected_nonce:
            raise LicenseError("Nonce mismatch (replayed response)")
        if p.get("deviceId") != self.device_id():
            raise LicenseError("Response is for a different device")
        if p.get("appId") != self.app_id:
            raise LicenseError("Response is for a different app")
        return p

    def _call(self, endpoint: str, body: dict) -> tuple[dict, dict]:
        nonce = secrets.token_urlsafe(24)
        data = {"softwareSlug": self.app_id, "deviceId": self.device_id(), "deviceName": self.device_name,
                "appVersion": self.app_version, "nonce": nonce, **body}
        req = urllib.request.Request(f"{self.api_base}/{endpoint}", data=json.dumps(data).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                j = json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read().decode()).get("message")
            except Exception:
                msg = None
            raise LicenseError(msg or f"Server error {e.code}", http_status=e.code)
        envelope = {"payload": j.get("payload"), "signature": j.get("signature")}
        return self.verify(envelope, nonce), envelope

    def _remember(self, envelope: dict, payload: dict, **extra) -> None:
        s = self._load()
        s["lastResponse"] = envelope
        s["maxServerTime"] = max(s.get("maxServerTime") or 0, _ms(payload["serverTime"]))
        s.update(extra)
        self._save(s)

    @staticmethod
    def _state(p: dict, source: str) -> dict:
        now = _ms(p["serverTime"])
        exp = _ms(p.get("expiresAt"))
        allowed = p.get("status") in ALLOWED and (exp is None or exp > now)
        status = p.get("status")
        if not allowed and status in ALLOWED:
            status = "expired"
        return {
            "allowed": allowed, "status": status, "message": p.get("message"), "plan": p.get("plan"),
            "expiresAt": p.get("expiresAt"),
            "daysLeft": None if exp is None else max(0, -(-(exp - now) // 86400e3)),
            "maxDevices": p.get("maxDevices"), "devicesUsed": p.get("devicesUsed"),
            "buyUrl": p.get("buyUrl"), "serverTime": p.get("serverTime"), "source": source,
        }

    def _offline(self, reason: str) -> dict:
        def locked(status, message):
            return {"allowed": False, "status": status, "message": message, "source": "offline"}
        if not self.offline_grace_ms:
            return locked("offline", "An internet connection is required to check your licence.")
        s = self._load()
        if not s.get("lastResponse"):
            return locked("offline", "Connect to the internet once to check your licence.")
        try:
            p = self.verify(s["lastResponse"])
        except LicenseError:
            return locked("invalid", "Saved licence data is not valid. Please connect to the internet.")
        now = time.time() * 1000
        cached_at = _ms(p["serverTime"])
        if now + self.skew_ms < (s.get("maxServerTime") or cached_at):
            return locked("clock_tampered", "Your computer clock looks wrong. Fix the date and time, then connect to the internet.")
        if now - cached_at > self.offline_grace_ms:
            return locked("offline", "Please connect to the internet to re-check your licence.")
        st = self._state({**p, "serverTime": datetime.fromtimestamp(max(now, cached_at) / 1000, timezone.utc).isoformat().replace("+00:00", "Z")}, "cache")
        if st["allowed"]:
            st["message"] = f"Offline mode ({reason})."
        return st

    def _handle(self, e: Exception) -> dict:
        if isinstance(e, LicenseError) and e.http_status is None:
            return {"allowed": False, "status": "invalid", "message": str(e), "source": "online"}
        if isinstance(e, LicenseError) and e.http_status == 429:
            return {"allowed": False, "status": "rate_limited", "message": str(e), "source": "online"}
        return self._offline(str(e) or "network error")

    # ---- public API -----------------------------------------------------------------------
    def check(self) -> dict:
        """Call on every launch: validates the saved key, or starts/continues the free trial."""
        key = self.saved_key()
        try:
            payload, env = self._call("validate", {"licenseKey": key}) if key else self._call("trial", {})
            self._remember(env, payload)
            return self._state(payload, "online")
        except Exception as e:  # network errors, HTTP errors, bad signatures
            return self._handle(e)

    def activate(self, license_key: str) -> dict:
        """Activates a key on this device; saves it when accepted."""
        key = (license_key or "").strip().upper()
        try:
            payload, env = self._call("activate", {"licenseKey": key})
        except LicenseError as e:
            if e.http_status is None:
                return {"allowed": False, "status": "invalid", "message": str(e), "source": "online"}
            return {"allowed": False, "status": "error", "message": str(e), "source": "online"}
        except Exception:
            return {"allowed": False, "status": "offline", "message": "Could not reach the licence server. Check your internet connection.", "source": "offline"}
        st = self._state(payload, "online")
        if st["allowed"]:
            self._remember(env, payload, licenseKey=key)
        return st

    def deactivate(self) -> dict:
        key = self.saved_key()
        if not key:
            return {"ok": True}
        payload, _ = self._call("deactivate", {"licenseKey": key})
        s = self._load()
        s.pop("licenseKey", None)
        s.pop("lastResponse", None)
        self._save(s)
        return {"ok": True, "message": payload.get("message")}

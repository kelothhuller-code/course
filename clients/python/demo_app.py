#!/usr/bin/env python3
"""
Minimal demo app: shows a lock screen until there is a valid trial or licence.

    WT_API=http://localhost:5001/api/license/v1 WT_APP_ID=sample-billing-desk WT_PUBLIC_KEY=... python demo_app.py
    python demo_app.py --key WT-XXXXX-XXXXX-XXXXX-XXXXX
"""
import os
import sys

from widetech_license import LicenseClient

lic = LicenseClient(
    api_base=os.environ.get("WT_API", "https://widetech.in/api/license/v1"),
    app_id=os.environ.get("WT_APP_ID", "your-app-id"),
    public_key=os.environ.get("WT_PUBLIC_KEY", "PASTE_YOUR_PUBLIC_KEY_HERE_BASE64_32_BYTES_AAAA="),
    app_version="1.0.0",
    storage_dir=os.environ.get("WT_STORAGE_DIR"),
    device_id=os.environ.get("WT_DEVICE_ID"),
    offline_grace_hours=float(os.environ.get("WT_GRACE_HOURS", "0")),
)
LINE = "─" * 52


def run_app(st):
    left = "lifetime" if st.get("daysLeft") is None else f"{int(st['daysLeft'])} day(s) left"
    print(f"\n{LINE}\n  ✅ Sample Billing Desk is unlocked\n  Status: {st['status']} ({st.get('plan')}) · {left}\n{LINE}\n  …your real app starts here…\n")


def lock_screen(st):
    print(f"\n{LINE}\n  🔒 Sample Billing Desk is locked\n{LINE}\n  {st['message']}")
    if st.get("buyUrl"):
        print(f"  Buy a licence: {st['buyUrl']}")
    print("  Enter your licence key below (or press Enter to quit).\n")


def main():
    if "--key" in sys.argv:
        st = lic.activate(sys.argv[sys.argv.index("--key") + 1])
        if st["allowed"]:
            return run_app(st)
        lock_screen(st)
        sys.exit(2)
    st = lic.check()
    if st["allowed"]:
        return run_app(st)
    lock_screen(st)
    if not sys.stdin.isatty():
        sys.exit(2)
    while True:
        key = input("  Licence key: ").strip()
        if not key:
            sys.exit(2)
        st = lic.activate(key)
        if st["allowed"]:
            return run_app(st)
        print(f"  ✖ {st['message']}\n")


if __name__ == "__main__":
    main()

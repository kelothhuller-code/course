// WideTech licence client for .NET (WinForms / WPF / console). See docs/LICENSING.md.
//
//   var lic = new LicenseClient(new LicenseOptions {
//       ApiBase = "https://widetech.in/api/license/v1",
//       AppId = "your-app-id",               // admin → Software → App ID
//       PublicKey = "BASE64_PUBLIC_KEY",     // from scripts/generate-license-keypair.mjs (safe to embed)
//       AppVersion = "1.0.0",
//   });
//   var state = await lic.CheckAsync();     // call on every launch
//   if (!state.Allowed) ShowLockScreen(state.Message);
//
// Every server answer is signed (Ed25519). Answers that fail the signature, nonce, device or app
// checks are rejected, so an edited response or a fake server cannot unlock the app.
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Win32;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;

namespace WideTech.Licensing
{
    public class LicenseOptions
    {
        public string ApiBase { get; set; }
        public string AppId { get; set; }
        public string PublicKey { get; set; }
        public string AppVersion { get; set; } = "";
        public string StorageDir { get; set; }
        /// <summary>0 = always online (default). e.g. 24–72 to allow short internet outages.</summary>
        public double OfflineGraceHours { get; set; } = 0;
        public int ClockSkewSeconds { get; set; } = 300;
        /// <summary>Override for tests; normally derived from the machine id.</summary>
        public string DeviceId { get; set; }
        public string DeviceName { get; set; }
        public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(15);
    }

    public class LicenseState
    {
        public bool Allowed { get; set; }
        public string Status { get; set; }   // active, trial, expired, revoked, invalid, device_limit, offline, clock_tampered
        public string Message { get; set; }
        public string Plan { get; set; }
        public DateTimeOffset? ExpiresAt { get; set; }
        public int? DaysLeft { get; set; }
        public string BuyUrl { get; set; }
        public string Source { get; set; }   // online, cache, offline
    }

    public class LicenseException : Exception
    {
        public int? HttpStatus { get; }
        public LicenseException(string message, int? httpStatus = null) : base(message) { HttpStatus = httpStatus; }
    }

    public class LicenseClient
    {
        private static readonly HashSet<string> AllowedStatuses = new HashSet<string> { "active", "trial" };
        private static readonly HttpClient Http = new HttpClient();
        private readonly LicenseOptions _o;
        private readonly Ed25519PublicKeyParameters _publicKey;
        private readonly string _storageFile;
        private string _deviceId;

        public LicenseClient(LicenseOptions options)
        {
            _o = options ?? throw new ArgumentNullException(nameof(options));
            if (string.IsNullOrEmpty(_o.ApiBase) || string.IsNullOrEmpty(_o.AppId) || string.IsNullOrEmpty(_o.PublicKey))
                throw new LicenseException("ApiBase, AppId and PublicKey are required");
            var raw = Convert.FromBase64String(_o.PublicKey);
            if (raw.Length != 32) throw new LicenseException("PublicKey must be a base64 32-byte Ed25519 key");
            _publicKey = new Ed25519PublicKeyParameters(raw, 0);
            var dir = _o.StorageDir ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "WideTech", _o.AppId);
            _storageFile = Path.Combine(dir, "license.json");
            _deviceId = _o.DeviceId;
        }

        // ---- storage --------------------------------------------------------------------------
        private class Stored
        {
            public string licenseKey { get; set; }
            public Dictionary<string, string> lastResponse { get; set; }
            public double maxServerTime { get; set; }
            public string fallbackDeviceId { get; set; }
        }

        private Stored Load()
        {
            try { return JsonSerializer.Deserialize<Stored>(File.ReadAllText(_storageFile)) ?? new Stored(); }
            catch { return new Stored(); }
        }

        private void Save(Stored s)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_storageFile));
            File.WriteAllText(_storageFile, JsonSerializer.Serialize(s, new JsonSerializerOptions { WriteIndented = true }));
        }

        public string SavedKey() => Load().licenseKey;

        // ---- device id ------------------------------------------------------------------------
        private static string RawMachineId()
        {
            try
            {
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    using (var k = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64).OpenSubKey(@"SOFTWARE\Microsoft\Cryptography"))
                    {
                        var v = k?.GetValue("MachineGuid") as string;
                        if (!string.IsNullOrEmpty(v)) return "win:" + v;
                    }
                }
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
                {
                    var psi = new System.Diagnostics.ProcessStartInfo("ioreg", "-rd1 -c IOPlatformExpertDevice") { RedirectStandardOutput = true, UseShellExecute = false };
                    using (var p = System.Diagnostics.Process.Start(psi))
                    {
                        var m = Regex.Match(p.StandardOutput.ReadToEnd(), "\"IOPlatformUUID\"\\s*=\\s*\"([^\"]+)\"");
                        if (m.Success) return "mac:" + m.Groups[1].Value;
                    }
                }
                foreach (var f in new[] { "/etc/machine-id", "/var/lib/dbus/machine-id" })
                    if (File.Exists(f) && File.ReadAllText(f).Trim().Length > 0) return "linux:" + File.ReadAllText(f).Trim();
            }
            catch { /* fall through */ }
            return null;
        }

        public string DeviceId()
        {
            if (!string.IsNullOrEmpty(_deviceId)) return _deviceId;
            var raw = RawMachineId();
            if (raw == null)
            {
                var s = Load();
                if (string.IsNullOrEmpty(s.fallbackDeviceId)) { s.fallbackDeviceId = Guid.NewGuid().ToString(); Save(s); }
                raw = "fallback:" + s.fallbackDeviceId;
            }
            using (var sha = SHA256.Create())
            {
                var hash = sha.ComputeHash(Encoding.UTF8.GetBytes($"widetech:{_o.AppId}:{raw}"));
                _deviceId = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
            return _deviceId;
        }

        // ---- signed responses -----------------------------------------------------------------
        /// <summary>Verifies a signed answer; returns its payload or throws.</summary>
        public JsonElement Verify(string payload, string signature, string expectedNonce)
        {
            if (payload == null || signature == null) throw new LicenseException("Unsigned response");
            var verifier = new Ed25519Signer();
            verifier.Init(false, _publicKey);
            var bytes = Encoding.UTF8.GetBytes(payload);
            verifier.BlockUpdate(bytes, 0, bytes.Length);
            byte[] sig;
            try { sig = Convert.FromBase64String(signature); } catch { throw new LicenseException("Invalid signature"); }
            if (!verifier.VerifySignature(sig)) throw new LicenseException("Invalid signature (response was tampered with or came from the wrong server)");
            var p = JsonDocument.Parse(payload).RootElement;
            if (expectedNonce != null && Str(p, "nonce") != expectedNonce) throw new LicenseException("Nonce mismatch (replayed response)");
            if (Str(p, "deviceId") != DeviceId()) throw new LicenseException("Response is for a different device");
            if (Str(p, "appId") != _o.AppId) throw new LicenseException("Response is for a different app");
            return p;
        }

        private static string Str(JsonElement e, string name) =>
            e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

        private static string NewNonce()
        {
            var b = new byte[24];
            using (var rng = RandomNumberGenerator.Create()) rng.GetBytes(b);
            return Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        private async Task<(JsonElement payload, Dictionary<string, string> envelope)> CallAsync(string endpoint, Dictionary<string, string> extra)
        {
            var nonce = NewNonce();
            var body = new Dictionary<string, string>
            {
                ["softwareSlug"] = _o.AppId, ["deviceId"] = DeviceId(), ["deviceName"] = _o.DeviceName ?? Environment.MachineName,
                ["appVersion"] = _o.AppVersion, ["nonce"] = nonce,
            };
            foreach (var kv in extra) body[kv.Key] = kv.Value;
            var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            using (var cts = new System.Threading.CancellationTokenSource(_o.Timeout))
            {
                var res = await Http.PostAsync($"{_o.ApiBase.TrimEnd('/')}/{endpoint}", content, cts.Token).ConfigureAwait(false);
                var text = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
                if (!res.IsSuccessStatusCode)
                {
                    string msg = null;
                    try { msg = Str(JsonDocument.Parse(text).RootElement, "message"); } catch { }
                    throw new LicenseException(msg ?? $"Server error {(int)res.StatusCode}", (int)res.StatusCode);
                }
                var root = JsonDocument.Parse(text).RootElement;
                var env = new Dictionary<string, string> { ["payload"] = Str(root, "payload"), ["signature"] = Str(root, "signature") };
                return (Verify(env["payload"], env["signature"], nonce), env);
            }
        }

        private static double Ms(string iso) => DateTimeOffset.Parse(iso, System.Globalization.CultureInfo.InvariantCulture).ToUnixTimeMilliseconds();

        private void Remember(Dictionary<string, string> env, JsonElement p, string key = null)
        {
            var s = Load();
            s.lastResponse = env;
            s.maxServerTime = Math.Max(s.maxServerTime, Ms(Str(p, "serverTime")));
            if (key != null) s.licenseKey = key;
            Save(s);
        }

        private static LicenseState ToState(JsonElement p, string source, double? nowOverride = null)
        {
            var now = nowOverride ?? Ms(Str(p, "serverTime"));
            var expStr = Str(p, "expiresAt");
            double? exp = expStr == null ? (double?)null : Ms(expStr);
            var status = Str(p, "status");
            var allowed = AllowedStatuses.Contains(status) && (exp == null || exp > now);
            return new LicenseState
            {
                Allowed = allowed,
                Status = !allowed && AllowedStatuses.Contains(status) ? "expired" : status,
                Message = Str(p, "message"),
                Plan = Str(p, "plan"),
                ExpiresAt = expStr == null ? (DateTimeOffset?)null : DateTimeOffset.Parse(expStr, System.Globalization.CultureInfo.InvariantCulture),
                DaysLeft = exp == null ? (int?)null : (int)Math.Max(0, Math.Ceiling((exp.Value - now) / 86400000d)),
                BuyUrl = Str(p, "buyUrl"),
                Source = source,
            };
        }

        private LicenseState Offline(string reason)
        {
            LicenseState Locked(string st, string msg) => new LicenseState { Allowed = false, Status = st, Message = msg, Source = "offline" };
            if (_o.OfflineGraceHours <= 0) return Locked("offline", "An internet connection is required to check your licence.");
            var s = Load();
            if (s.lastResponse == null) return Locked("offline", "Connect to the internet once to check your licence.");
            JsonElement p;
            try { p = Verify(s.lastResponse["payload"], s.lastResponse["signature"], null); }
            catch { return Locked("invalid", "Saved licence data is not valid. Please connect to the internet."); }
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var cachedAt = Ms(Str(p, "serverTime"));
            if (now + _o.ClockSkewSeconds * 1000 < Math.Max(s.maxServerTime, cachedAt)) return Locked("clock_tampered", "Your computer clock looks wrong. Fix the date and time, then connect to the internet.");
            if (now - cachedAt > _o.OfflineGraceHours * 3600000) return Locked("offline", "Please connect to the internet to re-check your licence.");
            var st = ToState(p, "cache", Math.Max(now, cachedAt));
            if (st.Allowed) st.Message = $"Offline mode ({reason}).";
            return st;
        }

        private LicenseState Handle(Exception e)
        {
            if (e is LicenseException le && le.HttpStatus == null) return new LicenseState { Allowed = false, Status = "invalid", Message = le.Message, Source = "online" };
            if (e is LicenseException le2 && le2.HttpStatus == 429) return new LicenseState { Allowed = false, Status = "rate_limited", Message = le2.Message, Source = "online" };
            return Offline(e.Message);
        }

        /// <summary>Call on every launch: validates the saved key, or starts/continues the free trial.</summary>
        public async Task<LicenseState> CheckAsync()
        {
            var key = SavedKey();
            try
            {
                var r = key != null
                    ? await CallAsync("validate", new Dictionary<string, string> { ["licenseKey"] = key }).ConfigureAwait(false)
                    : await CallAsync("trial", new Dictionary<string, string>()).ConfigureAwait(false);
                Remember(r.envelope, r.payload);
                return ToState(r.payload, "online");
            }
            catch (Exception e) { return Handle(e); }
        }

        /// <summary>Activates a key on this device and saves it when accepted.</summary>
        public async Task<LicenseState> ActivateAsync(string licenseKey)
        {
            var key = (licenseKey ?? "").Trim().ToUpperInvariant();
            try
            {
                var r = await CallAsync("activate", new Dictionary<string, string> { ["licenseKey"] = key }).ConfigureAwait(false);
                var st = ToState(r.payload, "online");
                if (st.Allowed) Remember(r.envelope, r.payload, key);
                return st;
            }
            catch (LicenseException e) when (e.HttpStatus == null) { return new LicenseState { Allowed = false, Status = "invalid", Message = e.Message, Source = "online" }; }
            catch (Exception) { return new LicenseState { Allowed = false, Status = "offline", Message = "Could not reach the licence server. Check your internet connection.", Source = "offline" }; }
        }

        /// <summary>Frees this device's slot and forgets the key locally.</summary>
        public async Task DeactivateAsync()
        {
            var key = SavedKey();
            if (key == null) return;
            await CallAsync("deactivate", new Dictionary<string, string> { ["licenseKey"] = key }).ConfigureAwait(false);
            var s = Load(); s.licenseKey = null; s.lastResponse = null; Save(s);
        }
    }
}

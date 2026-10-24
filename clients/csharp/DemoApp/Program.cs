// Minimal demo: shows a lock screen until there is a valid trial or licence.
//   WT_API=http://localhost:5001/api/license/v1 WT_APP_ID=sample-billing-desk WT_PUBLIC_KEY=... dotnet run --project DemoApp
//   dotnet run --project DemoApp -- --key WT-XXXXX-XXXXX-XXXXX-XXXXX
using System;
using System.Linq;
using WideTech.Licensing;

var env = (string k, string d) => Environment.GetEnvironmentVariable(k) ?? d;
var lic = new LicenseClient(new LicenseOptions
{
    ApiBase = env("WT_API", "https://widetech.in/api/license/v1"),
    AppId = env("WT_APP_ID", "your-app-id"),
    PublicKey = env("WT_PUBLIC_KEY", "PASTE_YOUR_PUBLIC_KEY_HERE_BASE64_32_BYTES_AAAA="),
    AppVersion = "1.0.0",
    StorageDir = Environment.GetEnvironmentVariable("WT_STORAGE_DIR"),
    DeviceId = Environment.GetEnvironmentVariable("WT_DEVICE_ID"),
    OfflineGraceHours = double.Parse(env("WT_GRACE_HOURS", "0")),
});
var line = new string('─', 52);

void RunApp(LicenseState s) =>
    Console.WriteLine($"\n{line}\n  ✅ Sample Billing Desk is unlocked\n  Status: {s.Status} ({s.Plan}) · {(s.DaysLeft == null ? "lifetime" : s.DaysLeft + " day(s) left")}\n{line}\n  …your real app starts here…\n");
void Lock(LicenseState s) =>
    Console.WriteLine($"\n{line}\n  🔒 Sample Billing Desk is locked\n{line}\n  {s.Message}\n{(s.BuyUrl != null ? "  Buy a licence: " + s.BuyUrl + "\n" : "")}  Enter your licence key below (or press Enter to quit).\n");

var i = Array.IndexOf(args, "--key");
LicenseState st;
if (i >= 0 && i + 1 < args.Length)
{
    st = await lic.ActivateAsync(args[i + 1]);
    if (st.Allowed) { RunApp(st); return 0; }
    Lock(st); return 2;
}
st = await lic.CheckAsync();
if (st.Allowed) { RunApp(st); return 0; }
Lock(st);
if (Console.IsInputRedirected) return 2;
while (true)
{
    Console.Write("  Licence key: ");
    var k = Console.ReadLine()?.Trim();
    if (string.IsNullOrEmpty(k)) return 2;
    st = await lic.ActivateAsync(k);
    if (st.Allowed) { RunApp(st); return 0; }
    Console.WriteLine($"  ✖ {st.Message}\n");
}

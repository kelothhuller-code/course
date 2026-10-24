# C# / .NET licence client

`WideTech.Licensing` targets `netstandard2.0` (.NET Framework 4.7.2+, WinForms/WPF) and `net8.0`.
Ed25519 verification uses `BouncyCastle.Cryptography` (NuGet), because .NET has no built-in Ed25519.

```csharp
using WideTech.Licensing;

var lic = new LicenseClient(new LicenseOptions {
    ApiBase = "https://widetech.in/api/license/v1",
    AppId = "billing-desk",              // Admin → Software → App ID
    PublicKey = "BASE64_PUBLIC_KEY",     // from `npm run license:keypair` (safe to embed)
    AppVersion = "1.0.0",
    // OfflineGraceHours = 48,           // optional; default 0 = strict online
});

var state = await lic.CheckAsync();      // every launch
if (!state.Allowed) {
    // show your lock form with state.Message / state.BuyUrl, then:
    state = await lic.ActivateAsync(keyFromUser);
}
```

`await lic.DeactivateAsync()` frees this computer's slot.

The device id comes from:
- Windows: MachineGuid
- macOS: IOPlatformUUID
- Linux: /etc/machine-id

Demo (console lock screen):

```bash
dotnet build DemoApp
WT_API=http://localhost:5001/api/license/v1 WT_APP_ID=your-app-id WT_PUBLIC_KEY=... dotnet run --project DemoApp
```

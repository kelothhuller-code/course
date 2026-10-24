# WideTech licence clients

Drop-in licence checks for desktop apps sold on widetech.in. Full guide: [docs/LICENSING.md](../docs/LICENSING.md).

| Folder | Language | Demo lock screen |
| --- | --- | --- |
| [python](python/README.md) | Python 3.8+ | `demo_app.py` |
| [node](node/README.md) | Node 18+ / Electron main process | `demo.js` |
| [csharp](csharp/README.md) | .NET (netstandard2.0 / net8.0), WinForms / WPF | `DemoApp` |

Every client:
- Calls `/api/license/v1` on every launch:
  - `validate` when a key is saved
  - `trial` otherwise
  - `activate` when the user types a key
- Verifies the Ed25519 signature with the **public key embedded in your app**, and checks that the
  answer contains the same random nonce, device id and app id it sent.
- Uses a stable device id (OS machine id hashed with the app id), so reinstalling does not reset a trial.
- Is **strict online by default**. Optional `offlineGraceHours` lets the app run on the last signed
  answer for a while. Moving the clock back disables that grace.
- Stores state in `~/.widetech/<appId>/license.json`.

Embed the **public** key only. The private key and `LICENSE_KEY_SECRET` stay on the server.

`e2e_driver.*` files are used by the backend's licensing end-to-end test (`backend/tests/e2e/licensing.e2e.mjs`).

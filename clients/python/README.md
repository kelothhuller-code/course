# Python licence client

```bash
pip install -r requirements.txt     # just "cryptography"
```

Copy `widetech_license.py` into your project:

```python
from widetech_license import LicenseClient

lic = LicenseClient(
    api_base="https://widetech.in/api/license/v1",
    app_id="billing-desk",               # Admin → Software → App ID
    public_key="BASE64_PUBLIC_KEY",      # from `npm run license:keypair` (safe to embed)
    app_version="1.0.0",
    # offline_grace_hours=48,            # optional; default 0 = strict online
)

state = lic.check()                      # every launch
if not state["allowed"]:
    show_lock_screen(state["message"], state.get("buyUrl"))
    # when the user enters a key:
    state = lic.activate(key)
```

`state` has these fields:
- `allowed`
- `status`: active / trial / expired / revoked / invalid / device_limit / offline / clock_tampered
- `message`, `plan`, `expiresAt`, `daysLeft` and `buyUrl`

`lic.deactivate()` frees this computer's slot.

Demo:

```bash
WT_API=http://localhost:5001/api/license/v1 WT_APP_ID=your-app-id WT_PUBLIC_KEY=... python demo_app.py
python demo_app.py --key WT-XXXXX-XXXXX-XXXXX-XXXXX
```

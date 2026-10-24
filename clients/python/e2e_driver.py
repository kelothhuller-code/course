"""Used by backend/tests/e2e/licensing.e2e.mjs — prints the licence state as JSON.
    python e2e_driver.py check | activate <key> | deactivate
"""
import json
import os
import sys

from widetech_license import LicenseClient

lic = LicenseClient(api_base=os.environ["WT_API"], app_id=os.environ["WT_APP_ID"],
                    public_key=os.environ["WT_PUBLIC_KEY"], storage_dir=os.environ["WT_STORAGE_DIR"],
                    device_id=os.environ.get("WT_DEVICE_ID"), app_version="e2e")
cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
if cmd == "activate":
    out = lic.activate(sys.argv[2])
elif cmd == "deactivate":
    out = lic.deactivate()
else:
    out = lic.check()
print(json.dumps(out))

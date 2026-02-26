"""
Fix hardcoded Ohio/client-specific values in base-cold-email templates.
Run from repo root: python3 scripts/fix-template-hardcodes.py
"""
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'base-cold-email')


def fix_file(fname, replacements):
    path = os.path.join(BASE, fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        count = content.count(old)
        content = content.replace(old, new)
        if count:
            print(f"  [{fname}] {count}x  '{old[:60]}...' → '{new[:60]}...'")
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ {fname} saved\n")
    else:
        print(f"  ⚠️  {fname} unchanged\n")


# ── Email 1.json ──────────────────────────────────────────────────────────────
fix_file("Email 1.json", [
    ("const campaign = 'Ohio'",  "const campaign = 'YOUR_CAMPAIGN_NAME'"),
    ('\\\'campaign\\\': \\\'Ohio\\\'', '\\\'campaign\\\': \\\'YOUR_CAMPAIGN_NAME\\\''),
    ('\\"campaign\\": \\"Ohio\\"', '\\"campaign\\": \\"YOUR_CAMPAIGN_NAME\\"'),
])

# ── Email 2.json ──────────────────────────────────────────────────────────────
fix_file("Email 2.json", [
    ("const campaign = 'Ohio'",  "const campaign = 'YOUR_CAMPAIGN_NAME'"),
    ('\\"campaign\\": \\"Ohio\\"', '\\"campaign\\": \\"YOUR_CAMPAIGN_NAME\\"'),
])

# ── Email 3.json ──────────────────────────────────────────────────────────────
fix_file("Email 3.json", [
    ("const campaign = 'Ohio'",  "const campaign = 'YOUR_CAMPAIGN_NAME'"),
    ('\\"campaign\\": \\"Ohio\\"', '\\"campaign\\": \\"YOUR_CAMPAIGN_NAME\\"'),
])

# ── Opt-Out.json ──────────────────────────────────────────────────────────────
# The value appears inside an escaped JSON string, so we need the raw-escape form
fix_file("Opt-Out.json", [
    ('"campaign": "Ohio"',                      '"campaign": "YOUR_CAMPAIGN_NAME"'),
    ('\\"campaign\\": \\"Ohio\\"',              '\\"campaign\\": \\"YOUR_CAMPAIGN_NAME\\"'),
])

# ── Email 1-SMTP.json ─────────────────────────────────────────────────────────
fix_file("Email 1-SMTP.json", [
    ("'http://stewpidprice.com:3000'",
     "'YOUR_DASHBOARD_URL'"),
    ("'https://n8n-deployment-hlnal.ondigitalocean.app/webhook/Unsubscribe'",
     "'YOUR_N8N_INSTANCE_URL/webhook/Unsubscribe'"),
    ("const campaign = 'Ohio'",  "const campaign = 'YOUR_CAMPAIGN_NAME'"),
    ('\\"campaign\\": \\"Ohio\\"', '\\"campaign\\": \\"YOUR_CAMPAIGN_NAME\\"'),
])

# ── Email 3-SMTP.json ─────────────────────────────────────────────────────────
fix_file("Email 3-SMTP.json", [
    ("'http://nicktailor.com:3000'",
     "'YOUR_DASHBOARD_URL'"),
    ("'https://dev.iluvicandy.com/webhook/Unsubscribe'",
     "'YOUR_N8N_INSTANCE_URL/webhook/Unsubscribe'"),
    ("const campaign = 'LeadsDBD-b2b'", "const campaign = 'YOUR_CAMPAIGN_NAME'"),
    ("const campaign = 'Ohio'",          "const campaign = 'YOUR_CAMPAIGN_NAME'"),
    ('\\"campaign\\": \\"Ohio\\"', '\\"campaign\\": \\"YOUR_CAMPAIGN_NAME\\"'),
])

print("All template fixes complete.")

#!/usr/bin/env python3
"""Audit base-cold-email templates for hardcoded values."""
import json, os, sys

basedir = os.path.join(os.path.dirname(__file__), '..', 'base-cold-email')

print("=== HARDCODED CREDENTIAL IDs (non-UUID-placeholder) ===")
for f in sorted(os.listdir(basedir)):
    if not f.endswith('.json'):
        continue
    with open(os.path.join(basedir, f)) as fp:
        d = json.load(fp)
    for n in d.get('nodes', []):
        creds = n.get('credentials', {})
        for k, v in creds.items():
            if isinstance(v, dict) and v.get('id'):
                cid = v['id']
                if not str(cid).startswith('YOUR_'):
                    print(f"  {f} | {n['name']} | {k} => id={cid}")

print("\n=== ALL YOUR_* OCCURRENCES IN NODE PARAMETERS ===")
seen = set()
for f in sorted(os.listdir(basedir)):
    if not f.endswith('.json'):
        continue
    raw = open(os.path.join(basedir, f)).read()
    import re
    placeholders = set(re.findall(r'YOUR_[A-Z_]+', raw))
    for p in sorted(placeholders):
        if p not in seen:
            seen.add(p)
            print(f"  {p}")

print("\n=== YOUR_NAME@gmail.com check ===")
for f in sorted(os.listdir(basedir)):
    if not f.endswith('.json'):
        continue
    raw = open(os.path.join(basedir, f)).read()
    if 'YOUR_NAME@' in raw:
        print(f"  FOUND in {f}")
        # find relevant lines
        for i, line in enumerate(raw.split('\n')):
            if 'YOUR_NAME@' in line:
                print(f"    line {i+1}: {line.strip()[:120]}")

print("\n=== CALENDLY_LINK check ===")
for f in sorted(os.listdir(basedir)):
    if not f.endswith('.json'):
        continue
    raw = open(os.path.join(basedir, f)).read()
    import re
    hits = [m.group() for m in re.finditer(r'YOUR_CALENDLY[^"]*', raw)]
    if hits:
        print(f"  {f}: {set(hits)}")

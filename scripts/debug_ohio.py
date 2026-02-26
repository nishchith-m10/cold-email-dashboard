#!/usr/bin/env python3
"""Debug Ohio patterns in template files."""
import os, re

BASE = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter/base-cold-email'

path = os.path.join(BASE, 'Email 1.json')
with open(path) as f:
    content = f.read()

for m in re.finditer(r'campaign.*?Ohio', content):
    start = max(0, m.start()-10)
    end = min(len(content), m.end()+10)
    snippet = content[start:end]
    print('FOUND:', ascii(snippet))
    print()

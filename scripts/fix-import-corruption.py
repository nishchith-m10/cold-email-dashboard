#!/usr/bin/env python3
"""
Fix: the previous script inserted 'import { isSuperAdmin }...' immediately after
'import {' opening lines of multi-line import blocks, creating invalid syntax.

Strategy:
  1. Find lines that match:  import {\nimport { isSuperAdmin } from '@/lib/workspace-access';\n
  2. Remove the misplaced line from inside the block
  3. Insert it as a proper standalone import AFTER the closing '} from ...' of that block
     (or after the last import statement if workspace-access is already imported)
"""
import os, re

ROOT = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter'
ADMIN_API = os.path.join(ROOT, 'app', 'api', 'admin')

MISPLACED = "import { isSuperAdmin } from '@/lib/workspace-access';"

def fix_file(path):
    with open(path, encoding='utf-8') as f:
        content = f.read()

    if MISPLACED not in content:
        return False

    lines = content.split('\n')
    new_lines = []
    i = 0
    changed = False
    insert_after = -1   # index in new_lines after which to insert the standalone import

    while i < len(lines):
        line = lines[i]

        # Detect: open brace import on previous line and misplaced import on this line
        if (line.strip() == MISPLACED and
                new_lines and new_lines[-1].strip() == 'import {'):
            # Skip this misplaced line; we'll insert it after the block closes
            changed = True
            i += 1
            continue

        new_lines.append(line)

        # Track where to insert the import: after the multi-line block that had the issue
        # Track by finding '} from' that closes an import block
        if line.startswith('} from ') or (line.strip().startswith("} from '") and line.strip().endswith("';")):
            insert_after = len(new_lines) - 1

        i += 1

    if not changed:
        return False

    # Check if the import is already present somewhere in the (now-cleaned) file
    full = '\n'.join(new_lines)
    if MISPLACED in full:
        # Already present from a prior pass, nothing to insert
        pass
    else:
        # Insert after the closing '} from ...' line of the import block
        if insert_after >= 0:
            new_lines.insert(insert_after + 1, MISPLACED)
        else:
            # Fallback: insert after last import statement
            last_import = 0
            for idx, ln in enumerate(new_lines):
                if ln.startswith('import ') and not ln.startswith('import {'):
                    last_import = idx
            new_lines.insert(last_import + 1, MISPLACED)

    result = '\n'.join(new_lines)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(result)

    rel = os.path.relpath(path, ROOT)
    print(f'  FIXED  {rel}')
    return True


fixed = 0
for dirpath, _, files in os.walk(ADMIN_API):
    for fname in sorted(files):
        if fname.endswith('.ts') or fname.endswith('.tsx'):
            if fix_file(os.path.join(dirpath, fname)):
                fixed += 1

print(f'\nTotal: {fixed} file(s) fixed')

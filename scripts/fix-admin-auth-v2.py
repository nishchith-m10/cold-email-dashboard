#!/usr/bin/env python3
"""
Two-pass cleanup script for admin API routes:
Pass 1: Remove orphaned .split/.filter/.map lines left by the first partial run.
Pass 2: Fix remaining local SUPER_ADMIN_IDS parsers + ensure import + replace usages.
"""
import os
import re

ROOT = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter'
ADMIN_API = os.path.join(ROOT, 'app', 'api', 'admin')

ALREADY_CORRECT = {
    os.path.join(ROOT, 'app/api/admin/all-workspaces/route.ts'),
    os.path.join(ROOT, 'app/api/admin/audit-log/route.ts'),
    os.path.join(ROOT, 'app/api/admin/llm-usage/route.ts'),
}

# Remove orphaned chained lines like "  .split(',')" and "  .filter(Boolean);"
# that appear as standalone statements (i.e., not part of a larger expression)
ORPHAN_LINES = re.compile(
    r'^[ \t]*\.split\(',
    re.MULTILINE,
)

# Full multi-line pattern: const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS ...
# possibly with .split, .map, .filter chained on subsequent indented lines
LOCAL_DECL = re.compile(
    r'^const SUPER_ADMIN_IDS = \(process\.env\.SUPER_ADMIN_IDS(?:[^;]+)?;[ \t]*$',
    re.MULTILINE | re.DOTALL,
)

# Simpler: match the whole block greedily
LOCAL_DECL2 = re.compile(
    r'const SUPER_ADMIN_IDS = \(process\.env\.SUPER_ADMIN_IDS.*?\);',
    re.DOTALL,
)

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changed = False

    # Step 1: Remove orphaned .split/.filter/.map lines that start with whitespace+dot
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        # An orphan line is a line that is ONLY a chained method call with no LHS
        if (stripped.startswith('.split(') or stripped.startswith('.filter(') or
                stripped.startswith('.map(')) and not ('=' in line or 'const ' in line):
            # Skip this orphan line
            changed = True
            i += 1
            continue
        new_lines.append(line)
        i += 1
    content = '\n'.join(new_lines)

    # Step 2: Remove any remaining full local SUPER_ADMIN_IDS declarations
    new_content = LOCAL_DECL2.sub('', content)
    if new_content != content:
        content = new_content
        changed = True

    # Step 3: Remove leftover superAdminIds (webhook-dlq)
    content2 = re.sub(
        r"const superAdminIds = process\.env\.SUPER_ADMIN_IDS\?\.split\(','\) \|\| \[\];",
        '', content
    )
    if content2 != content:
        content = content2
        content = content.replace('!superAdminIds.includes(userId)', '!isSuperAdmin(userId)')
        content = content.replace('superAdminIds.includes(userId)', 'isSuperAdmin(userId)')
        changed = True

    # Step 4: Replace usages
    for old, new in [
        ('!SUPER_ADMIN_IDS.includes(userId)', '!isSuperAdmin(userId)'),
        ('SUPER_ADMIN_IDS.includes(userId)', 'isSuperAdmin(userId)'),
    ]:
        if old in content:
            content = content.replace(old, new)
            changed = True

    # Step 5: Add import if now using isSuperAdmin but not imported
    uses_fn = 'isSuperAdmin(' in content
    has_import = "isSuperAdmin } from '@/lib/workspace-access'" in content or \
                 "{ isSuperAdmin," in content or \
                 "isSuperAdmin," in content.split("from '@/lib/workspace-access'")[0] if "from '@/lib/workspace-access'" in content else False

    if uses_fn and not has_import:
        if "from '@/lib/workspace-access'" in content:
            content = re.sub(
                r"import \{([^}]+)\} from '@/lib/workspace-access'",
                lambda m: "import { isSuperAdmin," + m.group(1).strip() + " } from '@/lib/workspace-access'",
                content, count=1,
            )
        else:
            lines2 = content.split('\n')
            last_import = 0
            for idx, ln in enumerate(lines2):
                if ln.startswith('import '):
                    last_import = idx
            lines2.insert(last_import + 1, "import { isSuperAdmin } from '@/lib/workspace-access';")
            content = '\n'.join(lines2)
        changed = True

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        rel = os.path.relpath(filepath, ROOT)
        print(f'  FIXED  {rel}')
        return True
    return False


def main():
    fixed = 0
    for dirpath, _, files in os.walk(ADMIN_API):
        for fname in sorted(files):
            if not (fname.endswith('.ts') or fname.endswith('.tsx')):
                continue
            fpath = os.path.join(dirpath, fname)
            if fpath in ALREADY_CORRECT:
                rel = os.path.relpath(fpath, ROOT)
                print(f'  SKIP   {rel}')
                continue
            if clean_file(fpath):
                fixed += 1

    print(f'\nTotal fixed: {fixed}')

if __name__ == '__main__':
    main()

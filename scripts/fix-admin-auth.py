#!/usr/bin/env python3
"""
Fix all admin API routes to use the shared isSuperAdmin() from lib/workspace-access
instead of inconsistent local SUPER_ADMIN_IDS parsers (some without .trim(), some
doing string.includes() instead of array.includes()).
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADMIN_API = os.path.join(ROOT, 'app', 'api', 'admin')

# Files that already correctly import isSuperAdmin – skip reprocessing
ALREADY_CORRECT = {
    os.path.join(ROOT, 'app/api/admin/all-workspaces/route.ts'),
    os.path.join(ROOT, 'app/api/admin/audit-log/route.ts'),
    os.path.join(ROOT, 'app/api/admin/llm-usage/route.ts'),
}

# ── Patterns to remove (local SUPER_ADMIN_IDS declarations) ──────────────────

# No split: const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '')
P_NO_SPLIT = re.compile(
    r"const SUPER_ADMIN_IDS = \(process\.env\.SUPER_ADMIN_IDS \|\| ''\)\s*\n",
    re.MULTILINE,
)

# With split, various endings
P_WITH_SPLIT = re.compile(
    r"const SUPER_ADMIN_IDS = \(process\.env\.SUPER_ADMIN_IDS.*?\)"
    r"(?:\.split\(','\)(?:\.map\(id => id\.trim\(\)\))?(?:\.filter\(Boolean\))?)?;[ \t]*\n",
    re.MULTILINE | re.DOTALL,
)

# Fallback to NEXT_PUBLIC
P_WITH_FALLBACK = re.compile(
    r"const SUPER_ADMIN_IDS = \(process\.env\.SUPER_ADMIN_IDS \|\|"
    r" process\.env\.NEXT_PUBLIC_SUPER_ADMIN_IDS \|\| ''\).*?;[ \t]*\n",
    re.MULTILINE | re.DOTALL,
)

# webhook-dlq inline style (different variable name)
P_WEBHOOK = re.compile(
    r"const superAdminIds = process\.env\.SUPER_ADMIN_IDS\?\.split\(','\) \|\| \[\];[ \t]*\n",
    re.MULTILINE,
)


def add_import_if_needed(content: str) -> str:
    """Insert/extend the isSuperAdmin import from @/lib/workspace-access."""
    # If already present, nothing to do
    if re.search(r"isSuperAdmin\s*[,}].*from '@/lib/workspace-access'", content):
        return content
    if re.search(r"from '@/lib/workspace-access'.*isSuperAdmin", content):
        return content

    if "from '@/lib/workspace-access'" in content:
        # Extend existing import to add isSuperAdmin
        content = re.sub(
            r"import \{([^}]+)\} from '@/lib/workspace-access'",
            lambda m: "import { isSuperAdmin," + m.group(1) + " } from '@/lib/workspace-access'",
            content,
            count=1,
        )
    else:
        # Find last import line and insert after it
        lines = content.split('\n')
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
        lines.insert(last_import_idx + 1, "import { isSuperAdmin } from '@/lib/workspace-access';")
        content = '\n'.join(lines)

    return content


def fix_file(filepath: str) -> bool:
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()

    content = original
    changed = False

    # Remove local declarations
    for pattern in [P_NO_SPLIT, P_WITH_SPLIT, P_WITH_FALLBACK]:
        new = pattern.sub('', content)
        if new != content:
            content = new
            changed = True

    if P_WEBHOOK.search(content):
        content = P_WEBHOOK.sub('', content)
        content = content.replace('!superAdminIds.includes(userId)', '!isSuperAdmin(userId)')
        content = content.replace('superAdminIds.includes(userId)', 'isSuperAdmin(userId)')
        changed = True

    # Replace usages with function call
    for old, new in [
        ('!SUPER_ADMIN_IDS.includes(userId)', '!isSuperAdmin(userId)'),
        ('SUPER_ADMIN_IDS.includes(userId)', 'isSuperAdmin(userId)'),
    ]:
        if old in content:
            content = content.replace(old, new)
            changed = True

    if changed:
        content = add_import_if_needed(content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        rel = os.path.relpath(filepath, ROOT)
        print(f"  ✅  {rel}")
        return True

    return False


def main():
    fixed = 0
    skipped = 0

    for dirpath, _, filenames in os.walk(ADMIN_API):
        for fname in sorted(filenames):
            if not (fname.endswith('.ts') or fname.endswith('.tsx')):
                continue
            fpath = os.path.join(dirpath, fname)
            if fpath in ALREADY_CORRECT:
                rel = os.path.relpath(fpath, ROOT)
                print(f"  ⏭️   {rel}  (already correct)")
                skipped += 1
                continue
            if fix_file(fpath):
                fixed += 1

    print(f"\n{'─'*60}")
    print(f"Fixed {fixed} file(s), skipped {skipped} (already correct).")
    print(f"{'─'*60}")


if __name__ == '__main__':
    main()

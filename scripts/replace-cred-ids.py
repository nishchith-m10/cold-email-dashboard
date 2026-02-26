#!/usr/bin/env python3
"""
Replace hardcoded Ohio n8n credential IDs with YOUR_CREDENTIAL_* placeholders.
Applies to both base-cold-email/ and cold-email-system/ directories.
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(BASE_DIR, '..')

# Mapping of hardcoded Ohio credential IDs → standardised placeholder
# Grouped by credential type so all IDs of the same type map to the same placeholder.
CREDENTIAL_ID_MAP = {
    # gmailOAuth2 — all Gmail credentials collapse to one placeholder
    'kThf5Npwf1zJFn9l': 'YOUR_CREDENTIAL_GMAIL_ID',
    'tUD6GQ7CnHfvUM7k': 'YOUR_CREDENTIAL_GMAIL_ID',
    'zfHBUnz62UkbN9cm': 'YOUR_CREDENTIAL_GMAIL_ID',

    # postgres
    'QKb5WqKXZ29v15Qk': 'YOUR_CREDENTIAL_POSTGRES_ID',

    # googleSheetsOAuth2Api — both sheet creds collapse to one
    '2EUpgH0WFkM3Lr6E': 'YOUR_CREDENTIAL_GOOGLE_SHEETS_ID',
    'p8ESE0UMGdJsRvZv': 'YOUR_CREDENTIAL_GOOGLE_SHEETS_ID',

    # openAiApi
    'EzDErZcUtMKUzyRO': 'YOUR_CREDENTIAL_OPENAI_ID',

    # anthropicApi
    'aoWKHXiRqhK3nMDW': 'YOUR_CREDENTIAL_ANTHROPIC_ID',

    # httpQueryAuth (Google CSE — both variants)
    '9z6Laho4Xwr3N9sS': 'YOUR_CREDENTIAL_GOOGLE_CSE_QUERY_ID',
    '6DunH8n5TZY3tjwT': 'YOUR_CREDENTIAL_GOOGLE_CSE_QUERY_ID',

    # httpHeaderAuth (Google CSE alternate)
    'uNNf74d1EVpcGBgo': 'YOUR_CREDENTIAL_GOOGLE_CSE_HEADER_ID',
}

TEMPLATE_DIRS = [
    os.path.join(PROJECT_ROOT, 'base-cold-email'),
    os.path.join(PROJECT_ROOT, 'cold-email-system'),
]

total_replacements = 0

for template_dir in TEMPLATE_DIRS:
    if not os.path.isdir(template_dir):
        print(f'  SKIP (not found): {template_dir}')
        continue

    for filename in sorted(os.listdir(template_dir)):
        if not filename.endswith('.json'):
            continue

        filepath = os.path.join(template_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        file_replacements = 0

        for old_id, placeholder in CREDENTIAL_ID_MAP.items():
            count = content.count(old_id)
            if count:
                content = content.replace(old_id, placeholder)
                file_replacements += count
                print(f'  [{os.path.basename(template_dir)}] {filename}: {old_id} → {placeholder} ({count}x)')

        if file_replacements:
            # Validate JSON is still valid after replacements
            try:
                json.loads(content)
            except json.JSONDecodeError as e:
                print(f'  ERROR: JSON invalid after replacement in {filename}: {e}')
                continue

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            total_replacements += file_replacements

print(f'\n✅ Total replacements: {total_replacements}')
print('✅ All files validated as valid JSON')

#!/usr/bin/env python3
"""Strip typed code blocks from THE_SOVEREIGN_CODEX.md while preserving ASCII art."""

import sys

INPUT = "docs/THE_SOVEREIGN_CODEX.md"

with open(INPUT, "r") as f:
    lines = f.readlines()

result = []
in_code_block = False
skip_block = False
code_buffer = []
remove_langs = {"typescript", "sql", "bash", "json", "env", "javascript", "tsx", "ts", "js", "sh"}

for line in lines:
    stripped = line.strip()

    if not in_code_block and stripped.startswith("```"):
        lang = stripped[3:].strip().lower()
        in_code_block = True
        skip_block = lang in remove_langs
        code_buffer = [line]
        continue

    if in_code_block and stripped == "```":
        code_buffer.append(line)
        if not skip_block:
            result.extend(code_buffer)
        in_code_block = False
        skip_block = False
        code_buffer = []
        continue

    if in_code_block:
        code_buffer.append(line)
        continue

    result.append(line)

with open(INPUT, "w") as f:
    f.writelines(result)

print(f"Original: {len(lines)} lines")
print(f"Result:   {len(result)} lines")
print(f"Removed:  {len(lines) - len(result)} lines")

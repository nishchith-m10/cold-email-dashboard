#!/usr/bin/env python3
"""
Fix circular type references in database.types.ts

The problem: The file uses self-referential types like:
  Insert: Omit<Database['public']['Tables']['campaigns']['Row'], ...>
  Update: Partial<Database['public']['Tables']['campaigns']['Insert']>

This causes TypeScript to resolve types as 'never' in some contexts.

The solution: Replace circular references with flat, explicit type definitions.
"""

import re
import sys

def parse_row_fields(content, table_name):
    """Extract Row fields for a specific table."""
    # Find the Row block for this table
    pattern = rf"{table_name}: \{{\s*Row: \{{([^}}]+)\}}"
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return {}
    
    row_content = match.group(1)
    fields = {}
    
    # Parse each field: name: type
    field_pattern = r'(\w+):\s*([^;\n]+)'
    for field_match in re.finditer(field_pattern, row_content):
        field_name = field_match.group(1).strip()
        field_type = field_match.group(2).strip()
        fields[field_name] = field_type
    
    return fields

def generate_insert_type(fields, omit_fields):
    """Generate Insert type from Row fields."""
    lines = []
    for name, type_str in fields.items():
        if name in omit_fields:
            # Make omitted fields optional
            lines.append(f"          {name}?: {type_str}")
        else:
            # Check if field allows null - if so, make optional
            if 'null' in type_str.lower():
                lines.append(f"          {name}?: {type_str}")
            else:
                lines.append(f"          {name}: {type_str}")
    return "{\n" + "\n".join(lines) + "\n        }"

def generate_update_type(fields):
    """Generate Update type - all fields optional."""
    lines = []
    for name, type_str in fields.items():
        lines.append(f"          {name}?: {type_str}")
    return "{\n" + "\n".join(lines) + "\n        }"

def main():
    with open('lib/database.types.ts', 'r') as f:
        content = f.read()
    
    # Find all tables with circular Insert types
    insert_pattern = r"Insert: Omit<Database\['public'\]\['Tables'\]\['(\w+)'\]\['Row'\], '([^']+)'(?: \| '[^']+')*> & \{"
    
    tables_to_fix = set()
    for match in re.finditer(insert_pattern, content):
        tables_to_fix.add(match.group(1))
    
    print(f"Found {len(tables_to_fix)} tables with circular types to fix")
    print(f"Tables: {sorted(tables_to_fix)}")
    
    # For each table, generate the fix
    # This is complex because we need to replace multi-line blocks
    # For now, just output what needs to be done
    
    for table in sorted(tables_to_fix):
        fields = parse_row_fields(content, table)
        if fields:
            print(f"\n{table}: {len(fields)} fields")
            for name, typ in list(fields.items())[:3]:
                print(f"  {name}: {typ}")

if __name__ == '__main__':
    main()

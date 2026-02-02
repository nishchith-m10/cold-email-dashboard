#!/usr/bin/env python3
"""
Convert circular type references in database.types.ts to flat explicit types.

This is the PROPER fix - converts the problematic self-referential types to 
the same format that Supabase CLI generates.

BEFORE (problematic):
  campaigns: {
    Row: { id: string; name: string; ... }
    Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at'> & { id?: string; ... }
    Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
  }

AFTER (correct - matches Supabase CLI output):
  campaigns: {
    Row: { id: string; name: string; ... }
    Insert: { id?: string; name: string; ... }
    Update: { id?: string; name?: string; ... }
  }
"""

import re
import sys

def main():
    with open('lib/database.types.ts', 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Step 1: Find all table definitions and their Row fields
    # Pattern: tablename: { Row: { fields } Insert: ... Update: ... }
    
    # First, let's find each table block and process it
    # We need to be careful with nested braces
    
    tables_fixed = 0
    
    # Find pattern: Insert: Omit<Database['public']['Tables']['XXX']['Row'], 'field1' | 'field2' | ...> & { optional_fields }
    # Also handle 'genesis' schema
    insert_pattern = re.compile(
        r"Insert: Omit<Database\['(public|genesis)'\]\['Tables'\]\['(\w+)'\]\['Row'\], ([^>]+)> & \{\s*([^}]*)\}",
        re.DOTALL
    )
    
    # Find pattern: Update: Partial<Database['public']['Tables']['XXX']['Insert']>
    # Also handle 'genesis' schema
    update_pattern = re.compile(
        r"Update: Partial<Database\['(public|genesis)'\]\['Tables'\]\['(\w+)'\]\['Insert'\]>"
    )
    
    # For each table, we need to:
    # 1. Parse the Row fields
    # 2. Generate explicit Insert type (some fields optional, some required)
    # 3. Generate explicit Update type (all fields optional)
    
    # First pass: collect all Row definitions
    row_pattern = re.compile(
        r"(\w+): \{\s*Row: \{([^}]+)\}\s*Insert:",
        re.DOTALL
    )
    
    row_fields = {}
    for match in row_pattern.finditer(content):
        table_name = match.group(1)
        fields_str = match.group(2)
        
        # Parse fields
        fields = {}
        # Match: field_name: type (with possible semicolons or no semicolons)
        field_pattern = re.compile(r'(\w+):\s*([^\n;]+)')
        for field_match in field_pattern.finditer(fields_str):
            name = field_match.group(1).strip()
            typ = field_match.group(2).strip()
            # Clean up type (remove trailing whitespace, semicolons)
            typ = typ.rstrip(';').strip()
            if name and typ:
                fields[name] = typ
        
        row_fields[table_name] = fields
        print(f"Parsed {table_name}: {len(fields)} fields")
    
    print(f"\nParsed {len(row_fields)} tables")
    
    # Now replace each circular Insert with explicit fields
    def replace_insert(match):
        schema_name = match.group(1)  # 'public' or 'genesis'
        table_name = match.group(2)
        omit_fields_str = match.group(3)
        optional_fields_str = match.group(4)
        
        # Parse omit fields: 'id' | 'created_at' | 'updated_at'
        omit_fields = set(re.findall(r"'(\w+)'", omit_fields_str))
        
        # Parse optional override fields from the & { ... } part
        optional_overrides = {}
        if optional_fields_str.strip():
            for line in optional_fields_str.strip().split('\n'):
                line = line.strip()
                if ':' in line:
                    parts = line.split(':', 1)
                    field_name = parts[0].strip().rstrip('?')
                    field_type = parts[1].strip().rstrip(';').rstrip(',')
                    optional_overrides[field_name] = field_type
        
        # Get Row fields for this table
        if table_name not in row_fields:
            print(f"  WARNING: No Row fields found for {table_name}")
            return match.group(0)  # Keep original
        
        fields = row_fields[table_name]
        
        # Generate Insert type
        insert_lines = []
        for name, typ in fields.items():
            if name in omit_fields:
                # Omitted fields become optional
                insert_lines.append(f"          {name}?: {typ}")
            elif name in optional_overrides:
                # Use override type
                insert_lines.append(f"          {name}?: {optional_overrides[name]}")
            elif 'null' in typ.lower():
                # Nullable fields are optional
                insert_lines.append(f"          {name}?: {typ}")
            else:
                # Required field
                insert_lines.append(f"          {name}: {typ}")
        
        result = "Insert: {\n" + "\n".join(insert_lines) + "\n        }"
        print(f"  Fixed Insert for {table_name}")
        return result
    
    content = insert_pattern.sub(replace_insert, content)
    
    # Now replace each circular Update with explicit fields (all optional)
    def replace_update(match):
        schema_name = match.group(1)  # 'public' or 'genesis'
        table_name = match.group(2)
        
        if table_name not in row_fields:
            print(f"  WARNING: No Row fields found for {table_name}")
            return match.group(0)  # Keep original
        
        fields = row_fields[table_name]
        
        # Generate Update type - all fields optional
        update_lines = []
        for name, typ in fields.items():
            update_lines.append(f"          {name}?: {typ}")
        
        result = "Update: {\n" + "\n".join(update_lines) + "\n        }"
        print(f"  Fixed Update for {table_name}")
        return result
    
    content = update_pattern.sub(replace_update, content)
    
    # Step 3: Add Relationships: [] to every table that's missing it
    # Pattern: find "Update: { ... }" followed by closing "}" of table
    # We need to add "Relationships: []" after each Update block
    
    # Find tables missing Relationships and add it
    # Pattern: Update block followed by table close, without Relationships
    relationships_pattern = re.compile(
        r"(Update: \{[^}]+\})\n(\s*\})\n(\s*)(\w+):",
        re.DOTALL
    )
    
    def add_relationships(match):
        update_block = match.group(1)
        close_brace = match.group(2)
        indent = match.group(3)
        next_table = match.group(4)
        return f"{update_block}\n        Relationships: []\n{close_brace}\n{indent}{next_table}:"
    
    # Apply multiple times since it matches consecutively
    prev_content = ""
    while prev_content != content:
        prev_content = content
        content = relationships_pattern.sub(add_relationships, content)
    
    # Also handle the last table in each schema (no next table after it)
    # Pattern: Update block followed by closing of Tables block
    last_table_pattern = re.compile(
        r"(Update: \{[^}]+\})\n(\s*\})\n(\s*\})\n(\s*)(Functions:|Views:)",
        re.DOTALL
    )
    
    def add_relationships_last(match):
        update_block = match.group(1)
        table_close = match.group(2)
        tables_close = match.group(3)
        indent = match.group(4)
        next_section = match.group(5)
        return f"{update_block}\n        Relationships: []\n{table_close}\n{tables_close}\n{indent}{next_section}"
    
    content = last_table_pattern.sub(add_relationships_last, content)
    
    print(f"  Added Relationships: [] to all tables")
    
    # Write the result
    if content != original_content:
        with open('lib/database.types.ts', 'w') as f:
            f.write(content)
        print(f"\n✅ Successfully converted database.types.ts")
        print("All circular type references have been replaced with flat explicit types.")
    else:
        print("\n⚠️ No changes made - file may already be fixed or pattern not matched")

if __name__ == '__main__':
    main()

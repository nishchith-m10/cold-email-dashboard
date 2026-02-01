/**
 * Generate TypeScript types directly from PostgreSQL
 * Uses pg library to introspect schema and generate types
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DB_URL = 'postgresql://postgres:Ilovebadminton1!@db.vfdmdqqtuxbkkxhcwris.supabase.co:5432/postgres';

async function generateTypes() {
  const client = new Client({
    connectionString: DB_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get all tables from public and genesis schemas
    const tablesQuery = `
      SELECT 
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema IN ('public', 'genesis')
      ORDER BY table_schema, table_name, ordinal_position;
    `;

    const { rows: columns } = await client.query(tablesQuery);

    // Get all functions
    const functionsQuery = `
      SELECT 
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname IN ('public', 'genesis')
      ORDER BY n.nspname, p.proname;
    `;

    const { rows: functions } = await client.query(functionsQuery);

    // Group columns by table
    const tables: Record<string, Record<string, any[]>> = {};
    columns.forEach((col: any) => {
      const key = `${col.table_schema}.${col.table_name}`;
      if (!tables[key]) {
        tables[key] = {};
      }
      if (!tables[key][col.table_schema]) {
        tables[key][col.table_schema] = [];
      }
      tables[key][col.table_schema].push(col);
    });

    // Generate TypeScript types
    let output = `export type Json =\n  | string\n  | number\n  | boolean\n  | null\n  | { [key: string]: Json | undefined }\n  | Json[]\n\nexport type Database = {\n`;

    // Process schemas
    const schemas = ['public', 'genesis'];
    for (const schema of schemas) {
      output += `  ${schema}: {\n    Tables: {\n`;

      // Get unique table names for this schema
      const schemaTables = new Set<string>();
      columns.forEach((col: any) => {
        if (col.table_schema === schema) {
          schemaTables.add(col.table_name);
        }
      });

      for (const tableName of Array.from(schemaTables).sort()) {
        const tableCols = columns.filter((c: any) => c.table_schema === schema && c.table_name === tableName);
        
        output += `      ${tableName}: {\n        Row: {\n`;
        
        tableCols.forEach((col: any) => {
          const tsType = mapPostgresToTypeScript(col.data_type, col.is_nullable === 'YES');
          const nullable = col.is_nullable === 'YES' ? ' | null' : '';
          output += `          ${col.column_name}: ${tsType}${nullable};\n`;
        });

        output += `        }\n        Insert: Omit<Database['${schema}']['Tables']['${tableName}']['Row'], 'id' | 'created_at' | 'updated_at'> & {\n          id?: string;\n          created_at?: string;\n          updated_at?: string;\n        }\n        Update: Partial<Database['${schema}']['Tables']['${tableName}']['Insert']>\n      }\n`;
      }

      output += `    }\n    Functions: {\n`;

      // Add functions
      const schemaFunctions = functions.filter((f: any) => f.schema_name === schema);
      for (const func of schemaFunctions) {
        output += `      ${func.function_name}: {\n        Args: Record<string, never>;\n        Returns: any;\n      }\n`;
      }

      output += `    }\n    Views: {\n      [_ in never]: never\n    }\n    Enums: {\n      [_ in never]: never\n    }\n    CompositeTypes: {\n      [_ in never]: never\n    }\n  }\n`;
    }

    output += `}\n`;

    // Write to file
    const outputPath = path.join(__dirname, '..', 'lib', 'database.types.ts');
    fs.writeFileSync(outputPath, output);
    console.log(`✅ Types generated: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function mapPostgresToTypeScript(pgType: string, nullable: boolean): string {
  const typeMap: Record<string, string> = {
    'uuid': 'string',
    'text': 'string',
    'varchar': 'string',
    'character varying': 'string',
    'char': 'string',
    'boolean': 'boolean',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'numeric': 'number',
    'decimal': 'number',
    'double precision': 'number',
    'real': 'number',
    'timestamp without time zone': 'string',
    'timestamp with time zone': 'string',
    'date': 'string',
    'time': 'string',
    'json': 'Json',
    'jsonb': 'Json',
    'bytea': 'string',
  };

  return typeMap[pgType.toLowerCase()] || 'string';
}

generateTypes();

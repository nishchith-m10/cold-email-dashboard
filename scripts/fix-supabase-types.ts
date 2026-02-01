/**
 * Fix all routes to use getTypedSupabaseAdmin() instead of supabaseAdmin
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function fixRoutes() {
  const routeFiles = await glob('app/api/**/*.ts', { cwd: __dirname + '/..' });
  
  for (const file of routeFiles) {
    const filePath = path.join(__dirname, '..', file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace import
    if (content.includes("import { supabaseAdmin") && !content.includes("getTypedSupabaseAdmin")) {
      content = content.replace(
        /import \{ ([^}]*supabaseAdmin[^}]*)\} from '@\/lib\/supabase';/g,
        (match, imports) => {
          const newImports = imports
            .split(',')
            .map((imp: string) => imp.trim())
            .filter((imp: string) => imp !== 'supabaseAdmin')
            .concat('getTypedSupabaseAdmin')
            .join(', ');
          return `import { ${newImports} } from '@/lib/supabase';`;
        }
      );
      modified = true;
    }

    // Replace null checks and usage
    if (content.includes('supabaseAdmin')) {
      // Replace null check pattern
      content = content.replace(
        /if \(!supabaseAdmin\) \{[\s\S]*?return NextResponse\.json\([^}]*\}, \{ status: [0-9]+[^}]*\}\);\s*\}/g,
        ''
      );
      
      // Replace all supabaseAdmin with supabase
      content = content.replace(/supabaseAdmin/g, 'supabase');
      
      // Add getTypedSupabaseAdmin() call at the start of the function
      content = content.replace(
        /(export async function (GET|POST|PUT|DELETE|PATCH)\([^)]*\) \{[\s\S]*?)(const supabase = getTypedSupabaseAdmin\(\);)/g,
        '$1$2'
      );
      
      // If supabase is used but not defined, add it
      if (content.includes('await supabase.') && !content.includes('const supabase = getTypedSupabaseAdmin()')) {
        content = content.replace(
          /(export async function (GET|POST|PUT|DELETE|PATCH)\([^)]*\) \{[\s\S]*?)(const|if|return|await)/m,
          (match, funcStart, nextToken) => {
            return funcStart + '  const supabase = getTypedSupabaseAdmin();\n\n  ' + nextToken;
          }
        );
      }
      
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${file}`);
    }
  }
}

fixRoutes().catch(console.error);

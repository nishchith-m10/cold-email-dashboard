/**
 * Clean SMTP workflow templates for Phase 64.B
 * 
 * Removes:
 * - IDs (workflow and node IDs - n8n regenerates these)
 * - Active status (read-only field)
 * - Credentials (Postgres account IDs)
 * - Hardcoded URLs and workspace IDs
 * - Version metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '../base-cold-email');

const WORKFLOWS = [
  'Email 1-SMTP.json',
  'Email 2-SMTP.json',
  'Email 3-SMTP.json',
];

interface N8nWorkflow {
  id?: string;
  name: string;
  active?: boolean;
  nodes: N8nNode[];
  connections: any;
  versionId?: string;
  meta?: any;
  tags?: any[];
  pinData?: any;
  settings?: any;
  staticData?: any;
  [key: string]: any;
}

interface N8nNode {
  id?: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: any;
  typeVersion?: number;
  credentials?: Record<string, { id: string; name: string }>;
  [key: string]: any;
}

function cleanWorkflow(workflow: N8nWorkflow): N8nWorkflow {
  console.log(`\n🧹 Cleaning: ${workflow.name}`);
  
  // Remove top-level metadata
  delete workflow.id;
  delete workflow.active;
  delete workflow.versionId;
  delete workflow.meta;
  delete workflow.tags;
  delete workflow.pinData;
  
  // Clean nodes
  workflow.nodes = workflow.nodes.map(node => {
    // Remove node ID
    delete node.id;
    
    // Remove credentials (these will be injected by Sidecar)
    if (node.credentials) {
      console.log(`  - Removed credentials from node: ${node.name}`);
      delete node.credentials;
    }
    
    // Clean parameters
    if (node.parameters) {
      // Replace hardcoded URLs
      const params = JSON.stringify(node.parameters);
      
      if (params.includes('nicktailor.com') || params.includes('dev.iluvicandy.com')) {
        console.log(`  - Found hardcoded URL in node: ${node.name}`);
        // Replace with placeholder
        node.parameters = JSON.parse(
          params
            .replace(/http:\/\/nicktailor\.com:\d+\/api\//g, '{{ $env.DASHBOARD_API_URL }}/api/')
            .replace(/https:\/\/dev\.iluvicandy\.com/g, '{{ $env.DASHBOARD_URL }}')
            .replace(/https:\/\/cold-email-dashboard\.vercel\.app/g, '{{ $env.DASHBOARD_URL }}')
        );
      }
      
      // Replace hardcoded workspace IDs
      if (params.includes('6be370cd-8dfb-4d5a-99fe-681eb305bdd6') || params.includes('default')) {
        console.log(`  - Found hardcoded workspace_id in node: ${node.name}`);
        node.parameters = JSON.parse(
          params
            .replace(/6be370cd-8dfb-4d5a-99fe-681eb305bdd6/g, '{{ $env.WORKSPACE_ID }}')
            .replace(/"workspace_id":\s*"default"/g, '"workspace_id": "{{ $env.WORKSPACE_ID }}"')
        );
      }
    }
    
    return node;
  });
  
  return workflow;
}

function main() {
  console.log('🚀 Phase 64.B: SMTP Workflow Cleaner\n');
  console.log('Cleaning workflows for template usage...\n');
  
  for (const filename of WORKFLOWS) {
    const filepath = path.join(BASE_DIR, filename);
    
    try {
      // Read workflow
      const content = fs.readFileSync(filepath, 'utf-8');
      const workflow: N8nWorkflow = JSON.parse(content);
      
      // Clean workflow
      const cleaned = cleanWorkflow(workflow);
      
      // Write back
      fs.writeFileSync(filepath, JSON.stringify(cleaned, null, 2), 'utf-8');
      
      console.log(`  ✅ Saved: ${filename}`);
      console.log(`  📊 Nodes: ${cleaned.nodes.length}`);
      
    } catch (error) {
      console.error(`  ❌ Error processing ${filename}:`, error);
      process.exit(1);
    }
  }
  
  console.log('\n✅ All SMTP workflows cleaned successfully!');
  console.log('\nTemplates ready for deployment:');
  console.log('  - Email 1-SMTP.json (Simple send via Sidecar)');
  console.log('  - Email 2-SMTP.json (Threading with raw RFC 2822)');
  console.log('  - Email 3-SMTP.json (Threading with inReplyTo)');
}

main();

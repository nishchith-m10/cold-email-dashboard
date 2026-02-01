/**
 * Phase 64.B Workflow Deployer
 * 
 * Creates DUPLICATE workflows in n8n with Email Provider Abstraction.
 * NEVER modifies originals - creates new workflows with "-Phase64B" suffix.
 * 
 * Part of Genesis Singularity Plan V35 - PART VII: ONBOARDING UX & FRICTION REDUCTION
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://64.23.139.93.sslip.io';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  webhookId?: string;
  [key: string]: unknown;
}

interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, { main: N8nConnection[][] }>;
  settings?: Record<string, unknown>;
  pinData?: Record<string, unknown>;
  active?: boolean;
  id?: string;
  versionId?: string;
  meta?: Record<string, unknown>;
  tags?: Array<{ id: string; name: string }>;
}

interface DeployResult {
  success: boolean;
  workflowId?: string;
  workflowName?: string;
  error?: string;
  nodeCount?: number;
}

/**
 * Sanitizes a workflow for creation as a NEW duplicate.
 * Removes fields that would cause conflicts with existing workflows.
 */
function sanitizeWorkflowForDuplication(workflow: N8nWorkflow, newName: string): N8nWorkflow {
  // Deep clone to avoid modifying original
  const sanitized: N8nWorkflow = JSON.parse(JSON.stringify(workflow));
  
  // 1. Set new name
  sanitized.name = newName;
  
  // 2. Remove fields that should be auto-generated
  delete sanitized.id;
  delete sanitized.versionId;
  delete sanitized.meta;
  delete sanitized.pinData;
  
  // 3. Remove tags (will be added separately if needed)
  delete sanitized.tags;
  
  // 4. Remove active field (read-only on creation, defaults to false)
  delete (sanitized as any).active;
  
  // 5. Clean up settings - remove self-referential errorWorkflow
  if (sanitized.settings) {
    // Remove errorWorkflow if it points to the original
    if (sanitized.settings.errorWorkflow) {
      delete sanitized.settings.errorWorkflow;
    }
    // Remove MCP availability flag
    delete sanitized.settings.availableInMCP;
    // Remove time saved metric
    delete sanitized.settings.timeSavedPerExecution;
  }
  
  // 6. Generate new UUIDs for all nodes to ensure uniqueness
  const nodeIdMap = new Map<string, string>();
  
  sanitized.nodes = sanitized.nodes.map(node => {
    const oldId = node.id;
    const newId = randomUUID();
    nodeIdMap.set(oldId, newId);
    
    // Also generate new webhookIds for trigger nodes
    const newWebhookId = node.webhookId ? randomUUID() : undefined;
    
    return {
      ...node,
      id: newId,
      ...(newWebhookId && { webhookId: newWebhookId })
    };
  });
  
  // 7. Update connections to use new node IDs
  const newConnections: Record<string, { main: N8nConnection[][] }> = {};
  
  for (const [sourceNodeName, connectionData] of Object.entries(sanitized.connections)) {
    // Connection keys are node NAMES, not IDs, so they don't need remapping
    // But the connection targets reference node names too
    newConnections[sourceNodeName] = connectionData;
  }
  
  sanitized.connections = newConnections;
  
  return sanitized;
}

/**
 * Creates a workflow in n8n via the REST API.
 */
async function createWorkflow(workflow: N8nWorkflow): Promise<DeployResult> {
  const url = `${N8N_BASE_URL}/api/v1/workflows`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
      },
      body: JSON.stringify(workflow),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.message || errorJson.error || errorText;
      } catch {
        // Keep original text
      }
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorDetail}`,
      };
    }
    
    const result = await response.json();
    
    return {
      success: true,
      workflowId: result.id,
      workflowName: result.name,
      nodeCount: result.nodes?.length || workflow.nodes.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verifies a workflow exists and is accessible in n8n.
 */
async function verifyWorkflow(workflowId: string): Promise<{ accessible: boolean; name?: string; error?: string }> {
  const url = `${N8N_BASE_URL}/api/v1/workflows/${workflowId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    });
    
    if (!response.ok) {
      return {
        accessible: false,
        error: `HTTP ${response.status}`,
      };
    }
    
    const result = await response.json();
    return {
      accessible: true,
      name: result.name,
    };
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Deploys a Phase64B workflow from a local JSON file.
 */
async function deployPhase64BWorkflow(jsonFilePath: string): Promise<DeployResult> {
  console.log(`\n📦 Loading: ${path.basename(jsonFilePath)}`);
  
  // Read the JSON file
  let rawWorkflow: N8nWorkflow;
  try {
    const content = fs.readFileSync(jsonFilePath, 'utf-8');
    rawWorkflow = JSON.parse(content);
  } catch (error) {
    return {
      success: false,
      error: `Failed to read JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  
  // Determine the new name (should already be "X - Phase64B" but ensure it)
  let newName = rawWorkflow.name;
  if (!newName.includes('Phase64B')) {
    // Extract base name and add suffix
    const baseName = newName.replace(/ - Phase64B$/, '').replace(/ copy$/, '');
    newName = `${baseName} - Phase64B`;
  }
  
  console.log(`   Original ID: ${rawWorkflow.id || 'none'}`);
  console.log(`   Original Name: ${rawWorkflow.name}`);
  console.log(`   Target Name: ${newName}`);
  console.log(`   Node Count: ${rawWorkflow.nodes.length}`);
  
  // Sanitize for duplication
  console.log(`\n🔧 Sanitizing workflow for duplication...`);
  const sanitizedWorkflow = sanitizeWorkflowForDuplication(rawWorkflow, newName);
  console.log(`   ✓ Removed id, versionId, meta, pinData`);
  console.log(`   ✓ Generated ${sanitizedWorkflow.nodes.length} new node UUIDs`);
  console.log(`   ✓ Cleaned settings`);
  
  // Create the workflow
  console.log(`\n🚀 Creating workflow in n8n...`);
  const result = await createWorkflow(sanitizedWorkflow);
  
  if (!result.success) {
    console.log(`   ❌ Failed: ${result.error}`);
    return result;
  }
  
  console.log(`   ✓ Created with ID: ${result.workflowId}`);
  
  // Verify accessibility
  console.log(`\n🔍 Verifying workflow is accessible...`);
  const verification = await verifyWorkflow(result.workflowId!);
  
  if (!verification.accessible) {
    console.log(`   ⚠️  Warning: Workflow created but verification failed: ${verification.error}`);
    console.log(`   This may indicate the "Could not find workflow" issue.`);
    return {
      ...result,
      success: false,
      error: `Created but not accessible: ${verification.error}`,
    };
  }
  
  console.log(`   ✓ Verified: "${verification.name}" is accessible`);
  
  return result;
}

/**
 * Main deployment function for all Phase64B workflows.
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  GENESIS SINGULARITY PLAN V35 - PHASE 64.B WORKFLOW DEPLOYER');
  console.log('  Email Provider Abstraction - Multi-Provider Support');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Validate configuration
  if (!N8N_API_KEY) {
    console.error('\n❌ ERROR: N8N_API_KEY environment variable not set');
    console.error('   Set it with: export N8N_API_KEY="your-api-key"');
    process.exit(1);
  }
  
  console.log(`\n📍 n8n Instance: ${N8N_BASE_URL}`);
  console.log(`🔑 API Key: ${N8N_API_KEY.substring(0, 20)}...`);
  
  // Define workflows to deploy
  const baseDir = path.join(__dirname, '..', 'base-cold-email');
  const workflowFiles = [
    'Email 1 - Phase64B.json',
    // Add Email 2 and Email 3 when their Phase64B versions are ready
  ];
  
  const results: Array<{ file: string; result: DeployResult }> = [];
  
  for (const file of workflowFiles) {
    const filePath = path.join(baseDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️  Skipping ${file} - file not found`);
      results.push({ file, result: { success: false, error: 'File not found' } });
      continue;
    }
    
    const result = await deployPhase64BWorkflow(filePath);
    results.push({ file, result });
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  DEPLOYMENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const successful = results.filter(r => r.result.success);
  const failed = results.filter(r => !r.result.success);
  
  console.log(`\n✅ Successful: ${successful.length}`);
  for (const { file, result } of successful) {
    console.log(`   • ${file}`);
    console.log(`     ID: ${result.workflowId}`);
    console.log(`     Nodes: ${result.nodeCount}`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    for (const { file, result } of failed) {
      console.log(`   • ${file}: ${result.error}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  
  // Exit with error code if any failed
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

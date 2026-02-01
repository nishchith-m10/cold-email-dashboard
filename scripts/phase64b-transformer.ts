/**
 * Phase 64.B Workflow Transformer
 * 
 * Transforms original Email workflows to Phase64B versions with multi-provider support.
 * CREATES DUPLICATES - never modifies originals.
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
const DASHBOARD_URL = 'YOUR_DASHBOARD_URL';

interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  webhookId?: string;
  onError?: string;
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

interface TransformConfig {
  // The name of the Gmail/email sending node in the original workflow
  gmailNodeName: string;
  // The name of the node that comes BEFORE the Gmail node (where we'll inject the config fetch)
  preGmailNodeName: string;
  // The step number (1, 2, or 3)
  step: number;
  // The name of the select leads node
  selectLeadsNodeName: string;
  // The tracking node name
  trackingNodeName: string;
  // Position offset for new nodes
  positionOffset: { x: number; y: number };
}

/**
 * Creates the Phase64B provider nodes that need to be added to the workflow.
 */
function createProviderNodes(config: TransformConfig): N8nNode[] {
  const timestamp = Date.now();
  const baseX = config.positionOffset.x;
  const baseY = config.positionOffset.y;
  
  return [
    // 1. Fetch Email Provider Config Node
    {
      id: `fetch-config-${timestamp}`,
      name: 'Fetch Email Provider Config',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [baseX, baseY] as [number, number],
      onError: 'continueRegularOutput',
      parameters: {
        url: `${DASHBOARD_URL}/api/workspace/email-config`,
        method: 'GET',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'x-workspace-id',
              value: `={{ $('${config.selectLeadsNodeName}').item.json.workspace_id || 'default' }}`
            }
          ]
        },
        options: {
          response: {
            response: {
              responseFormat: 'json'
            }
          }
        }
      }
    },
    // 2. Email Provider Switch Node
    {
      id: `provider-switch-${timestamp}`,
      name: 'Email Provider Switch',
      type: 'n8n-nodes-base.switch',
      typeVersion: 3.2,
      position: [baseX + 100, baseY] as [number, number],
      parameters: {
        rules: {
          values: [
            {
              output: 0,
              value1: "={{ $('Fetch Email Provider Config').json.provider }}",
              value2: 'gmail',
              operation: 'equal',
              conditions: {
                options: {
                  version: 2,
                  leftValue: '',
                  caseSensitive: true,
                  typeValidation: 'strict'
                }
              }
            },
            {
              output: 1,
              value1: "={{ $('Fetch Email Provider Config').json.provider }}",
              value2: 'sendgrid',
              operation: 'equal',
              conditions: {
                options: {
                  version: 2,
                  leftValue: '',
                  caseSensitive: true,
                  typeValidation: 'strict'
                }
              }
            },
            {
              output: 2,
              value1: "={{ $('Fetch Email Provider Config').json.provider }}",
              value2: 'mailgun',
              operation: 'equal',
              conditions: {
                options: {
                  version: 2,
                  leftValue: '',
                  caseSensitive: true,
                  typeValidation: 'strict'
                }
              }
            },
            {
              output: 3,
              value1: "={{ $('Fetch Email Provider Config').json.provider }}",
              value2: 'ses',
              operation: 'equal',
              conditions: {
                options: {
                  version: 2,
                  leftValue: '',
                  caseSensitive: true,
                  typeValidation: 'strict'
                }
              }
            },
            {
              output: 4,
              value1: "={{ $('Fetch Email Provider Config').json.provider }}",
              value2: 'postmark',
              operation: 'equal',
              conditions: {
                options: {
                  version: 2,
                  leftValue: '',
                  caseSensitive: true,
                  typeValidation: 'strict'
                }
              }
            }
          ]
        },
        fallbackOutput: 0
      }
    },
    // 3. SendGrid Send Node
    {
      id: `sendgrid-${timestamp}`,
      name: 'SendGrid Send',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [baseX + 200, baseY + 100] as [number, number],
      onError: 'continueRegularOutput',
      parameters: {
        url: 'https://api.sendgrid.com/v3/mail/send',
        method: 'POST',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'Authorization',
              value: "=Bearer {{ $('Fetch Email Provider Config').json.sendgrid_api_key }}"
            },
            {
              name: 'Content-Type',
              value: 'application/json'
            }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "personalizations": [{
    "to": [{
      "email": "{{ $('${config.selectLeadsNodeName}').item.json.email_address }}"
    }]
  }],
  "from": {
    "email": "{{ $('Fetch Email Provider Config').json.sendgrid_from_email }}",
    "name": "{{ $('Fetch Email Provider Config').json.sendgrid_from_name }}"
  },
  "subject": "{{ $('${config.selectLeadsNodeName}').item.json.email_${config.step}_subject || $json.subject }}",
  "content": [{
    "type": "text/html",
    "value": "{{ $json.tracked_body || $json.body }}"
  }]
}`,
        options: {}
      }
    },
    // 4. Mailgun Send Node
    {
      id: `mailgun-${timestamp}`,
      name: 'Mailgun Send',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [baseX + 200, baseY + 200] as [number, number],
      onError: 'continueRegularOutput',
      parameters: {
        url: "=https://api.mailgun.net/v3/{{ $('Fetch Email Provider Config').json.mailgun_domain }}/messages",
        method: 'POST',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'Authorization',
              value: "=Basic {{ Buffer.from('api:' + $('Fetch Email Provider Config').json.mailgun_api_key).toString('base64') }}"
            }
          ]
        },
        sendBody: true,
        specifyBody: 'form-urlencoded',
        bodyParameters: {
          parameters: [
            {
              name: 'from',
              value: `={{ $('Fetch Email Provider Config').json.mailgun_from_name }} <{{ $('Fetch Email Provider Config').json.mailgun_from_email }}>`
            },
            {
              name: 'to',
              value: `={{ $('${config.selectLeadsNodeName}').item.json.email_address }}`
            },
            {
              name: 'subject',
              value: `={{ $('${config.selectLeadsNodeName}').item.json.email_${config.step}_subject || $json.subject }}`
            },
            {
              name: 'html',
              value: '={{ $json.tracked_body || $json.body }}'
            }
          ]
        },
        options: {}
      }
    },
    // 5. AWS SES Send Node
    {
      id: `ses-${timestamp}`,
      name: 'AWS SES Send',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [baseX + 200, baseY + 300] as [number, number],
      onError: 'continueRegularOutput',
      parameters: {
        url: "=https://email.{{ $('Fetch Email Provider Config').json.ses_region || 'us-east-1' }}.amazonaws.com/v2/email/outbound-emails",
        method: 'POST',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'Content-Type',
              value: 'application/json'
            }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "FromEmailAddress": "{{ $('Fetch Email Provider Config').json.ses_from_email }}",
  "Destination": {
    "ToAddresses": ["{{ $('${config.selectLeadsNodeName}').item.json.email_address }}"]
  },
  "Content": {
    "Simple": {
      "Subject": {
        "Data": "{{ $('${config.selectLeadsNodeName}').item.json.email_${config.step}_subject || $json.subject }}"
      },
      "Body": {
        "Html": {
          "Data": "{{ $json.tracked_body || $json.body }}"
        }
      }
    }
  }
}`,
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'aws',
        options: {}
      }
    },
    // 6. Postmark Send Node
    {
      id: `postmark-${timestamp}`,
      name: 'Postmark Send',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [baseX + 200, baseY + 400] as [number, number],
      onError: 'continueRegularOutput',
      parameters: {
        url: 'https://api.postmarkapp.com/email',
        method: 'POST',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'X-Postmark-Server-Token',
              value: "={{ $('Fetch Email Provider Config').json.postmark_server_token }}"
            },
            {
              name: 'Content-Type',
              value: 'application/json'
            }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "From": "{{ $('Fetch Email Provider Config').json.postmark_from_email }}",
  "To": "{{ $('${config.selectLeadsNodeName}').item.json.email_address }}",
  "Subject": "{{ $('${config.selectLeadsNodeName}').item.json.email_${config.step}_subject || $json.subject }}",
  "HtmlBody": "{{ $json.tracked_body || $json.body }}",
  "MessageStream": "{{ $('Fetch Email Provider Config').json.postmark_stream || 'outbound' }}"
}`,
        options: {}
      }
    }
  ];
}

/**
 * Transforms a workflow to Phase64B version with multi-provider support.
 */
function transformToPhase64B(workflow: N8nWorkflow, config: TransformConfig): N8nWorkflow {
  console.log(`\n🔄 Transforming "${workflow.name}" to Phase64B...`);
  
  // Deep clone
  const transformed: N8nWorkflow = JSON.parse(JSON.stringify(workflow));
  
  // Update name
  transformed.name = `${workflow.name.replace(/ - Phase64B$/, '')} - Phase64B`;
  
  // Find the Gmail node to get position reference
  const gmailNode = transformed.nodes.find(n => n.name === config.gmailNodeName);
  if (gmailNode) {
    config.positionOffset = {
      x: gmailNode.position[0] - 100,
      y: gmailNode.position[1]
    };
  }
  
  // Create new provider nodes
  const providerNodes = createProviderNodes(config);
  
  // Add provider nodes to workflow
  transformed.nodes.push(...providerNodes);
  console.log(`   ✓ Added ${providerNodes.length} provider nodes`);
  
  // Rewire connections:
  // 1. preGmailNode -> Fetch Email Provider Config
  // 2. Fetch Email Provider Config -> Email Provider Switch
  // 3. Email Provider Switch -> [Gmail (0), SendGrid (1), Mailgun (2), SES (3), Postmark (4)]
  // 4. All provider nodes -> trackingNode
  
  // Find what currently connects to Gmail and redirect it
  for (const [nodeName, nodeConnections] of Object.entries(transformed.connections)) {
    if (!nodeConnections.main) continue;
    
    for (const outputs of nodeConnections.main) {
      for (const conn of outputs) {
        if (conn.node === config.gmailNodeName) {
          // Redirect to Fetch Email Provider Config
          conn.node = 'Fetch Email Provider Config';
          console.log(`   ✓ Redirected ${nodeName} -> Fetch Email Provider Config`);
        }
      }
    }
  }
  
  // Add connections for new nodes
  transformed.connections['Fetch Email Provider Config'] = {
    main: [[{ node: 'Email Provider Switch', type: 'main', index: 0 }]]
  };
  
  transformed.connections['Email Provider Switch'] = {
    main: [
      [{ node: config.gmailNodeName, type: 'main', index: 0 }],
      [{ node: 'SendGrid Send', type: 'main', index: 0 }],
      [{ node: 'Mailgun Send', type: 'main', index: 0 }],
      [{ node: 'AWS SES Send', type: 'main', index: 0 }],
      [{ node: 'Postmark Send', type: 'main', index: 0 }]
    ]
  };
  
  // Connect all provider nodes to tracking node
  const trackTarget = config.trackingNodeName;
  
  transformed.connections['SendGrid Send'] = {
    main: [[{ node: trackTarget, type: 'main', index: 0 }]]
  };
  transformed.connections['Mailgun Send'] = {
    main: [[{ node: trackTarget, type: 'main', index: 0 }]]
  };
  transformed.connections['AWS SES Send'] = {
    main: [[{ node: trackTarget, type: 'main', index: 0 }]]
  };
  transformed.connections['Postmark Send'] = {
    main: [[{ node: trackTarget, type: 'main', index: 0 }]]
  };
  
  console.log(`   ✓ Wired all provider nodes -> ${trackTarget}`);
  
  // Update tracking node to handle multi-provider message IDs
  const trackingNode = transformed.nodes.find(n => n.name === trackTarget);
  if (trackingNode && trackingNode.parameters) {
    // Update the jsonBody to include provider-agnostic message_id
    const params = trackingNode.parameters as Record<string, unknown>;
    if (typeof params.jsonBody === 'string') {
      // Add provider field and update message_id handling
      let jsonBody = params.jsonBody as string;
      
      // Replace provider_message_id line with dynamic handling
      jsonBody = jsonBody.replace(
        /"provider_message_id":\s*"[^"]*"/,
        '"provider_message_id": "{{ $json.id || $json.threadId || $json.MessageId || $json.messageId || \\"unknown\\" }}"'
      );
      
      // Add provider field if not present
      if (!jsonBody.includes('"provider"')) {
        jsonBody = jsonBody.replace(
          /"event_type":/,
          '"provider": "{{ $(\'Fetch Email Provider Config\').json.provider || \'gmail\' }}",\n  "event_type":'
        );
      }
      
      params.jsonBody = jsonBody;
      console.log(`   ✓ Updated tracking node for multi-provider message_id`);
    }
  }
  
  // Clean up for deployment
  delete transformed.id;
  delete transformed.versionId;
  delete transformed.meta;
  delete transformed.pinData;
  delete transformed.tags;
  delete (transformed as any).active;
  
  if (transformed.settings) {
    delete transformed.settings.errorWorkflow;
    delete transformed.settings.availableInMCP;
    delete transformed.settings.timeSavedPerExecution;
  }
  
  // Generate new node IDs
  const nodeIdMap = new Map<string, string>();
  transformed.nodes = transformed.nodes.map(node => {
    const oldId = node.id;
    const newId = randomUUID();
    nodeIdMap.set(oldId, newId);
    const newWebhookId = node.webhookId ? randomUUID() : undefined;
    return {
      ...node,
      id: newId,
      ...(newWebhookId && { webhookId: newWebhookId })
    };
  });
  
  console.log(`   ✓ Generated ${transformed.nodes.length} new node UUIDs`);
  
  return transformed;
}

/**
 * Saves workflow to file.
 */
function saveWorkflow(workflow: N8nWorkflow, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
  console.log(`\n💾 Saved: ${path.basename(outputPath)}`);
}

/**
 * Deploys workflow to n8n.
 */
async function deployWorkflow(workflow: N8nWorkflow): Promise<{ success: boolean; id?: string; error?: string }> {
  console.log(`\n🚀 Deploying "${workflow.name}" to n8n...`);
  
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
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
        // Keep original
      }
      return { success: false, error: `HTTP ${response.status}: ${errorDetail}` };
    }
    
    const result = await response.json();
    console.log(`   ✓ Deployed with ID: ${result.id}`);
    
    // Verify
    const verifyResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${result.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    if (verifyResponse.ok) {
      console.log(`   ✓ Verified workflow is accessible`);
      return { success: true, id: result.id };
    } else {
      return { success: false, id: result.id, error: 'Created but verification failed' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Workflow-specific configurations
const WORKFLOW_CONFIGS: Record<string, TransformConfig> = {
  'Email 1': {
    gmailNodeName: 'Gmail',
    preGmailNodeName: 'Inject Tracking',
    step: 1,
    selectLeadsNodeName: 'Select rows for Email 1',
    trackingNodeName: 'Track Email Sent',
    positionOffset: { x: 3100, y: 3584 }
  },
  'Email 2': {
    gmailNodeName: 'Gmail Email 2',
    preGmailNodeName: 'Inject Click Tracking',
    step: 2,
    selectLeadsNodeName: 'Select Leads for Email',
    trackingNodeName: 'Track Email 2 Sent',
    positionOffset: { x: 7600, y: 10080 }
  },
  'Email 3': {
    gmailNodeName: 'Gmail',
    preGmailNodeName: 'Inject Tracking Email',
    step: 3,
    selectLeadsNodeName: 'Select Leads for Email 3',
    trackingNodeName: 'Track Email 3 Sent',
    positionOffset: { x: 0, y: 0 }
  }
};

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  GENESIS SINGULARITY PLAN V35 - PHASE 64.B TRANSFORMER');
  console.log('  Multi-Provider Email Abstraction');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Skip API key check - generate JSON files for UI import
  // if (!N8N_API_KEY) {
  //   console.error('\n❌ ERROR: N8N_API_KEY environment variable not set');
  //   process.exit(1);
  // }
  
  const baseDir = path.join(__dirname, '..', 'base-cold-email');
  const workflowsToTransform = ['Email 1', 'Email 2', 'Email 3'];
  
  for (const workflowName of workflowsToTransform) {
    const inputPath = path.join(baseDir, `${workflowName}.json`);
    const outputPath = path.join(baseDir, `${workflowName} - Phase64B.json`);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`\n⚠️  Skipping ${workflowName} - source not found`);
      continue;
    }
    
    const config = WORKFLOW_CONFIGS[workflowName];
    if (!config) {
      console.log(`\n⚠️  Skipping ${workflowName} - no config defined`);
      continue;
    }
    
    // Read original
    console.log(`\n📂 Loading: ${workflowName}.json`);
    const original: N8nWorkflow = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    console.log(`   Nodes: ${original.nodes.length}`);
    
    // Transform
    const transformed = transformToPhase64B(original, config);
    
    // Save locally
    saveWorkflow(transformed, outputPath);
    
    // Deploy
    // Skip API deployment - files ready for UI import
    if (N8N_API_KEY) {
      const result = await deployWorkflow(transformed);
      if (!result.success) {
        console.log(`\n❌ Deployment failed: ${result.error}`);
      }
    } else {
      console.log(`\n⏭️  Skipping API deployment (no N8N_API_KEY) - file ready for UI import`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TRANSFORMATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);

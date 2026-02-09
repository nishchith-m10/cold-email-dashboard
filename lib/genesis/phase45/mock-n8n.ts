/**
 * PHASE 45: MOCK N8N SERVICE
 * 
 * Simulates n8n workflow execution for testing/development when a real
 * Sidecar + n8n instance is not available. Generates realistic mock
 * responses for common node types.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md (Phase 45.A)
 */

import type { MockExecutionResult, MockWorkflowDefinition, MockNodeResult } from './types';

// ============================================
// MOCK RESPONSE DEFINITIONS
// ============================================

type MockResponseFn = (input: Record<string, unknown>) => unknown;

const MOCK_RESPONSES: Record<string, MockResponseFn> = {
  // OpenAI mock
  'n8n-nodes-base.openAi': (input) => ({
    choices: [{
      message: {
        content: generateMockAIResponse(
          (input?.prompt as string) || (input?.messages as Array<{ content: string }>)?.[0]?.content || ''
        ),
        role: 'assistant',
      },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 150,
      total_tokens: 200,
    },
    model: 'gpt-4-mock',
  }),

  // HTTP Request mock
  'n8n-nodes-base.httpRequest': (input) => ({
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      success: true,
      mock: true,
      url: (input?.url as string) || 'mock://example.com',
      timestamp: new Date().toISOString(),
    },
  }),

  // Email send mock
  'n8n-nodes-base.emailSend': (input) => ({
    messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    accepted: [(input?.toEmail as string) || (input?.to as string) || 'test@example.com'],
    rejected: [],
    response: '250 2.0.0 OK',
  }),

  // Gmail mock
  'n8n-nodes-base.gmail': (input) => ({
    messageId: `mock-gmail-${Date.now()}`,
    threadId: `thread-${Date.now()}`,
    labelIds: ['SENT'],
    to: (input?.to as string) || 'test@example.com',
  }),

  // Postgres mock
  'n8n-nodes-base.postgres': (input) => {
    const operation = (input?.operation as string) || 'select';
    if (operation === 'select') {
      return [{
        id: '00000000-0000-0000-0000-000000000001',
        email_address: 'mock@example.com',
        status: 'pending',
        created_at: new Date().toISOString(),
      }];
    }
    return { affectedRows: 1 };
  },

  // Supabase vector store mock
  '@n8n/n8n-nodes-langchain.supabaseVectorStore': () => ({
    matches: [
      { id: 'doc-1', score: 0.95, content: 'Mock document content' },
      { id: 'doc-2', score: 0.87, content: 'Another mock document' },
    ],
  }),

  // Google Sheets mock
  'n8n-nodes-base.googleSheets': (input) => {
    const operation = (input?.operation as string) || 'read';
    if (operation === 'read') {
      return [
        { 'A': 'Name', 'B': 'Email', 'C': 'Status' },
        { 'A': 'John Doe', 'B': 'john@example.com', 'C': 'Active' },
      ];
    }
    return { updatedCells: 3, spreadsheetId: 'mock-sheet-id' };
  },

  // Webhook mock
  'n8n-nodes-base.webhook': () => ({
    headers: { 'content-type': 'application/json' },
    body: { trigger: 'manual', source: 'mock' },
    query: {},
  }),

  // Code/Function mock
  'n8n-nodes-base.code': () => ({
    result: 'mock_code_output',
    timestamp: new Date().toISOString(),
  }),

  // IF/Switch mock
  'n8n-nodes-base.if': () => ({
    condition: true,
    branch: 'true',
  }),

  // Set mock
  'n8n-nodes-base.set': (input) => ({
    ...(input || {}),
    _processed: true,
  }),
};

// ============================================
// AI RESPONSE GENERATOR
// ============================================

function generateMockAIResponse(prompt: string): string {
  const lowercasePrompt = prompt.toLowerCase();

  if (lowercasePrompt.includes('research') || lowercasePrompt.includes('company')) {
    return JSON.stringify({
      company_summary: 'Mock company is a technology firm specializing in AI solutions.',
      key_contacts: ['CEO: John Smith', 'CTO: Jane Doe'],
      recent_news: ['Raised Series B funding', 'Launched new product'],
      pain_points: ['Scaling challenges', 'Talent acquisition'],
    });
  }

  if (lowercasePrompt.includes('email') || lowercasePrompt.includes('write')) {
    return [
      `Subject: Quick question about ${prompt.split(' ').slice(0, 3).join(' ')}`,
      '',
      'Hi [Name],',
      '',
      'I noticed your company is working on interesting projects. I\'d love to connect and share some insights that might be valuable.',
      '',
      'Would you have 15 minutes this week for a brief call?',
      '',
      'Best regards,',
      '[Sender]',
    ].join('\n');
  }

  if (lowercasePrompt.includes('score') || lowercasePrompt.includes('qualify')) {
    return JSON.stringify({
      score: Math.floor(Math.random() * 40) + 60,
      qualified: true,
      reasoning: 'Company matches ICP criteria',
      next_action: 'proceed_to_outreach',
    });
  }

  return 'This is a mock AI response for testing purposes.';
}

// ============================================
// MOCK EXECUTION ENGINE
// ============================================

/**
 * Execute a mock workflow by simulating each node sequentially.
 * Each node has a random delay (50-150ms) to simulate real execution.
 */
export async function executeMockWorkflow(
  workflowDefinition: MockWorkflowDefinition,
  _triggerData?: unknown
): Promise<MockExecutionResult> {
  const executionId = `mock-exec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const startedAt = new Date().toISOString();
  const nodeResults: MockNodeResult[] = [];

  for (const node of workflowDefinition.nodes || []) {
    const mockFn = MOCK_RESPONSES[node.type] || (
      (input: Record<string, unknown>) => ({ ...(input || {}), _mock: true })
    );
    const startTime = Date.now();

    // Simulate processing time (50-150ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    nodeResults.push({
      nodeName: node.name,
      nodeType: node.type,
      output: mockFn(node.parameters || {}),
      duration: Date.now() - startTime,
    });
  }

  return {
    executionId,
    status: 'success',
    startedAt,
    completedAt: new Date().toISOString(),
    nodeResults,
  };
}

/**
 * Get the mock response function for a given node type.
 * Returns null if no mock is registered.
 */
export function getMockResponseFn(nodeType: string): MockResponseFn | null {
  return MOCK_RESPONSES[nodeType] || null;
}

/**
 * List all supported mock node types.
 */
export function getSupportedMockNodeTypes(): string[] {
  return Object.keys(MOCK_RESPONSES);
}

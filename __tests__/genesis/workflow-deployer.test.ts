/**
 * WORKFLOW DEPLOYER TESTS
 *
 * Tests for the credential injection logic added in Section 3:
 *   - injectVariables:              {{ $env.VAR }} substitution
 *   - injectCredentialPlaceholders: YOUR_* literal replacement
 *
 * Both are private methods so accessed via `(deployer as any)`.
 */

import { WorkflowDeployer, WorkflowDeploymentRequest } from '../../sidecar/workflow-deployer';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Minimal stub for N8nManager — we never call deploy in unit tests here. */
const mockN8nManager = {} as any;

function makeDeployer() {
  return new WorkflowDeployer(
    mockN8nManager,
    '/tmp/templates', // templateDir not used in these unit tests
    'https://supabase.example.com',
    'anon-key',
  );
}

function minimalRequest(overrides: Partial<WorkflowDeploymentRequest> = {}): WorkflowDeploymentRequest {
  return {
    workspace_id: 'ws-001',
    campaign_name: 'Test Campaign',
    dashboard_url: 'https://app.example.com',
    dashboard_api_url: 'https://app.example.com/api',
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// injectVariables — {{ $env.VAR_NAME }} replacements
// ──────────────────────────────────────────────────────────────────────────────

describe('WorkflowDeployer.injectVariables', () => {
  let deployer: WorkflowDeployer;
  // Access private method
  let inject: (json: string, vars: Record<string, string>) => string;

  beforeEach(() => {
    deployer = makeDeployer();
    inject = (deployer as any).injectVariables.bind(deployer);
  });

  test('replaces a simple {{ $env.VAR }} token', () => {
    const result = inject('hello {{ $env.WORKSPACE_ID }} world', {
      WORKSPACE_ID: 'ws-abc',
    });
    expect(result).toBe('hello ws-abc world');
  });

  test('replaces multiple occurrences in the same string', () => {
    const result = inject(
      '{{ $env.X }}-{{ $env.X }}-{{ $env.X }}',
      { X: 'foo' },
    );
    expect(result).toBe('foo-foo-foo');
  });

  test('replaces multiple different keys', () => {
    const result = inject(
      'A={{ $env.A }}, B={{ $env.B }}',
      { A: '1', B: '2' },
    );
    expect(result).toBe('A=1, B=2');
  });

  test('handles extra whitespace between {{ and $env, and trailing whitespace before }}', () => {
    // The regex is \{\{\s*\$env\.KEY\s*\}\} — allows whitespace at {{ and }},
    // but not between $env. and the key name itself.
    const result = inject('{{  $env.CAMPAIGN_NAME  }}', {
      CAMPAIGN_NAME: 'MyCampaign',
    });
    expect(result).toBe('MyCampaign');
  });

  test('leaves unknown tokens intact', () => {
    const input = '{{ $env.UNKNOWN_VAR }}';
    const result = inject(input, { WORKSPACE_ID: 'ws-x' });
    expect(result).toBe(input);
  });

  test('returns input unchanged when vars map is empty', () => {
    const input = '{{ $env.FOO }}';
    expect(inject(input, {})).toBe(input);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// injectCredentialPlaceholders — YOUR_* literal replacements
// ──────────────────────────────────────────────────────────────────────────────

describe('WorkflowDeployer.injectCredentialPlaceholders', () => {
  let deployer: WorkflowDeployer;
  let inject: (json: string, req: WorkflowDeploymentRequest) => string;

  beforeEach(() => {
    deployer = makeDeployer();
    inject = (deployer as any).injectCredentialPlaceholders.bind(deployer);
  });

  test('replaces YOUR_CREDENTIAL_GMAIL_ID with the provided value', () => {
    const req = minimalRequest({ credential_gmail_id: 'gmail-cred-42' });
    const result = inject('{"credentialId":"YOUR_CREDENTIAL_GMAIL_ID"}', req);
    expect(result).toBe('{"credentialId":"gmail-cred-42"}');
  });

  test('replaces YOUR_LEADS_TABLE with the provided value', () => {
    const req = minimalRequest({ leads_table: 'leads_ohio' });
    const result = inject('SELECT * FROM YOUR_LEADS_TABLE;', req);
    expect(result).toBe('SELECT * FROM leads_ohio;');
  });

  test('leaves empty-string placeholders unreplaced (intact)', () => {
    // credential_gmail_id not provided → defaults to '' → token left in place
    const req = minimalRequest();
    const input = '{"id":"YOUR_CREDENTIAL_GMAIL_ID"}';
    expect(inject(input, req)).toBe(input);
  });

  test('longest key wins — no partial replacement by shorter prefix', () => {
    // YOUR_CREDENTIAL_GMAIL_ID must not collide with a hypothetical shorter key
    // that starts with YOUR_CREDENTIAL_G
    const req = minimalRequest({
      credential_gmail_id: 'CORRECT',
    });
    const result = inject('YOUR_CREDENTIAL_GMAIL_ID', req);
    expect(result).toBe('CORRECT');
    // Ensure it was not partially eaten by a shorter key
    expect(result).not.toContain('YOUR_CREDENTIAL_GMAIL_ID');
  });

  test('replaces multiple YOUR_* tokens in one pass', () => {
    const req = minimalRequest({
      credential_gmail_id: 'g-id',
      credential_openai_id: 'oai-id',
      leads_table: 'leads_prod',
    });
    const input =
      'gmail=YOUR_CREDENTIAL_GMAIL_ID openai=YOUR_CREDENTIAL_OPENAI_ID table=YOUR_LEADS_TABLE';
    const result = inject(input, req);
    expect(result).toBe('gmail=g-id openai=oai-id table=leads_prod');
  });

  test('replaces extra_placeholders provided by the caller', () => {
    const req = minimalRequest({
      extra_placeholders: { YOUR_CUSTOM_TOKEN: 'custom-value' },
    });
    const result = inject('token=YOUR_CUSTOM_TOKEN', req);
    expect(result).toBe('token=custom-value');
  });

  test('extra_placeholders override built-in keys when longer', () => {
    // Caller provides an extra key that is longer than any built-in, so
    // it will be applied first (longest-first sort).
    const req = minimalRequest({
      leads_table: 'default_table',
      extra_placeholders: {
        YOUR_LEADS_TABLE_EXTENDED: 'extended_table',
      },
    });
    const input = 'a=YOUR_LEADS_TABLE b=YOUR_LEADS_TABLE_EXTENDED';
    const result = inject(input, req);
    // Extended token replaced by its value, shorter token by its value
    expect(result).toBe('a=default_table b=extended_table');
  });

  test('replaces YOUR_COMPANY_NAME and YOUR_NAME', () => {
    const req = minimalRequest({
      company_name: 'Acme Corp',
      sender_name: 'Alice',
    });
    const input = 'company=YOUR_COMPANY_NAME sender=YOUR_NAME';
    const result = inject(input, req);
    expect(result).toBe('company=Acme Corp sender=Alice');
  });

  test('falls back YOUR_UNSUBSCRIBE_REDIRECT_URL to dashboard_url', () => {
    const req = minimalRequest({ dashboard_url: 'https://app.example.com' });
    const result = inject('url=YOUR_UNSUBSCRIBE_REDIRECT_URL', req);
    expect(result).toBe('url=https://app.example.com');
  });

  test('replaces all Relevance AI placeholders', () => {
    const req = minimalRequest({
      relevance_ai_auth_token: 'rai-token',
      relevance_ai_base_url: 'https://rai.example.com',
      relevance_ai_studio_id: 'studio-123',
      relevance_ai_project_id: 'proj-456',
    });
    const input = [
      'auth=YOUR_RELEVANCE_AI_AUTH_TOKEN',
      'base=YOUR_RELEVANCE_AI_BASE_URL',
      'studio=YOUR_RELEVANCE_AI_STUDIO_ID',
      'project=YOUR_RELEVANCE_AI_PROJECT_ID',
    ].join(' ');
    const result = inject(input, req);
    expect(result).toBe(
      'auth=rai-token base=https://rai.example.com studio=studio-123 project=proj-456'
    );
  });

  test('handles a realistic JSON workflow fragment', () => {
    const req = minimalRequest({
      credential_google_sheets_id: 'gs-cred-99',
      credential_postgres_id: 'pg-cred-77',
      leads_table: 'leads_ohio',
    });
    const fragment = JSON.stringify({
      nodes: [
        { type: 'googleSheets', credentials: { id: 'YOUR_CREDENTIAL_GOOGLE_SHEETS_ID' } },
        { type: 'postgres',     credentials: { id: 'YOUR_CREDENTIAL_POSTGRES_ID' } },
        { type: 'set',          value:  'FROM YOUR_LEADS_TABLE' },
      ],
    });
    const result = inject(fragment, req);
    const parsed = JSON.parse(result);
    expect(parsed.nodes[0].credentials.id).toBe('gs-cred-99');
    expect(parsed.nodes[1].credentials.id).toBe('pg-cred-77');
    expect(parsed.nodes[2].value).toBe('FROM leads_ohio');
  });
});

/**
 * N8nDirectClient
 *
 * Calls n8n's public REST API directly over HTTPS (via sslip.io port 443 → Caddy → n8n).
 * This avoids the port-3100 sidecar route which is unreachable from Vercel serverless.
 *
 * Usage:
 *   const apiKey = await N8nDirectClient.loginAndGetApiKey(baseUrl, email, password);
 *   const client = new N8nDirectClient(baseUrl, apiKey);
 *   const credId   = await client.createCredential('My OpenAI', 'openai_api', { apiKey: 'sk-...' });
 *   const wfId     = await client.importWorkflow(workflowJson);
 *   await client.activateWorkflow(wfId);
 */

// ── Credential type map: internal (orchestrator) → n8n API type string ──────
const N8N_CRED_TYPE_MAP: Record<string, string> = {
  google_oauth2:    'gmailOAuth2',
  openai_api:       'openAiApi',
  anthropic_api:    'anthropicApi',
  http_header_auth: 'httpHeaderAuth',
  http_query_auth:  'httpQueryAuth',
  http_basic_auth:  'httpBasicAuth',
  postgres:         'postgres',
  smtp:             'smtp',
  google_sheets:    'googleSheetsOAuth2Api',
};

export class N8nDirectClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  // ── Auth: login + create API key ──────────────────────────────────────────
  static async loginAndGetApiKey(
    baseUrl: string,
    email: string,
    password: string
  ): Promise<string> {
    const base = baseUrl.replace(/\/$/, '');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);

    // Step 1: POST /rest/login
    let loginRes: Response;
    try {
      loginRes = await fetch(`${base}/rest/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }

    if (!loginRes.ok) {
      const body = await loginRes.text().catch(() => '');
      throw new Error(`n8n login failed HTTP ${loginRes.status}: ${body.slice(0, 200)}`);
    }

    // Extract session cookie — may be multiple Set-Cookie headers
    const rawCookie = loginRes.headers.get('set-cookie') ?? '';
    if (!rawCookie) {
      throw new Error('n8n login succeeded but no Set-Cookie returned');
    }
    // Keep only the key=value parts (strip ;Path=..., ;SameSite=... etc)
    const sessionCookie = rawCookie
      .split(',')
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');

    // Step 2: POST /rest/users/me/api-key
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 15_000);
    let apiKeyRes: Response;
    try {
      apiKeyRes = await fetch(`${base}/rest/users/me/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({}),
        signal: ctrl2.signal,
      });
    } finally {
      clearTimeout(t2);
    }

    if (!apiKeyRes.ok) {
      const body = await apiKeyRes.text().catch(() => '');
      throw new Error(`n8n API key creation HTTP ${apiKeyRes.status}: ${body.slice(0, 200)}`);
    }

    const data = await apiKeyRes.json();
    const apiKey: string = data?.data?.apiKey ?? data?.apiKey;
    if (!apiKey) {
      throw new Error(`Unexpected API key response: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return apiKey;
  }

  // ── Credentials ───────────────────────────────────────────────────────────
  async createCredential(
    name: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const n8nType = N8N_CRED_TYPE_MAP[type] ?? type;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/v1/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.apiKey,
        },
        body: JSON.stringify({ name, type: n8nType, data }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `n8n credential '${name}' failed HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`
      );
    }
    const id = body?.data?.id ?? body?.id;
    if (!id) {
      throw new Error(`No credential ID in response: ${JSON.stringify(body).slice(0, 200)}`);
    }
    return String(id);
  }

  // ── Workflows ─────────────────────────────────────────────────────────────
  async importWorkflow(workflowJson: Record<string, unknown>): Promise<string> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.apiKey,
        },
        body: JSON.stringify(workflowJson),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `n8n workflow import failed HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`
      );
    }
    const id = body?.data?.id ?? body?.id;
    if (!id) {
      throw new Error(`No workflow ID in response: ${JSON.stringify(body).slice(0, 200)}`);
    }
    return String(id);
  }

  async activateWorkflow(workflowId: string): Promise<void> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.apiKey,
        },
        body: JSON.stringify({ active: true }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `n8n workflow activation ${workflowId} failed HTTP ${res.status}: ${body.slice(0, 200)}`
      );
    }
  }
}

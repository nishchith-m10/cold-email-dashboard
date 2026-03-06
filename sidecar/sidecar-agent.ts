/**
 * SIDECAR AGENT - Main Application
 * 
 * The Sidecar Agent runs on every Sovereign Droplet alongside n8n.
 * It is the ONLY entity allowed to communicate with the Dashboard.
 * 
 * Responsibilities:
 * - Health reporting (every 60 seconds)
 * - Command execution (JWT-verified)
 * - Credential injection
 * - Workflow deployment
 * - Container lifecycle management
 * 
 * Security Model: Zero-Trust JWT (RS256)
 */

import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { JWTVerifier, SidecarJWTPayload } from './jwt-verifier';
import { N8nManager } from './n8n-manager';
import { DockerManager } from './docker-manager';
import { SMTPService, SendEmailRequest, CheckReplyRequest } from './smtp-service';
import { WorkflowDeployer, WorkflowDeploymentRequest } from './workflow-deployer';
import { decryptCredential } from './crypto-utils';

// ============================================
// N8N CREDENTIAL TYPE MAPPING
// Maps internal CredentialType enum strings → n8n API credential type strings.
// n8n's POST /v1/credentials requires the exact internal n8n type key (camelCase).
// Internal types use snake_case; n8n uses camelCase identifiers.
// ============================================
const N8N_CREDENTIAL_TYPE_MAP: Record<string, string> = {
  // Tenant-injected credentials
  google_oauth2:    'gmailOAuth2',           // Gmail nodes (gmailOAuth2)
  openai_api:       'openAiApi',             // OpenAI nodes
  anthropic_api:    'anthropicApi',          // Anthropic/Claude nodes
  http_header_auth: 'httpHeaderAuth',        // Google CSE header auth / generic header
  http_query_auth:  'httpQueryAuth',         // Google CSE query auth
  http_basic_auth:  'httpBasicAuth',         // Generic basic auth
  // Already correct (n8n uses these exact strings)
  postgres:         'postgres',
  smtp:             'smtp',
  // Google Sheets — handled as operator credential via googleSheetsOAuth2Api
  google_sheets:    'googleSheetsOAuth2Api',
};

/**
 * Translate an internal CredentialType string to the exact n8n API type string.
 * Falls through to the raw value if no mapping found (forward-compatible).
 */
function toN8nCredentialType(internalType: string): string {
  return N8N_CREDENTIAL_TYPE_MAP[internalType] ?? internalType;
}

// ============================================
// CONFIGURATION
// ============================================

interface SidecarConfig {
  workspaceId: string;
  dropletId: string;
  dashboardUrl: string;
  sidecarToken: string;        // Long-lived token for heartbeats
  publicKey: string;            // Dashboard's RSA public key for JWT verification
  n8nUrl: string;
  n8nApiKey: string;
  n8nContainerName: string;
  port: number;
  // SMTP/IMAP Configuration (optional)
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  // SEC-001: shared secret for /send and /check-reply (defence-in-depth on top of localhost guard)
  smtpWebhookSecret?: string;
}

// ============================================
// COMMAND TYPES
// ============================================

type SidecarCommand =
  | 'HEALTH_CHECK'
  | 'DEPLOY_WORKFLOW'
  | 'DEPLOY_CAMPAIGN_WORKFLOWS'  // Phase 64.B: Deploy provider-specific workflows
  | 'UPDATE_WORKFLOW'
  | 'ACTIVATE_WORKFLOW'
  | 'DEACTIVATE_WORKFLOW'
  | 'DELETE_WORKFLOW'
  | 'INJECT_CREDENTIAL'
  | 'ROTATE_CREDENTIAL'
  | 'RESTART_N8N'
  | 'PULL_IMAGE'
  | 'SWAP_CONTAINER'
  | 'GET_LOGS'
  | 'GET_WORKFLOW'
  | 'COLLECT_METRICS';

interface CommandRequest {
  action: SidecarCommand;
  payload?: any;
}

interface CommandResponse {
  success: boolean;
  result?: any;
  error?: string;
  execution_time_ms: number;
}

interface HealthReport {
  workspace_id: string;
  droplet_id: string;
  timestamp: string;
  n8n_status: 'healthy' | 'degraded' | 'down';
  container_status: string;
  disk_usage_percent?: number;
  memory_usage_mb?: number;
  cpu_percent?: number;
  uptime_seconds?: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Directory used to persist state across process restarts (SEC-002) */
const SIDECAR_DATA_DIR = process.env.SIDECAR_DATA_DIR || '/app/data';
/** File path where the sidecar heartbeat token is persisted (SEC-002) */
const TOKEN_FILE = path.join(SIDECAR_DATA_DIR, '.sidecar_token');

// ============================================
// SIDECAR AGENT CLASS
// ============================================

export class SidecarAgent {
  private config: SidecarConfig;
  private jwtVerifier: JWTVerifier;
  private n8nManager: N8nManager;
  private dockerManager: DockerManager;
  private workflowDeployer: WorkflowDeployer;  // Phase 64.B
  private smtpService: SMTPService | null = null;  // Phase 64.B
  private app: express.Application;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private startTime: number;

  constructor(config: SidecarConfig) {
    this.config = config;
    this.startTime = Date.now();

    // Initialize components
    this.jwtVerifier = new JWTVerifier(
      config.publicKey,
      config.workspaceId,
      config.dropletId
    );

    this.n8nManager = new N8nManager(config.n8nUrl, config.n8nApiKey);
    this.dockerManager = new DockerManager(config.n8nContainerName);

    // Phase 64.B: Initialize WorkflowDeployer
    this.workflowDeployer = new WorkflowDeployer(
      this.n8nManager,
      process.env.WORKFLOW_TEMPLATE_DIR || '/app/base-cold-email',
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Phase 64.B: Initialize SMTP service if configured
    if (config.smtpHost && config.smtpUser && config.smtpPass) {
      this.smtpService = new SMTPService({
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpSecure || false,
        user: config.smtpUser,
        pass: config.smtpPass,
        fromEmail: config.smtpFromEmail || config.smtpUser,
        fromName: config.smtpFromName || 'Genesis',
      });
      console.log('✅ SMTP Service initialized');
    }

    // Initialize Express app
    this.app = express();
    // SEC-004: Disable X-Powered-By header to avoid fingerprinting
    this.app.disable('x-powered-by');
    this.app.use(express.json({ limit: '10mb' }));

    // Setup routes
    this.setupRoutes();
  }

  /**
   * START AGENT
   */
  async start(): Promise<void> {
    console.log('🚀 Sidecar Agent starting...');
    console.log(`   Workspace: ${this.config.workspaceId}`);
    console.log(`   Droplet:   ${this.config.dropletId}`);
    console.log(`   Dashboard: ${this.config.dashboardUrl}`);

    // SEC-002: Restore persisted sidecar token so we skip re-handshake on restarts
    const persistedToken = this.loadPersistedToken();
    if (persistedToken) {
      this.config.sidecarToken = persistedToken;
      console.log('🔑 Loaded persisted sidecar token from disk');
    }

    // Start HTTP server
    this.app.listen(this.config.port, () => {
      console.log(`✅ Sidecar Agent listening on port ${this.config.port}`);
    });

    // Bootstrap n8n: wait for it to be ready, set up owner account, obtain API key
    await this.bootstrapN8n();

    // Perform handshake with Dashboard (if this is first boot)
    await this.performHandshake();

    // Start health reporting
    this.startHealthReporting();

    console.log('✅ Sidecar Agent fully operational');
  }

  /**
   * STOP AGENT
   */
  async stop(): Promise<void> {
    console.log('🛑 Sidecar Agent shutting down...');

    // Stop health reporting
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Cleanup JWT verifier
    this.jwtVerifier.destroy();

    console.log('✅ Sidecar Agent stopped');
  }

  /**
   * SETUP ROUTES
   */
  private setupRoutes(): void {
    // Health check endpoint (for external monitoring)
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        workspace_id: this.config.workspaceId,
        droplet_id: this.config.dropletId,
        smtp_enabled: this.smtpService !== null,  // Phase 64.B
      });
    });

    // Command endpoint (JWT-protected)
    this.app.post('/command', async (req: Request, res: Response) => {
      await this.handleCommand(req, res);
    });

    // Phase 64.B / SEC-001: SMTP endpoints — localhost-only + optional secret header
    this.app.post('/send', this.requireSmtpCaller.bind(this), async (req: Request, res: Response) => {
      await this.handleSMTPSend(req, res);
    });

    this.app.get('/check-reply', this.requireSmtpCaller.bind(this), async (req: Request, res: Response) => {
      await this.handleSMTPCheckReply(req, res);
    });
  }

  /**
   * SEC-001: SMTP CALLER GUARD
   *
   * Enforces two layers of access control on /send and /check-reply:
   *  1. Caller must originate from localhost (127.0.0.1 / ::1 / ::ffff:127.0.0.1) — n8n
   *     always satisfies this because it runs on the same droplet.
   *  2. If SMTP_WEBHOOK_SECRET is configured, the X-Smtp-Secret header must match.
   *
   * This prevents any external process or pod that can reach port 3100 from
   * sending arbitrary emails through the workspace's SMTP credentials.
   */
  private requireSmtpCaller(req: Request, res: Response, next: NextFunction): void {
    const remoteAddr = req.socket.remoteAddress ?? '';
    const isLocalhost =
      remoteAddr === '127.0.0.1' ||
      remoteAddr === '::1' ||
      remoteAddr === '::ffff:127.0.0.1';

    const secret = this.config.smtpWebhookSecret || process.env.SMTP_WEBHOOK_SECRET;
    if (secret) {
      // When a secret is configured, the caller must supply it — even from localhost.
      const provided = req.headers['x-smtp-secret'];
      if (provided !== secret) {
        console.warn(
          `[SEC-001] /send or /check-reply rejected: bad or missing X-Smtp-Secret from ${remoteAddr}`
        );
        res.status(401).json({ success: false, error: 'Unauthorized: invalid SMTP secret' });
        return;
      }
    } else {
      // No secret configured — fall back to localhost-only IP guard.
      if (!isLocalhost) {
        console.warn(`[SEC-001] /send or /check-reply rejected: non-localhost caller ${remoteAddr}`);
        res.status(403).json({
          success: false,
          error: 'SMTP endpoints are only accessible from localhost (n8n on the same droplet)',
        });
        return;
      }
      // Log a startup warning if secret was never configured.
      // (already warned at startup — see start() — so only debug-level here)
    }

    next();
  }

  /**
   * COMMAND HANDLER
   * Verifies JWT and executes command
   */
  private async handleCommand(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Extract JWT from header
      const authHeader = req.headers['x-genesis-jwt'];
      if (!authHeader || typeof authHeader !== 'string') {
        res.status(401).json({
          success: false,
          error: 'Missing X-Genesis-JWT header',
          execution_time_ms: Date.now() - startTime,
        });
        return;
      }

      // Verify JWT
      const verification = this.jwtVerifier.verify(authHeader);
      if (!verification.valid) {
        console.warn(`JWT verification failed: ${verification.error}`);
        res.status(403).json({
          success: false,
          error: verification.error,
          execution_time_ms: Date.now() - startTime,
        });
        return;
      }

      const payload = verification.payload!;

      // Extract command request
      const commandReq: CommandRequest = req.body;

      // Verify action matches JWT
      if (commandReq.action !== payload.action) {
        res.status(403).json({
          success: false,
          error: `Action mismatch: JWT=${payload.action}, Body=${commandReq.action}`,
          execution_time_ms: Date.now() - startTime,
        });
        return;
      }

      console.log(`Executing command: ${commandReq.action} (JTI: ${payload.jti})`);

      // Execute command
      const result = await this.executeCommand(commandReq);

      res.json(result);
    } catch (error) {
      console.error('Command execution error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        execution_time_ms: Date.now() - startTime,
      });
    }
  }

  /**
   * EXECUTE COMMAND
   * Routes command to appropriate handler
   */
  private async executeCommand(command: CommandRequest): Promise<CommandResponse> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (command.action) {
        case 'HEALTH_CHECK':
          result = await this.handleHealthCheck();
          break;

        case 'DEPLOY_WORKFLOW':
          result = await this.handleDeployWorkflow(command.payload);
          break;

        case 'DEPLOY_CAMPAIGN_WORKFLOWS':
          // Phase 64.B: Deploy provider-specific workflows
          // D2-001: Gated behind SIDECAR_AUTO_DEPLOY env var.
          // The orchestrator (ignition-orchestrator.ts) is the primary deployment
          // path — it deploys all 7 templates via DEPLOY_WORKFLOW commands with
          // full variable substitution done dashboard-side.  This Sidecar-side
          // deployer is a FALLBACK path only.  Set SIDECAR_AUTO_DEPLOY=true to
          // enable it; default is disabled to prevent duplicate deployments.
          if (process.env.SIDECAR_AUTO_DEPLOY !== 'true') {
            result = {
              success: false,
              error: 'DEPLOY_CAMPAIGN_WORKFLOWS is disabled. Set SIDECAR_AUTO_DEPLOY=true to enable the Sidecar-side deployer. The orchestrator handles deployment by default.',
            };
          } else {
            result = await this.handleDeployCampaignWorkflows(command.payload);
          }
          break;

        case 'GET_WORKFLOW':
          result = await this.handleGetWorkflow(command.payload);
          break;

        case 'UPDATE_WORKFLOW':
          result = await this.handleUpdateWorkflow(command.payload);
          break;

        case 'ACTIVATE_WORKFLOW':
          result = await this.handleActivateWorkflow(command.payload);
          break;

        case 'DEACTIVATE_WORKFLOW':
          result = await this.handleDeactivateWorkflow(command.payload);
          break;

        case 'DELETE_WORKFLOW':
          result = await this.handleDeleteWorkflow(command.payload);
          break;

        case 'INJECT_CREDENTIAL':
          result = await this.handleInjectCredential(command.payload);
          break;

        case 'ROTATE_CREDENTIAL':
          result = await this.handleRotateCredential(command.payload);
          break;

        case 'RESTART_N8N':
          result = await this.handleRestartN8n();
          break;

        case 'PULL_IMAGE':
          result = await this.handlePullImage(command.payload);
          break;

        case 'SWAP_CONTAINER':
          result = await this.handleSwapContainer(command.payload);
          break;

        case 'GET_LOGS':
          result = await this.handleGetLogs(command.payload);
          break;

        case 'COLLECT_METRICS':
          result = await this.handleCollectMetrics(command.payload);
          break;

        default:
          throw new Error(`Unknown command: ${command.action}`);
      }

      return {
        success: true,
        result,
        execution_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        execution_time_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * COMMAND HANDLERS
   */

  private async handleHealthCheck(): Promise<any> {
    const n8nHealth = await this.n8nManager.getHealth();
    const containerInfo = await this.dockerManager.getContainerInfo();
    const containerMetrics = await this.dockerManager.getContainerMetrics();

    return {
      n8n_status: n8nHealth.status,
      n8n_version: n8nHealth.version,
      container_status: containerInfo?.status || 'unknown',
      container_health: containerInfo?.health,
      cpu_percent: containerMetrics?.cpu_percent,
      memory_usage_mb: containerMetrics?.memory_usage_mb,
      memory_limit_mb: containerMetrics?.memory_limit_mb,
    };
  }

  private async handleDeployWorkflow(payload: {
    workflow_json: any;
    credential_map?: Record<string, string>;
  }): Promise<any> {
    let workflowJson = payload.workflow_json;

    // Apply UUID mapping if credential_map provided
    if (payload.credential_map) {
      workflowJson = this.applyCredentialMap(workflowJson, payload.credential_map);
    }

    const result = await this.n8nManager.createWorkflow(workflowJson);
    return result;
  }

  private async handleGetWorkflow(payload: { workflow_id: string }): Promise<any> {
    const workflow = await this.n8nManager.getWorkflow(payload.workflow_id);
    return { success: true, workflow };
  }

  private async handleUpdateWorkflow(payload: {
    workflow_id: string;
    workflow_json: any;
  }): Promise<any> {
    await this.n8nManager.updateWorkflow(payload.workflow_id, payload.workflow_json);
    return { success: true };
  }

  private async handleActivateWorkflow(payload: { workflow_id: string }): Promise<any> {
    await this.n8nManager.activateWorkflow(payload.workflow_id);
    return { success: true };
  }

  private async handleDeactivateWorkflow(payload: { workflow_id: string }): Promise<any> {
    await this.n8nManager.deactivateWorkflow(payload.workflow_id);
    return { success: true };
  }

  private async handleDeleteWorkflow(payload: { workflow_id: string }): Promise<any> {
    await this.n8nManager.deleteWorkflow(payload.workflow_id);
    return { success: true };
  }

  private async handleInjectCredential(payload: {
    credential_type: string;
    credential_name: string;
    encrypted_data: string;
  }): Promise<any> {
    const masterKey = process.env.INTERNAL_ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('INTERNAL_ENCRYPTION_KEY is not set — cannot decrypt credential');
    }

    const decryptedData = decryptCredential(
      payload.encrypted_data,
      this.config.workspaceId,
      masterKey
    ) as Record<string, any>;

    const credentialId = await this.n8nManager.createCredential({
      name: payload.credential_name,
      type: toN8nCredentialType(payload.credential_type),
      data: decryptedData,
    });

    return { credential_id: credentialId };
  }

  private async handleRotateCredential(payload: {
    credential_id: string;
    encrypted_data: string;
  }): Promise<any> {
    const masterKey = process.env.INTERNAL_ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('INTERNAL_ENCRYPTION_KEY is not set — cannot decrypt credential');
    }

    const decryptedData = decryptCredential(
      payload.encrypted_data,
      this.config.workspaceId,
      masterKey
    ) as Record<string, any>;

    await this.n8nManager.updateCredential(payload.credential_id, decryptedData);
    return { success: true };
  }

  private async handleRestartN8n(): Promise<any> {
    const result = await this.dockerManager.restartContainer();
    return result;
  }

  private async handlePullImage(payload: { image_name: string; tag: string }): Promise<any> {
    const success = await this.dockerManager.pullImage(payload.image_name, payload.tag);
    return { success };
  }

  private async handleSwapContainer(payload: { new_image_tag: string }): Promise<any> {
    const result = await this.dockerManager.swapContainer(payload.new_image_tag);
    return result;
  }

  private async handleGetLogs(payload: { lines?: number; since?: string }): Promise<any> {
    const logs = await this.dockerManager.getLogs(payload.lines || 100, payload.since);
    return { logs };
  }

  private async handleCollectMetrics(payload: { since?: string }): Promise<any> {
    const since = payload.since ? new Date(payload.since) : undefined;
    const metrics = await this.n8nManager.getMetrics(since);
    return metrics;
  }

  /**
   * Phase 64.B: DEPLOY CAMPAIGN WORKFLOWS
   * Deploys provider-specific workflows based on email_provider_config
   */
  private async handleDeployCampaignWorkflows(payload: WorkflowDeploymentRequest): Promise<any> {
    console.log('\n📧 Phase 64.B: Deploying campaign workflows...');
    console.log(`   Workspace: ${payload.workspace_id}`);
    console.log(`   Campaign: ${payload.campaign_name}`);

    // Inject the public n8n URL so templates can build opt-out/webhook links.
    // Callers may already supply it; if not, fall back to N8N_PUBLIC_URL env var
    // (the externally-reachable URL of the droplet's n8n instance) or N8N_URL.
    const enrichedPayload: WorkflowDeploymentRequest = {
      ...payload,
      n8n_instance_url:
        payload.n8n_instance_url ??
        process.env.N8N_PUBLIC_URL ??
        this.config.n8nUrl,
    };

    const result = await this.workflowDeployer.deployWorkflows(enrichedPayload);
    
    // If SMTP provider, update SMTP environment
    if (!result.success && result.error?.includes('smtp')) {
      console.log('   📧 SMTP provider detected, updating environment...');
      // The WorkflowDeployer will have already handled this via updateSMTPEnvironment
    }
    
    return result;
  }

  /**
   * Phase 64.B: SMTP SEND
   * Handles email sending via SMTP (called by n8n workflows)
   */
  private async handleSMTPSend(req: Request, res: Response): Promise<void> {
    if (!this.smtpService) {
      res.status(503).json({
        success: false,
        messageId: '',
        error: 'SMTP service not configured',
      });
      return;
    }

    try {
      const sendRequest: SendEmailRequest = req.body;
      const result = await this.smtpService.sendEmail(sendRequest);
      res.json(result);
    } catch (error) {
      console.error('SMTP send error:', error);
      res.status(500).json({
        success: false,
        messageId: '',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Phase 64.B: SMTP CHECK REPLY
   * Checks if recipient replied via IMAP (called by n8n workflows)
   */
  private async handleSMTPCheckReply(req: Request, res: Response): Promise<void> {
    if (!this.smtpService) {
      res.status(503).json({
        replied: false,
        replyCount: 0,
        error: 'SMTP service not configured',
      });
      return;
    }

    try {
      const checkRequest: CheckReplyRequest = {
        email: req.query.email as string,
        messageId: req.query.message_id as string,
      };

      if (!checkRequest.email || !checkRequest.messageId) {
        res.status(400).json({
          replied: false,
          replyCount: 0,
          error: 'Missing required query params: email, message_id',
        });
        return;
      }

      const result = await this.smtpService.checkReply(checkRequest);
      res.json(result);
    } catch (error) {
      console.error('SMTP check-reply error:', error);
      res.status(500).json({
        replied: false,
        replyCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * CREDENTIAL MAP APPLICATION
   * Replaces template UUIDs with tenant-specific UUIDs
   */
  private applyCredentialMap(
    workflowJson: any,
    credentialMap: Record<string, string>
  ): any {
    // Convert to string for replacement
    let workflowStr = JSON.stringify(workflowJson);

    // SEC-008: Replace each placeholder UUID using literal replaceAll
    // (avoids ReDoS from new RegExp with unsanitized input)
    for (const [placeholder, replacement] of Object.entries(credentialMap)) {
      workflowStr = workflowStr.replaceAll(placeholder, replacement);
    }

    // Parse back to object
    return JSON.parse(workflowStr);
  }

  /**
   * HEALTH REPORTING
   * Report health to Dashboard every 60 seconds
   */
  private startHealthReporting(): void {
    console.log('🩺 Starting health reporting (60s interval)...');

    // Report immediately
    this.reportHealth();

    // Then every 60 seconds
    this.heartbeatInterval = setInterval(() => {
      this.reportHealth();
    }, 60 * 1000);
  }

  private async reportHealth(): Promise<void> {
    try {
      const n8nHealth = await this.n8nManager.getHealth();
      const containerInfo = await this.dockerManager.getContainerInfo();
      const containerMetrics = await this.dockerManager.getContainerMetrics();

      const report: HealthReport = {
        workspace_id: this.config.workspaceId,
        droplet_id: this.config.dropletId,
        timestamp: new Date().toISOString(),
        n8n_status: n8nHealth.status,
        container_status: containerInfo?.status || 'unknown',
        memory_usage_mb: containerMetrics?.memory_usage_mb,
        cpu_percent: containerMetrics?.cpu_percent,
        uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      };

      // SEC-006: Send heartbeat as a handshake keep-alive call.
      // The dashboard's /api/sidecar/heartbeat route is a GET endpoint
      // used by the frontend to PING sidecars — it does not accept POSTs.
      // Instead, re-call /api/sidecar/handshake which upserts into
      // genesis.sidecar_registry and updates last_seen_at.
      const handshakeSecret = process.env.SIDECAR_HANDSHAKE_SECRET;
      const response = await axios.post(
        `${this.config.dashboardUrl}/api/sidecar/handshake`,
        {
          workspace_id: report.workspace_id,
          sidecar_url: `http://${await this.getDropletIp()}:${this.config.port}`,
          version: report.n8n_status,
          capabilities: [
            'deploy',
            ...(this.smtpService ? ['smtp'] : ['gmail']),
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(handshakeSecret ? { 'Authorization': `Bearer ${handshakeSecret}` } : {}),
          },
          timeout: 10000,
        }
      );

      // Check for pending commands in response
      if (response.data?.pending_commands?.length > 0) {
        console.log(`📥 Received ${response.data.pending_commands.length} pending commands`);
        // TODO: Process pending commands
      }
    } catch (error) {
      console.error('❌ Health report failed:', error instanceof Error ? error.message : String(error));
    }
  }

  // ==========================================================================
  // N8N BOOTSTRAP
  // ==========================================================================

  /**
   * Bootstrap n8n on first boot:
   *  1. Wait until n8n is reachable
   *  2. If owner setup has not been completed, run it via the internal REST API
   *  3. Create a static API key and store it in this.config / reinit N8nManager
   */
  private async bootstrapN8n(): Promise<void> {
    console.log('🔧 Bootstrapping n8n...');
    try {
      await this.waitForN8n();
      const setupNeeded = await this.isOwnerSetupNeeded();

      if (!setupNeeded) {
        console.log('✅ n8n owner already configured');
        if (!this.config.n8nApiKey) {
          console.warn('⚠️  No N8N_API_KEY in env and owner already set — some commands may fail.');
        }
        return;
      }

      console.log('   No owner found, running first-time setup...');
      const ownerEmail = process.env.N8N_OWNER_EMAIL || `admin@${this.config.workspaceId}.internal`;
      const ownerPassword = process.env.N8N_PASSWORD || process.env.N8N_OWNER_PASSWORD;

      if (!ownerPassword) {
        throw new Error('N8N_PASSWORD (or N8N_OWNER_PASSWORD) is not set — cannot bootstrap n8n owner');
      }

      const sessionCookie = await this.setupN8nOwner(ownerEmail, ownerPassword);
      const apiKey = await this.createN8nApiKey(sessionCookie);

      // Persist for this process lifetime; reinit manager with real key
      this.config.n8nApiKey = apiKey;
      this.n8nManager = new N8nManager(this.config.n8nUrl, apiKey);

      console.log('✅ n8n bootstrapped — API key acquired');
    } catch (err) {
      console.error('❌ n8n bootstrap failed:', err instanceof Error ? err.message : String(err));
      // Non-fatal: Sidecar can still serve some commands; log and continue
    }
  }

  /** Poll n8n /healthz until it responds 200 (max 10 min) */
  private async waitForN8n(maxWaitMs = 600_000, intervalMs = 5_000): Promise<void> {
    const deadline = Date.now() + maxWaitMs;
    let attempt = 0;
    while (Date.now() < deadline) {
      attempt++;
      try {
        await axios.get(`${this.config.n8nUrl}/healthz`, { timeout: 5000 });
        console.log(`   n8n healthy after ${attempt} poll(s)`);
        return;
      } catch {
        if (attempt % 12 === 0) {
          console.log(`   Still waiting for n8n... (${Math.round((Date.now() - (deadline - maxWaitMs)) / 1000)}s elapsed)`);
        }
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }
    throw new Error('n8n did not become healthy within 10 minutes');
  }

  /** Return true if the first-time owner setup wizard has not yet been completed */
  private async isOwnerSetupNeeded(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.config.n8nUrl}/rest/settings`, { timeout: 10_000 });
      return res.data?.data?.userManagement?.showSetupOnFirstLoad === true;
    } catch (err) {
      console.warn('   Could not check n8n settings:', err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  /** Call POST /rest/owner/setup and return the session cookie string */
  private async setupN8nOwner(email: string, password: string): Promise<string> {
    const res = await axios.post(
      `${this.config.n8nUrl}/rest/owner/setup`,
      {
        email,
        firstName: 'Genesis',
        lastName: 'Admin',
        password,
        agree: true,
      },
      {
        timeout: 30_000,
        validateStatus: (s) => s < 500,
      }
    );

    if (res.status !== 200) {
      throw new Error(`Owner setup returned HTTP ${res.status}: ${JSON.stringify(res.data)}`);
    }

    // Extract Set-Cookie header
    const setCookie = res.headers['set-cookie'];
    if (!setCookie || setCookie.length === 0) {
      throw new Error('Owner setup succeeded but no Set-Cookie header returned');
    }

    // Join all cookie parts as a single Cookie header value
    return setCookie.map((c: string) => c.split(';')[0]).join('; ');
  }

  /** Create a static n8n API key using the owner session cookie; return the key string */
  private async createN8nApiKey(sessionCookie: string): Promise<string> {
    const res = await axios.post(
      `${this.config.n8nUrl}/rest/users/me/api-key`,
      {},
      {
        headers: { Cookie: sessionCookie },
        timeout: 15_000,
        validateStatus: (s) => s < 500,
      }
    );

    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`API key creation returned HTTP ${res.status}: ${JSON.stringify(res.data)}`);
    }

    const apiKey: string = res.data?.data?.apiKey ?? res.data?.apiKey;
    if (!apiKey) {
      throw new Error(`Unexpected API key response shape: ${JSON.stringify(res.data)}`);
    }

    return apiKey;
  }

  /**
   * HANDSHAKE
   * Perform initial handshake with Dashboard (one-time)
   */
  private async performHandshake(): Promise<void> {
    try {
      console.log('🤝 Performing handshake with Dashboard...');

      // Check if we already have a sidecar token (skip handshake if so)
      if (this.config.sidecarToken && this.config.sidecarToken !== 'PENDING') {
        console.log('✅ Sidecar token already exists, skipping handshake');
        return;
      }

      // Get droplet IP (public)
      const dropletIp = await this.getDropletIp();

      // Get n8n version
      const n8nHealth = await this.n8nManager.getHealth();

      // SEC-005: Send handshake to dashboard with proper auth + matching contract.
      // Dashboard expects: { workspace_id, sidecar_url, version?, capabilities? }
      // Dashboard auth: Authorization: Bearer <SIDECAR_HANDSHAKE_SECRET>
      const sidecarUrl = `http://${dropletIp}:${this.config.port}`;
      const handshakeSecret = process.env.SIDECAR_HANDSHAKE_SECRET;

      if (!handshakeSecret) {
        console.warn('⚠️  SIDECAR_HANDSHAKE_SECRET not set — handshake will be rejected by dashboard');
      }

      const response = await axios.post(
        `${this.config.dashboardUrl}/api/sidecar/handshake`,
        {
          workspace_id: this.config.workspaceId,
          sidecar_url: sidecarUrl,
          version: n8nHealth.version || 'unknown',
          capabilities: [
            'deploy',
            ...(this.smtpService ? ['smtp'] : ['gmail']),
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(handshakeSecret ? { 'Authorization': `Bearer ${handshakeSecret}` } : {}),
          },
          timeout: 30000,
        }
      );

      if (!response.data?.success) {
        throw new Error(`Handshake rejected: ${response.data?.error || 'unknown'}`);
      }

      // Dashboard returns { success, registered_at, workspace_id, message }
      // Use the workspace_id as a lightweight "token" for heartbeats since
      // the dashboard identifies the sidecar by workspace_id in the registry.
      this.config.sidecarToken = this.config.workspaceId;

      console.log('✅ Handshake complete, received sidecar token');

      // SEC-002: Persist token so restarts don't require re-handshake
      this.persistToken(this.config.sidecarToken);
    } catch (error) {
      console.error('❌ Handshake failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  // ============================================================================
  // SEC-002 — TOKEN PERSISTENCE
  // ============================================================================

  /**
   * Write the sidecar token to disk so it survives process restarts.
   * Errors are non-fatal: a failed write is logged and execution continues.
   */
  private persistToken(token: string): void {
    try {
      fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
      fs.writeFileSync(TOKEN_FILE, token, { encoding: 'utf8', mode: 0o600 });
      console.log(`💾 Sidecar token persisted to ${TOKEN_FILE}`);
    } catch (err) {
      console.warn(
        `[SEC-002] Could not persist sidecar token to ${TOKEN_FILE}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  /**
   * Read the previously-persisted sidecar token from disk.
   * Returns null on any error (missing file, corrupt contents, etc.).
   */
  private loadPersistedToken(): string | null {
    try {
      const token = fs.readFileSync(TOKEN_FILE, { encoding: 'utf8' }).trim();
      if (token && token !== 'PENDING') {
        return token;
      }
      return null;
    } catch {
      // File not found or unreadable — first boot, normal condition
      return null;
    }
  }

  /**
   * UTILITY: Get droplet IP
   */
  private async getDropletIp(): Promise<string> {
    try {
      // Try to get public IP from DigitalOcean metadata service
      const response = await axios.get('http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address', {
        timeout: 5000,
      });
      return response.data.trim();
    } catch (error) {
      console.warn('Failed to get IP from metadata service, using fallback');
      // Fallback: use external IP service
      const response = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000,
      });
      return response.data.ip;
    }
  }
}

/**
 * MAIN ENTRY POINT
 */
if (require.main === module) {
  // Load config from environment
  const config: SidecarConfig = {
    workspaceId: process.env.WORKSPACE_ID || '',
    dropletId: process.env.DROPLET_ID || '',
    dashboardUrl: process.env.DASHBOARD_URL || '',
    sidecarToken: process.env.SIDECAR_TOKEN || 'PENDING',
    publicKey: process.env.DASHBOARD_PUBLIC_KEY || '',
    n8nUrl: process.env.N8N_URL || 'http://localhost:5678',
    n8nApiKey: process.env.N8N_API_KEY || '',
    n8nContainerName: process.env.N8N_CONTAINER_NAME || 'n8n',
    port: parseInt(process.env.SIDECAR_PORT || '3100', 10),
    // Phase 64.B: SMTP configuration (optional)
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFromEmail: process.env.SMTP_FROM_EMAIL,
    smtpFromName: process.env.SMTP_FROM_NAME,
    // SEC-001: shared SMTP webhook secret (set this on the droplet at deploy-time)
    smtpWebhookSecret: process.env.SMTP_WEBHOOK_SECRET,
  };

  // Validate config
  if (!config.workspaceId || !config.dropletId || !config.dashboardUrl) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Start agent
  const agent = new SidecarAgent(config);

  agent.start().catch((error) => {
    console.error('❌ Failed to start Sidecar Agent:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM');
    await agent.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT');
    await agent.stop();
    process.exit(0);
  });
}

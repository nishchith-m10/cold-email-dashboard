/**
 * INTEGRATION ADAPTERS
 *
 * Adapts the real production implementations (DropletFactory, HttpSidecarClient)
 * to the IgnitionOrchestrator's interfaces.
 *
 * The orchestrator was designed with simple interfaces (DropletFactory,
 * SidecarClient, WorkflowDeployer) but the real implementations have
 * different method signatures and construction patterns.  These adapters
 * bridge that gap so `buildOrchestrator()` can conditionally wire real
 * implementations when env vars (DO_API_TOKEN, GENESIS_JWT_PRIVATE_KEY)
 * are present.
 *
 * @see ignition-orchestrator.ts — interface definitions
 * @see droplet-factory.ts — real DropletFactory (Phase 50)
 * @see http-sidecar-client.ts — real HttpSidecarClient (JWT-signed)
 * @see POST_GENESIS_EXECUTION_PLAN.md — D1-004
 */

import type {
  DropletFactory as DropletFactoryInterface,
  SidecarClient,
} from './ignition-orchestrator';

// ============================================
// DROPLET FACTORY ADAPTER
// ============================================

/**
 * Adapts the Phase 50 `DropletFactory` class to the orchestrator's
 * `DropletFactory` interface.
 *
 * Differences:
 *   - Real class: `provisionDroplet(ProvisioningRequest)` → `ProvisioningResult`
 *   - Interface:  `provision({ workspace_id, ... })` → `{ success, droplet_id, ip_address }`
 *   - Real class: `destroyDroplet(dropletId: number)` → `void`
 *   - Interface:  `terminate(dropletId: string)` → `{ success: boolean }`
 */
export class DropletFactoryAdapter implements DropletFactoryInterface {
  // Lazy-imported to avoid pulling in DO SDK at module load time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private realFactory: any = null;

  private async getFactory() {
    if (!this.realFactory) {
      const { DropletFactory } = await import('./droplet-factory');
      this.realFactory = new DropletFactory();
    }
    return this.realFactory;
  }

  async provision(config: {
    workspace_id: string;
    workspace_slug: string;
    region: string;
    size_slug: string;
  }): Promise<{
    success: boolean;
    droplet_id?: string;
    ip_address?: string;
    error?: string;
  }> {
    const factory = await this.getFactory();
    const result = await factory.provisionDroplet({
      workspaceId: config.workspace_id,
      workspaceSlug: config.workspace_slug,
      region: config.region,
      sizeSlug: config.size_slug,
    });

    return {
      success: result.success,
      droplet_id: result.dropletId?.toString(),
      ip_address: result.ipAddress,
      error: result.error,
    };
  }

  async terminate(dropletId: string): Promise<{ success: boolean }> {
    try {
      const factory = await this.getFactory();
      await factory.destroyDroplet(parseInt(dropletId, 10));
      return { success: true };
    } catch (error) {
      console.error('[DropletFactoryAdapter] terminate failed:', error);
      return { success: false };
    }
  }
}

// ============================================
// DEFERRED HTTP SIDECAR CLIENT
// ============================================

/**
 * A SidecarClient that defers HttpSidecarClient creation until the first
 * `sendCommand` call.
 *
 * Problem: HttpSidecarClient requires `dropletId` at construction for JWT
 * signing, but the dropletId is only known after droplet provisioning
 * (Step 2 of ignition).  The orchestrator creates the sidecar client once
 * in `buildOrchestrator()` before provisioning starts.
 *
 * Solution: Store the `workspaceId` and `privateKey` at construction time.
 * On `sendCommand`, derive `dropletId` from the dropletIp and lazily create
 * the HttpSidecarClient for that droplet.
 *
 * The dropletIp-to-client mapping is cached so subsequent commands to the
 * same droplet reuse the same client (and JWT signer).
 */
export class DeferredHttpSidecarClient implements SidecarClient {
  private workspaceId: string;
  private privateKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clients: Map<string, any> = new Map();

  constructor(workspaceId: string, privateKey?: string) {
    this.workspaceId = workspaceId;
    this.privateKey = privateKey || process.env.GENESIS_JWT_PRIVATE_KEY || '';
  }

  async sendCommand(
    dropletIp: string,
    command: { action: string; payload: unknown }
  ): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }> {
    // Lazily create an HttpSidecarClient for this droplet
    if (!this.clients.has(dropletIp)) {
      const { HttpSidecarClient } = await import('./http-sidecar-client');
      // Use droplet IP as the droplet_id for JWT claims — the sidecar verifies
      // the JWT signature, not the droplet_id value itself.
      const client = new HttpSidecarClient({
        workspaceId: this.workspaceId,
        dropletId: dropletIp,
        privateKey: this.privateKey,
      });
      this.clients.set(dropletIp, client);
    }

    const client = this.clients.get(dropletIp)!;
    return client.sendCommand(dropletIp, command);
  }
}

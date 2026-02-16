/**
 * PHASE 73: Credential Inject Worker
 *
 * Processes credential-inject jobs from BullMQ.
 * Securely pushes encrypted credential bundles to Sidecar agents.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5
 */

import type { ControlPlaneConfig, Logger } from '../config';
import type { CredentialInjectJob } from '../../../packages/shared/types';

/**
 * Process a credential injection job.
 * Pushes credentials to the target sidecar agent securely.
 * Idempotent — sidecar overwrites existing credentials for the same type.
 */
export async function processCredentialInject(
  data: CredentialInjectJob,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<void> {
  const { workspace_id, credentials } = data;

  logger.info(
    { workspace_id, credentialCount: credentials.length },
    'Processing credential injection'
  );

  // 1. Resolve sidecar URL
  const sidecarUrl = await getSidecarUrl(workspace_id, config);
  if (!sidecarUrl) {
    throw new Error(`No sidecar found for workspace ${workspace_id}`);
  }

  // 2. Push each credential to sidecar
  for (const cred of credentials) {
    await pushCredentials(sidecarUrl, cred.type, cred.encrypted_data, config, logger);

    // 3. Verify credential was applied
    const verified = await verifyCredentials(sidecarUrl, cred.type, config, logger);
    if (!verified) {
      throw new Error(
        `Credential verification failed for ${cred.type} on workspace ${workspace_id}`
      );
    }

    // 4. Record credential update timestamp
    await recordCredentialUpdate(workspace_id, cred.type, config);
  }

  logger.info(
    { workspace_id, credentialCount: credentials.length },
    'Credential injection completed successfully'
  );
}

// ============================================
// HELPERS
// ============================================

async function getSidecarUrl(
  workspaceId: string,
  config: ControlPlaneConfig
): Promise<string | null> {
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/droplet_health?workspace_id=eq.${workspaceId}&select=droplet_ip`,
    {
      headers: {
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
      },
    }
  );

  if (!response.ok) return null;
  const rows = (await response.json()) as { droplet_ip: string }[];
  if (!rows || rows.length === 0) return null;

  return `http://${rows[0].droplet_ip}:3001`;
}

async function pushCredentials(
  sidecarUrl: string,
  credentialType: string,
  encryptedPayload: string,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<void> {
  logger.info({ credentialType }, 'Pushing credentials to sidecar');

  const response = await fetch(`${sidecarUrl}/api/credentials/inject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.supabaseServiceKey}`,
    },
    body: JSON.stringify({
      credential_type: credentialType,
      encrypted_payload: encryptedPayload,
      timestamp: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Failed to push credentials to sidecar: ${response.status} — ${text}`
    );
  }
}

async function verifyCredentials(
  sidecarUrl: string,
  credentialType: string,
  config: ControlPlaneConfig,
  logger: Logger
): Promise<boolean> {
  try {
    const response = await fetch(
      `${sidecarUrl}/api/credentials/verify?type=${encodeURIComponent(credentialType)}`,
      {
        headers: {
          Authorization: `Bearer ${config.supabaseServiceKey}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      logger.warn(
        { credentialType, status: response.status },
        'Credential verification endpoint returned non-OK'
      );
      return false;
    }

    const body = (await response.json()) as { verified: boolean };
    return body.verified === true;
  } catch (error) {
    logger.error(
      { credentialType, error },
      'Error during credential verification'
    );
    return false;
  }
}

async function recordCredentialUpdate(
  workspaceId: string,
  credentialType: string,
  config: ControlPlaneConfig
): Promise<void> {
  await fetch(`${config.supabaseUrl}/rest/v1/credential_updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabaseServiceKey,
      Authorization: `Bearer ${config.supabaseServiceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      credential_type: credentialType,
      updated_at: new Date().toISOString(),
    }),
  });
}

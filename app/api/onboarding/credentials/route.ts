/**
 * PHASE 64: Credentials Management API
 * 
 * GET /api/onboarding/credentials - Get credential by type
 * POST /api/onboarding/credentials - Store credential
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { EncryptionService, CredentialVaultService } from '@/lib/genesis/phase64/credential-vault-service';
import { CredentialValidationService } from '@/lib/genesis/phase64/credential-validation-service';

// Lazy-initialize services to avoid throwing at module load time
let encryption: EncryptionService | null = null;
let vaultService: CredentialVaultService | null = null;
let validationService: CredentialValidationService | null = null;

function getServices() {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return { error: 'ENCRYPTION_MASTER_KEY not configured. Add it to your .env.local file.' };
  }
  
  if (!encryption) {
    encryption = new EncryptionService(masterKey);
  }
  if (!vaultService) {
    vaultService = new CredentialVaultService({
      encryptionService: encryption,
      supabaseClient: supabaseAdmin,
    });
  }
  if (!validationService) {
    validationService = new CredentialValidationService();
  }
  
  return { encryption, vaultService, validationService };
}

/**
 * GET - Get credential by workspace and type
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const services = getServices();
    if ('error' in services) {
      return NextResponse.json({ error: services.error }, { status: 500 });
    }
    const { vaultService: vault } = services;

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');
    const type = searchParams.get('type');

    if (!workspaceId || !type) {
      return NextResponse.json(
        { error: 'workspace_id and type required' },
        { status: 400 }
      );
    }

    // Handle relevance_config specially
    if (type === 'relevance_config') {
      const result = await vault!.getRelevanceConfig(workspaceId);
      if (!result.success) {
        return NextResponse.json({ config: null });
      }
      // Don't return the auth token for security
      const safeConfig = {
        ...result.config,
        authToken: undefined, // Never return the token
      };
      return NextResponse.json({ config: safeConfig });
    }

    // For other types, check if credential exists
    const hasValid = await vault!.hasValidCredential(workspaceId, type as any);
    return NextResponse.json({ exists: hasValid });
  } catch (error) {
    console.error('Credentials GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Store a new credential
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const services = getServices();
    if ('error' in services) {
      return NextResponse.json({ error: services.error }, { status: 500 });
    }
    const { vaultService: vault, validationService: validator } = services;

    const body: any = await req.json();
    const { workspaceId, type, value, metadata, config } = body;

    // Handle relevance_config specially - it has config object instead of value
    if (type === 'relevance_config') {
      if (!workspaceId || !config) {
        return NextResponse.json(
          { error: 'workspaceId and config required for relevance_config' },
          { status: 400 }
        );
      }

      // Validate the configuration
      const validationResult = await validator!.validateCredential(type, '', config);
      if (!validationResult.valid) {
        return NextResponse.json(
          { error: validationResult.error || 'Invalid configuration' },
          { status: 400 }
        );
      }

      // Store the relevance config
      const result = await vault!.storeRelevanceConfig(workspaceId, config);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        credentialId: result.credentialId,
      });
    }

    if (!workspaceId || !type || !value) {
      return NextResponse.json(
        { error: 'workspaceId, type, and value required' },
        { status: 400 }
      );
    }

    // TODO: Validate user has access to workspace

    // Validate credential before storing
    const validationResult = await validator!.validateCredential(type, value, metadata);

    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error || 'Invalid credential' },
        { status: 400 }
      );
    }

    // Store credential based on type
    let result;

    if (type === 'calendly_url') {
      result = await vault!.storeCalendlyUrl(workspaceId, value, true);
    } else if (type.endsWith('_oauth')) {
      // OAuth credentials come from callback, not direct POST
      return NextResponse.json({ error: 'OAuth credentials must come from callback' }, { status: 400 });
    } else {
      result = await vault!.storeApiKeyCredential(
        workspaceId,
        type,
        value,
        metadata
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Mark as validated
    if (result.credentialId) {
      await vault!.updateCredentialStatus(result.credentialId, 'valid', new Date());
    }

    return NextResponse.json({
      success: true,
      credentialId: result.credentialId,
    });
  } catch (error) {
    console.error('Credentials POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

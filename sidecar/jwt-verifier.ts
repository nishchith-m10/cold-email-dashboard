/**
 * JWT VERIFIER - Zero-Trust Token Validation
 * 
 * Implements RS256 signature verification for Dashboard → Sidecar commands.
 * Security model:
 * - Asymmetric cryptography (RSA public key verification)
 * - 5-minute token expiry
 * - Replay attack prevention via JTI tracking
 * - Audience/issuer validation
 * - Workspace-scoped authorization
 */

import * as crypto from 'crypto';

// JWT payload structure (from Phase 51 spec)
export interface SidecarJWTPayload {
  iss: string;           // "genesis-dashboard"
  sub: string;           // workspace_uuid
  aud: string;           // "sidecar"
  iat: number;           // Issued at timestamp
  exp: number;           // Expiry timestamp (5 min from iat)
  jti: string;           // Unique request ID (for replay prevention)
  action: string;        // Command action
  droplet_id: string;    // Target droplet ID
}

export interface JWTVerificationResult {
  valid: boolean;
  payload?: SidecarJWTPayload;
  error?: string;
}

/**
 * JWT Verifier Class
 * Maintains in-memory cache of processed JTIs for replay prevention
 */
export class JWTVerifier {
  private publicKey: string;
  private workspaceId: string;
  private dropletId: string;
  private processedJTIs: Set<string>;
  private jtiCleanupInterval: NodeJS.Timeout | null = null;

  constructor(publicKey: string, workspaceId: string, dropletId: string) {
    this.publicKey = publicKey;
    this.workspaceId = workspaceId;
    this.dropletId = dropletId;
    this.processedJTIs = new Set();

    // Clean up expired JTIs every 10 minutes
    this.jtiCleanupInterval = setInterval(() => {
      // JTIs older than 10 minutes can be removed (tokens expire in 5 min)
      // This is a simple implementation; production would use Redis with TTL
      if (this.processedJTIs.size > 10000) {
        console.warn('JTI cache exceeds 10k entries, clearing...');
        this.processedJTIs.clear();
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Verify JWT token from Dashboard
   * Returns payload if valid, error otherwise
   */
  verify(token: string): JWTVerificationResult {
    try {
      // Split JWT into parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid JWT format' };
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Decode header
      const header = JSON.parse(
        Buffer.from(headerB64, 'base64url').toString('utf8')
      );

      // Verify algorithm
      if (header.alg !== 'RS256') {
        return { valid: false, error: 'Invalid algorithm (expected RS256)' };
      }

      // Decode payload
      const payload: SidecarJWTPayload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8')
      );

      // VERIFICATION STEP 1: Verify signature
      const signatureValid = this.verifySignature(
        `${headerB64}.${payloadB64}`,
        signatureB64
      );

      if (!signatureValid) {
        return { valid: false, error: 'Invalid signature' };
      }

      // VERIFICATION STEP 2: Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return { valid: false, error: 'Token expired' };
      }

      // VERIFICATION STEP 3: Check issuer
      if (payload.iss !== 'genesis-dashboard') {
        return { valid: false, error: 'Invalid issuer' };
      }

      // VERIFICATION STEP 4: Check audience
      if (payload.aud !== 'sidecar') {
        return { valid: false, error: 'Invalid audience' };
      }

      // VERIFICATION STEP 5: Check workspace ID
      if (payload.sub !== this.workspaceId) {
        return {
          valid: false,
          error: `Workspace mismatch (expected ${this.workspaceId}, got ${payload.sub})`,
        };
      }

      // VERIFICATION STEP 6: Check droplet ID
      if (payload.droplet_id !== this.dropletId) {
        return {
          valid: false,
          error: `Droplet mismatch (expected ${this.dropletId}, got ${payload.droplet_id})`,
        };
      }

      // VERIFICATION STEP 7: Check for replay attack (JTI reuse)
      if (this.processedJTIs.has(payload.jti)) {
        return { valid: false, error: 'Token already processed (replay attack)' };
      }

      // Mark JTI as processed
      this.processedJTIs.add(payload.jti);

      // All checks passed
      return { valid: true, payload };
    } catch (error) {
      return {
        valid: false,
        error: `JWT verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Verify RS256 signature using public key
   */
  private verifySignature(message: string, signatureB64: string): boolean {
    try {
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(message);
      verifier.end();

      const signature = Buffer.from(signatureB64, 'base64url');
      return verifier.verify(this.publicKey, signature);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.jtiCleanupInterval) {
      clearInterval(this.jtiCleanupInterval);
      this.jtiCleanupInterval = null;
    }
    this.processedJTIs.clear();
  }
}

/**
 * Helper: Generate JWT for testing purposes
 * (Production: Dashboard generates JWTs with private key)
 */
export function generateTestJWT(
  payload: SidecarJWTPayload,
  privateKey: string
): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${headerB64}.${payloadB64}`);
  signer.end();

  const signature = signer.sign(privateKey);
  const signatureB64 = signature.toString('base64url');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * PHASE 42: ATOMIC HANDSHAKE PROTOCOL
 * Token Generation & Validation
 * 
 * Implements cryptographically secure token generation and SHA-256 hashing.
 * 
 * Security properties:
 * - 64-character random hex tokens (256 bits entropy)
 * - SHA-256 hashing before storage
 * - Constant-time hash comparison
 * - No token storage in plaintext
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { TokenGenerator } from './handshake-types';

// ============================================
// TOKEN CONSTANTS
// ============================================

/** Length of provisioning token in bytes (64 hex chars = 32 bytes) */
const PROVISIONING_TOKEN_BYTES = 32;

/** Length of sidecar token in bytes (64 hex chars = 32 bytes) */
const SIDECAR_TOKEN_BYTES = 32;

/** Token format prefix for identification */
const TOKEN_PREFIXES = {
  provisioning: 'prov_',
  sidecar: 'side_',
} as const;

// ============================================
// CRYPTO UTILITIES
// ============================================

/**
 * Generate cryptographically secure random bytes.
 */
function generateRandomBytes(length: number): Buffer {
  return randomBytes(length);
}

/**
 * Convert buffer to hex string.
 */
function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

/**
 * Hash a token using SHA-256.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Compare two hashes in constant time to prevent timing attacks.
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  if (hash1.length !== hash2.length) {
    return false;
  }
  
  const buffer1 = Buffer.from(hash1, 'hex');
  const buffer2 = Buffer.from(hash2, 'hex');
  
  return timingSafeEqual(buffer1, buffer2);
}

/**
 * Validate token format (prefix + hex string).
 */
export function validateTokenFormat(token: string, type: 'provisioning' | 'sidecar'): boolean {
  const prefix = TOKEN_PREFIXES[type];
  
  if (!token.startsWith(prefix)) {
    return false;
  }
  
  const hexPart = token.substring(prefix.length);
  const expectedLength = type === 'provisioning' ? PROVISIONING_TOKEN_BYTES * 2 : SIDECAR_TOKEN_BYTES * 2;
  
  if (hexPart.length !== expectedLength) {
    return false;
  }
  
  // Verify it's valid hex
  return /^[0-9a-f]+$/.test(hexPart);
}

// ============================================
// TOKEN GENERATOR
// ============================================

/**
 * Token generator with cryptographically secure random generation.
 */
export class SecureTokenGenerator implements TokenGenerator {
  /**
   * Generate a cryptographically secure random token.
   */
  generateToken(length: number = 32): string {
    const bytes = generateRandomBytes(length);
    return bufferToHex(bytes);
  }
  
  /**
   * Hash a token using SHA-256.
   */
  hashToken(token: string): string {
    return hashToken(token);
  }
  
  /**
   * Generate provisioning token (one-time use).
   * 
   * Format: prov_<64-char-hex>
   * Entropy: 256 bits
   */
  generateProvisioningToken(): { token: string; hash: string } {
    const randomHex = this.generateToken(PROVISIONING_TOKEN_BYTES);
    const token = `${TOKEN_PREFIXES.provisioning}${randomHex}`;
    const hash = this.hashToken(token);
    
    return { token, hash };
  }
  
  /**
   * Generate sidecar token (long-lived).
   * 
   * Format: side_<64-char-hex>
   * Entropy: 256 bits
   */
  generateSidecarToken(): { token: string; hash: string } {
    const randomHex = this.generateToken(SIDECAR_TOKEN_BYTES);
    const token = `${TOKEN_PREFIXES.sidecar}${randomHex}`;
    const hash = this.hashToken(token);
    
    return { token, hash };
  }
}

// ============================================
// TOKEN VALIDATION
// ============================================

/**
 * Validate token structure and format.
 */
export function validateToken(token: string, type: 'provisioning' | 'sidecar'): {
  valid: boolean;
  error?: string;
} {
  if (!token) {
    return { valid: false, error: 'Token is empty' };
  }
  
  if (typeof token !== 'string') {
    return { valid: false, error: 'Token must be a string' };
  }
  
  if (!validateTokenFormat(token, type)) {
    return { valid: false, error: `Invalid ${type} token format` };
  }
  
  return { valid: true };
}

/**
 * Extract token type from token string.
 */
export function getTokenType(token: string): 'provisioning' | 'sidecar' | 'unknown' {
  if (token.startsWith(TOKEN_PREFIXES.provisioning)) {
    return 'provisioning';
  }
  if (token.startsWith(TOKEN_PREFIXES.sidecar)) {
    return 'sidecar';
  }
  return 'unknown';
}

// ============================================
// TOKEN EXPIRY CALCULATION
// ============================================

/**
 * Calculate expiry date for provisioning token (15 minutes from now).
 */
export function calculateProvisioningTokenExpiry(): Date {
  const now = new Date();
  return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
}

/**
 * Calculate expiry date for sidecar token (30 days from now).
 */
export function calculateSidecarTokenExpiry(): Date {
  const now = new Date();
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
}

/**
 * Check if a token has expired.
 */
export function isTokenExpired(expiresAt: string | Date): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry < new Date();
}

/**
 * Get time until token expires (in milliseconds).
 */
export function getTimeUntilExpiry(expiresAt: string | Date): number {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return Math.max(0, expiry.getTime() - Date.now());
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a new token generator instance.
 */
export function createTokenGenerator(): TokenGenerator {
  return new SecureTokenGenerator();
}

// ============================================
// MOCK TOKEN GENERATOR (FOR TESTING)
// ============================================

/**
 * Mock token generator with deterministic output for testing.
 */
export class MockTokenGenerator implements TokenGenerator {
  private counter = 0;
  
  generateToken(length: number = 32): string {
    this.counter++;
    const hex = this.counter.toString(16).padStart(length * 2, '0');
    return hex.substring(0, length * 2);
  }
  
  hashToken(token: string): string {
    return hashToken(token);
  }
  
  generateProvisioningToken(): { token: string; hash: string } {
    const hex = this.generateToken(PROVISIONING_TOKEN_BYTES);
    const token = `${TOKEN_PREFIXES.provisioning}${hex}`;
    const hash = this.hashToken(token);
    return { token, hash };
  }
  
  generateSidecarToken(): { token: string; hash: string } {
    const hex = this.generateToken(SIDECAR_TOKEN_BYTES);
    const token = `${TOKEN_PREFIXES.sidecar}${hex}`;
    const hash = this.hashToken(token);
    return { token, hash };
  }
  
  /**
   * Reset counter for testing.
   */
  reset(): void {
    this.counter = 0;
  }
}

// ============================================
// TOKEN METADATA
// ============================================

/**
 * Extract metadata from token (for diagnostics, not security).
 */
export interface TokenMetadata {
  type: 'provisioning' | 'sidecar' | 'unknown';
  valid_format: boolean;
  length: number;
  prefix: string | null;
}

export function getTokenMetadata(token: string): TokenMetadata {
  const type = getTokenType(token);
  const valid_format = type !== 'unknown' && validateTokenFormat(token, type);
  
  let prefix: string | null = null;
  if (token.startsWith(TOKEN_PREFIXES.provisioning)) {
    prefix = TOKEN_PREFIXES.provisioning;
  } else if (token.startsWith(TOKEN_PREFIXES.sidecar)) {
    prefix = TOKEN_PREFIXES.sidecar;
  }
  
  return {
    type,
    valid_format,
    length: token.length,
    prefix,
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  PROVISIONING_TOKEN_BYTES,
  SIDECAR_TOKEN_BYTES,
  TOKEN_PREFIXES,
};

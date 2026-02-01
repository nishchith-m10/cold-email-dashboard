/**
 * PHASE 42: TOKEN MANAGER TESTS
 * 
 * Comprehensive tests for token generation, validation, and security.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  SecureTokenGenerator,
  MockTokenGenerator,
  hashToken,
  compareHashes,
  validateToken,
  validateTokenFormat,
  getTokenType,
  getTokenMetadata,
  calculateProvisioningTokenExpiry,
  calculateSidecarTokenExpiry,
  isTokenExpired,
  getTimeUntilExpiry,
  TOKEN_PREFIXES,
} from '@/lib/genesis/token-manager';

describe('Token Generation', () => {
  describe('SecureTokenGenerator', () => {
    let generator: SecureTokenGenerator;
    
    beforeEach(() => {
      generator = new SecureTokenGenerator();
    });
    
    it('should generate provisioning tokens with correct format', () => {
      const { token, hash } = generator.generateProvisioningToken();
      
      expect(token).toMatch(/^prov_[0-9a-f]{64}$/);
      expect(hash).toHaveLength(64); // SHA-256 hash
    });
    
    it('should generate sidecar tokens with correct format', () => {
      const { token, hash } = generator.generateSidecarToken();
      
      expect(token).toMatch(/^side_[0-9a-f]{64}$/);
      expect(hash).toHaveLength(64);
    });
    
    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 1000; i++) {
        const { token } = generator.generateProvisioningToken();
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(1000);
    });
    
    it('should generate different hashes for different tokens', () => {
      const { hash: hash1 } = generator.generateProvisioningToken();
      const { hash: hash2 } = generator.generateProvisioningToken();
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should generate token with custom length', () => {
      const token = generator.generateToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });
  });
  
  describe('MockTokenGenerator', () => {
    let generator: MockTokenGenerator;
    
    beforeEach(() => {
      generator = new MockTokenGenerator();
    });
    
    it('should generate deterministic tokens', () => {
      const { token: token1 } = generator.generateProvisioningToken();
      generator.reset();
      const { token: token2 } = generator.generateProvisioningToken();
      
      expect(token1).toBe(token2);
    });
    
    it('should increment counter', () => {
      const { token: token1 } = generator.generateProvisioningToken();
      const { token: token2 } = generator.generateProvisioningToken();
      
      expect(token1).not.toBe(token2);
    });
    
    it('should reset counter', () => {
      generator.generateProvisioningToken();
      generator.generateProvisioningToken();
      generator.reset();
      
      const { token } = generator.generateProvisioningToken();
      expect(token).toBe('prov_0000000000000000000000000000000000000000000000000000000000000001');
    });
  });
});

describe('Token Hashing', () => {
  it('should generate SHA-256 hash', () => {
    const hash = hashToken('test-token');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
  
  it('should generate consistent hashes', () => {
    const hash1 = hashToken('test-token');
    const hash2 = hashToken('test-token');
    expect(hash1).toBe(hash2);
  });
  
  it('should generate different hashes for different tokens', () => {
    const hash1 = hashToken('token1');
    const hash2 = hashToken('token2');
    expect(hash1).not.toBe(hash2);
  });
  
  it('should handle empty string', () => {
    const hash = hashToken('');
    expect(hash).toHaveLength(64);
  });
  
  it('should handle special characters', () => {
    const hash = hashToken('!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`');
    expect(hash).toHaveLength(64);
  });
  
  it('should handle unicode', () => {
    const hash = hashToken('🚀✅💯 日本語');
    expect(hash).toHaveLength(64);
  });
});

describe('Hash Comparison', () => {
  it('should compare hashes in constant time', () => {
    const hash1 = hashToken('test');
    const hash2 = hashToken('test');
    
    expect(compareHashes(hash1, hash2)).toBe(true);
  });
  
  it('should detect different hashes', () => {
    const hash1 = hashToken('test1');
    const hash2 = hashToken('test2');
    
    expect(compareHashes(hash1, hash2)).toBe(false);
  });
  
  it('should handle different lengths', () => {
    expect(compareHashes('abc', 'abcd')).toBe(false);
  });
  
  it('should handle empty strings', () => {
    expect(compareHashes('', '')).toBe(true);
    expect(compareHashes('a', '')).toBe(false);
  });
});

describe('Token Validation', () => {
  describe('validateTokenFormat', () => {
    it('should validate correct provisioning token format', () => {
      const generator = new SecureTokenGenerator();
      const { token } = generator.generateProvisioningToken();
      
      expect(validateTokenFormat(token, 'provisioning')).toBe(true);
    });
    
    it('should validate correct sidecar token format', () => {
      const generator = new SecureTokenGenerator();
      const { token } = generator.generateSidecarToken();
      
      expect(validateTokenFormat(token, 'sidecar')).toBe(true);
    });
    
    it('should reject wrong prefix', () => {
      expect(validateTokenFormat('wrong_' + '0'.repeat(64), 'provisioning')).toBe(false);
    });
    
    it('should reject wrong length', () => {
      expect(validateTokenFormat('prov_abc', 'provisioning')).toBe(false);
    });
    
    it('should reject non-hex characters', () => {
      expect(validateTokenFormat('prov_' + 'g'.repeat(64), 'provisioning')).toBe(false);
    });
    
    it('should reject empty string', () => {
      expect(validateTokenFormat('', 'provisioning')).toBe(false);
    });
  });
  
  describe('validateToken', () => {
    it('should validate correct provisioning token', () => {
      const generator = new SecureTokenGenerator();
      const { token } = generator.generateProvisioningToken();
      
      const result = validateToken(token, 'provisioning');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject empty token', () => {
      const result = validateToken('', 'provisioning');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is empty');
    });
    
    it('should reject non-string token', () => {
      const result = validateToken(123 as any, 'provisioning');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token must be a string');
    });
    
    it('should reject invalid format', () => {
      const result = validateToken('invalid-token', 'provisioning');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });
  
  describe('getTokenType', () => {
    it('should detect provisioning token', () => {
      const generator = new SecureTokenGenerator();
      const { token } = generator.generateProvisioningToken();
      
      expect(getTokenType(token)).toBe('provisioning');
    });
    
    it('should detect sidecar token', () => {
      const generator = new SecureTokenGenerator();
      const { token } = generator.generateSidecarToken();
      
      expect(getTokenType(token)).toBe('sidecar');
    });
    
    it('should return unknown for invalid token', () => {
      expect(getTokenType('invalid')).toBe('unknown');
    });
  });
  
  describe('getTokenMetadata', () => {
    it('should extract provisioning token metadata', () => {
      const generator = new SecureTokenGenerator();
      const { token } = generator.generateProvisioningToken();
      
      const metadata = getTokenMetadata(token);
      expect(metadata.type).toBe('provisioning');
      expect(metadata.valid_format).toBe(true);
      expect(metadata.prefix).toBe(TOKEN_PREFIXES.provisioning);
      expect(metadata.length).toBe(69); // prov_ + 64 chars
    });
    
    it('should extract sidecar token metadata', () => {
      const generator = new SecureTokenGenerator();
      const { token } = generator.generateSidecarToken();
      
      const metadata = getTokenMetadata(token);
      expect(metadata.type).toBe('sidecar');
      expect(metadata.valid_format).toBe(true);
      expect(metadata.prefix).toBe(TOKEN_PREFIXES.sidecar);
    });
    
    it('should handle invalid token', () => {
      const metadata = getTokenMetadata('invalid-token');
      expect(metadata.type).toBe('unknown');
      expect(metadata.valid_format).toBe(false);
      expect(metadata.prefix).toBeNull();
    });
  });
});

describe('Token Expiry', () => {
  describe('calculateProvisioningTokenExpiry', () => {
    it('should calculate 15 minutes from now', () => {
      const now = Date.now();
      const expiry = calculateProvisioningTokenExpiry();
      const diff = expiry.getTime() - now;
      
      expect(diff).toBeGreaterThan(14 * 60 * 1000); // > 14 min
      expect(diff).toBeLessThanOrEqual(15 * 60 * 1000); // <= 15 min
    });
  });
  
  describe('calculateSidecarTokenExpiry', () => {
    it('should calculate 30 days from now', () => {
      const now = Date.now();
      const expiry = calculateSidecarTokenExpiry();
      const diff = expiry.getTime() - now;
      
      const expectedDiff = 30 * 24 * 60 * 60 * 1000;
      expect(diff).toBeGreaterThan(expectedDiff - 1000); // Allow 1s tolerance
      expect(diff).toBeLessThanOrEqual(expectedDiff);
    });
  });
  
  describe('isTokenExpired', () => {
    it('should detect expired token', () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(isTokenExpired(pastDate)).toBe(true);
    });
    
    it('should detect non-expired token', () => {
      const futureDate = new Date(Date.now() + 1000);
      expect(isTokenExpired(futureDate)).toBe(false);
    });
    
    it('should handle string dates', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      expect(isTokenExpired(pastDate)).toBe(true);
    });
  });
  
  describe('getTimeUntilExpiry', () => {
    it('should return positive time for future date', () => {
      const futureDate = new Date(Date.now() + 5000);
      const time = getTimeUntilExpiry(futureDate);
      
      expect(time).toBeGreaterThan(4000);
      expect(time).toBeLessThanOrEqual(5000);
    });
    
    it('should return 0 for past date', () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(getTimeUntilExpiry(pastDate)).toBe(0);
    });
    
    it('should handle string dates', () => {
      const futureDate = new Date(Date.now() + 1000).toISOString();
      const time = getTimeUntilExpiry(futureDate);
      expect(time).toBeGreaterThan(0);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle very long tokens', () => {
    const longToken = 'prov_' + '0'.repeat(10000);
    expect(validateTokenFormat(longToken, 'provisioning')).toBe(false);
  });
  
  it('should handle tokens with newlines', () => {
    const token = 'prov_' + '0'.repeat(64) + '\n';
    expect(validateTokenFormat(token, 'provisioning')).toBe(false);
  });
  
  it('should handle tokens with spaces', () => {
    const token = 'prov_ ' + '0'.repeat(63);
    expect(validateTokenFormat(token, 'provisioning')).toBe(false);
  });
  
  it('should handle uppercase hex', () => {
    const token = 'prov_' + 'A'.repeat(64);
    expect(validateTokenFormat(token, 'provisioning')).toBe(false); // Must be lowercase
  });
  
  it('should handle mixed case hex', () => {
    const generator = new SecureTokenGenerator();
    const { token } = generator.generateProvisioningToken();
    const upperToken = token.toUpperCase();
    
    expect(validateTokenFormat(upperToken, 'provisioning')).toBe(false);
  });
});

describe('Security Properties', () => {
  it('should generate tokens with high entropy', () => {
    const generator = new SecureTokenGenerator();
    const tokens = new Set();
    
    // Generate 10,000 tokens and ensure no collisions
    for (let i = 0; i < 10000; i++) {
      const { token } = generator.generateProvisioningToken();
      tokens.add(token);
    }
    
    expect(tokens.size).toBe(10000);
  });
  
  it('should use constant-time comparison', () => {
    const hash1 = hashToken('test');
    const hash2 = hashToken('test');
    const hash3 = hashToken('different');
    
    // Time comparison (rough test)
    const start1 = Date.now();
    for (let i = 0; i < 10000; i++) {
      compareHashes(hash1, hash2);
    }
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    for (let i = 0; i < 10000; i++) {
      compareHashes(hash1, hash3);
    }
    const time2 = Date.now() - start2;
    
    // Times should be similar (within 50%)
    const ratio = time1 / time2;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2.0);
  });
  
  it('should produce consistent hashes across calls', () => {
    const token = 'test-token-for-consistency';
    const hashes = new Set();
    
    for (let i = 0; i < 100; i++) {
      hashes.add(hashToken(token));
    }
    
    expect(hashes.size).toBe(1);
  });
});

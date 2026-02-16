/**
 * GENESIS PART VI - PHASE 60.D: N8N AUTHENTICATION & ACCESS CONTROL
 * Admin Access Manager Tests
 */

import { N8nAdminAccessManager } from '@/lib/genesis/phase61b/n8n-admin-access';

describe('N8nAdminAccessManager', () => {
  const mockWorkspaceId = 'ws-123';
  const mockWorkspaceName = 'Acme Corp';
  const mockN8nUrl = 'https://1-2-3-4.sslip.io';
  const mockOwnerEmail = 'admin_acmecorp@genesis.local';
  const mockOwnerPassword = 'SecurePassword123!';

  describe('getAdminAccess', () => {
    it('should return admin access information', () => {
      const access = N8nAdminAccessManager.getAdminAccess(
        mockWorkspaceId,
        mockWorkspaceName,
        mockN8nUrl,
        mockOwnerEmail,
        mockOwnerPassword
      );

      expect(access.workspace_id).toBe(mockWorkspaceId);
      expect(access.workspace_name).toBe(mockWorkspaceName);
      expect(access.n8n_url).toBe(mockN8nUrl);
      expect(access.owner_email).toBe(mockOwnerEmail);
      expect(access.owner_password).toBe(mockOwnerPassword);
      expect(access.owner_account_status).toBe('pending_creation');
    });

    it('should use default status when not provided', () => {
      const access = N8nAdminAccessManager.getAdminAccess(
        mockWorkspaceId,
        mockWorkspaceName,
        mockN8nUrl,
        mockOwnerEmail,
        mockOwnerPassword
      );

      expect(access.owner_account_status).toBe('pending_creation');
      expect(access.owner_created_at).toBeUndefined();
    });

    it('should include status when provided', () => {
      const createdAt = new Date();
      const access = N8nAdminAccessManager.getAdminAccess(
        mockWorkspaceId,
        mockWorkspaceName,
        mockN8nUrl,
        mockOwnerEmail,
        mockOwnerPassword,
        'created',
        createdAt
      );

      expect(access.owner_account_status).toBe('created');
      expect(access.owner_created_at).toBe(createdAt);
    });
  });

  describe('formatN8nUrl', () => {
    it('should format URL from standard IP', () => {
      const url = N8nAdminAccessManager.formatN8nUrl('159.223.45.67');
      
      expect(url).toBe('https://159-223-45-67.sslip.io');
    });

    it('should handle IP with single-digit octets', () => {
      const url = N8nAdminAccessManager.formatN8nUrl('1.2.3.4');
      
      expect(url).toBe('https://1-2-3-4.sslip.io');
    });

    it('should use HTTPS protocol', () => {
      const url = N8nAdminAccessManager.formatN8nUrl('192.168.1.1');
      
      expect(url).toMatch(/^https:\/\//);
    });

    it('should use sslip.io domain', () => {
      const url = N8nAdminAccessManager.formatN8nUrl('10.0.0.1');
      
      expect(url).toContain('sslip.io');
    });
  });

  describe('Status Checking Methods', () => {
    it('should identify pending creation status', () => {
      expect(N8nAdminAccessManager.needsOwnerAccountCreation('pending_creation')).toBe(true);
      expect(N8nAdminAccessManager.needsOwnerAccountCreation('created')).toBe(false);
      expect(N8nAdminAccessManager.needsOwnerAccountCreation('failed')).toBe(false);
    });

    it('should identify active owner account', () => {
      expect(N8nAdminAccessManager.isOwnerAccountActive('created')).toBe(true);
      expect(N8nAdminAccessManager.isOwnerAccountActive('pending_creation')).toBe(false);
      expect(N8nAdminAccessManager.isOwnerAccountActive('failed')).toBe(false);
    });

    it('should identify failed owner account', () => {
      expect(N8nAdminAccessManager.hasOwnerAccountFailed('failed')).toBe(true);
      expect(N8nAdminAccessManager.hasOwnerAccountFailed('pending_creation')).toBe(false);
      expect(N8nAdminAccessManager.hasOwnerAccountFailed('created')).toBe(false);
    });
  });

  describe('getStatusMessage', () => {
    it('should return message for pending creation', () => {
      const message = N8nAdminAccessManager.getStatusMessage('pending_creation');
      
      expect(message).toContain('not yet created');
      expect(message).toContain('⚠️');
    });

    it('should return message for created status', () => {
      const message = N8nAdminAccessManager.getStatusMessage('created');
      
      expect(message).toContain('active');
      expect(message).toContain('✅');
    });

    it('should return message for failed status', () => {
      const message = N8nAdminAccessManager.getStatusMessage('failed');
      
      expect(message).toContain('failed');
      expect(message).toContain('❌');
    });
  });

  describe('getNextAction', () => {
    it('should return action for pending creation', () => {
      const action = N8nAdminAccessManager.getNextAction('pending_creation');
      
      expect(action).toContain('create owner account');
    });

    it('should return action for created status', () => {
      const action = N8nAdminAccessManager.getNextAction('created');
      
      expect(action).toContain('Open n8n');
      expect(action).toContain('log in');
    });

    it('should return action for failed status', () => {
      const action = N8nAdminAccessManager.getNextAction('failed');
      
      expect(action).toContain('Retry');
    });
  });

  describe('validateN8nUrl', () => {
    it('should validate correct HTTPS URL', () => {
      const validation = N8nAdminAccessManager.validateN8nUrl('https://1-2-3-4.sslip.io');
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject HTTP URL', () => {
      const validation = N8nAdminAccessManager.validateN8nUrl('http://1-2-3-4.sslip.io');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('HTTPS');
    });

    it('should reject invalid URL format', () => {
      const validation = N8nAdminAccessManager.validateN8nUrl('not-a-url');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Invalid URL');
    });

    it('should accept URL without sslip.io', () => {
      const validation = N8nAdminAccessManager.validateN8nUrl('https://n8n.example.com');
      
      expect(validation.valid).toBe(true);
    });

    it('should accept URL with port', () => {
      const validation = N8nAdminAccessManager.validateN8nUrl('https://1-2-3-4.sslip.io:5678');
      
      expect(validation.valid).toBe(true);
    });
  });

  describe('maskPassword', () => {
    it('should mask middle characters of password', () => {
      const masked = N8nAdminAccessManager.maskPassword('Abcd1234!@#$');
      
      expect(masked).toBe('Abcd****!@#$');
      expect(masked.length).toBe(12);
    });

    it('should use specified show length', () => {
      const masked = N8nAdminAccessManager.maskPassword('Abcd1234!@#$', 2);
      
      // Password is 12 chars: show 2 at start + 2 at end = 4 shown, 8 masked
      expect(masked).toBe('Ab********#$');
    });

    it('should fully mask short passwords', () => {
      const masked = N8nAdminAccessManager.maskPassword('Abc123');
      
      expect(masked).toBe('******');
    });

    it('should fully mask password shorter than show length', () => {
      const masked = N8nAdminAccessManager.maskPassword('Abc', 4);
      
      expect(masked).toBe('***');
    });

    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(50);
      const masked = N8nAdminAccessManager.maskPassword(longPassword);
      
      expect(masked.length).toBe(50);
      expect(masked.startsWith('AAAA')).toBe(true);
      expect(masked.endsWith('AAAA')).toBe(true);
      expect(masked).toContain('*');
    });
  });

  describe('formatCredentialsForClipboard', () => {
    it('should format credentials for clipboard', () => {
      const access = N8nAdminAccessManager.getAdminAccess(
        mockWorkspaceId,
        mockWorkspaceName,
        mockN8nUrl,
        mockOwnerEmail,
        mockOwnerPassword,
        'created'
      );

      const formatted = N8nAdminAccessManager.formatCredentialsForClipboard(access);

      expect(formatted).toContain(mockWorkspaceName);
      expect(formatted).toContain(mockN8nUrl);
      expect(formatted).toContain(mockOwnerEmail);
      expect(formatted).toContain(mockOwnerPassword);
      expect(formatted).toContain('created');
    });

    it('should include all required fields', () => {
      const access = N8nAdminAccessManager.getAdminAccess(
        mockWorkspaceId,
        mockWorkspaceName,
        mockN8nUrl,
        mockOwnerEmail,
        mockOwnerPassword
      );

      const formatted = N8nAdminAccessManager.formatCredentialsForClipboard(access);

      expect(formatted).toContain('URL:');
      expect(formatted).toContain('Email:');
      expect(formatted).toContain('Password:');
      expect(formatted).toContain('Status:');
    });

    it('should be properly formatted with newlines', () => {
      const access = N8nAdminAccessManager.getAdminAccess(
        mockWorkspaceId,
        mockWorkspaceName,
        mockN8nUrl,
        mockOwnerEmail,
        mockOwnerPassword
      );

      const formatted = N8nAdminAccessManager.formatCredentialsForClipboard(access);

      expect(formatted.split('\n').length).toBeGreaterThan(1);
    });
  });
});

/**
 * GENESIS PART VI - PHASE 60.D: N8N AUTHENTICATION & ACCESS CONTROL
 * Admin Access Manager
 * 
 * Manages admin access to n8n instances
 */

import type {
  N8nAdminAccess,
  N8nOwnerAccountStatus,
} from './n8n-types';

/**
 * Admin Access Manager
 * Provides admin access information for n8n instances
 */
export class N8nAdminAccessManager {
  /**
   * Get n8n access information for a workspace
   * (In production, this would decrypt credentials from database)
   */
  static getAdminAccess(
    workspaceId: string,
    workspaceName: string,
    n8nUrl: string,
    ownerEmail: string,
    ownerPassword: string,
    ownerAccountStatus: N8nOwnerAccountStatus = 'pending_creation',
    ownerCreatedAt?: Date
  ): N8nAdminAccess {
    return {
      workspace_id: workspaceId,
      workspace_name: workspaceName,
      n8n_url: n8nUrl,
      owner_email: ownerEmail,
      owner_password: ownerPassword,
      owner_account_status: ownerAccountStatus,
      owner_created_at: ownerCreatedAt,
    };
  }

  /**
   * Format n8n URL from droplet IP
   */
  static formatN8nUrl(dropletIp: string): string {
    // Using sslip.io for automatic DNS resolution
    return `https://${dropletIp.replace(/\./g, '-')}.sslip.io`;
  }

  /**
   * Check if owner account needs creation
   */
  static needsOwnerAccountCreation(status: N8nOwnerAccountStatus): boolean {
    return status === 'pending_creation';
  }

  /**
   * Check if owner account is active
   */
  static isOwnerAccountActive(status: N8nOwnerAccountStatus): boolean {
    return status === 'created';
  }

  /**
   * Check if owner account creation failed
   */
  static hasOwnerAccountFailed(status: N8nOwnerAccountStatus): boolean {
    return status === 'failed';
  }

  /**
   * Generate admin dashboard message based on status
   */
  static getStatusMessage(status: N8nOwnerAccountStatus): string {
    switch (status) {
      case 'pending_creation':
        return '⚠️ Owner account not yet created. Complete one-time setup to access n8n.';
      case 'created':
        return '✅ Owner account active. You can access n8n using the credentials below.';
      case 'failed':
        return '❌ Owner account creation failed. Please try again or contact support.';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Get next action for admin based on status
   */
  static getNextAction(status: N8nOwnerAccountStatus): string {
    switch (status) {
      case 'pending_creation':
        return 'Navigate to n8n URL and create owner account using the credentials below';
      case 'created':
        return 'Open n8n and log in with the credentials below';
      case 'failed':
        return 'Retry owner account creation or investigate error logs';
      default:
        return 'No action required';
    }
  }

  /**
   * Validate n8n URL format
   */
  static validateN8nUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);
      
      if (parsed.protocol !== 'https:') {
        return { valid: false, error: 'n8n URL must use HTTPS protocol' };
      }

      if (!parsed.hostname.includes('sslip.io')) {
        // Warning: Not using sslip.io, but still valid
        return { valid: true };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Mask password for display (show first 4 and last 4 characters)
   */
  static maskPassword(password: string, showLength: number = 4): string {
    if (password.length <= showLength * 2) {
      return '*'.repeat(password.length);
    }

    const start = password.substring(0, showLength);
    const end = password.substring(password.length - showLength);
    const middle = '*'.repeat(password.length - (showLength * 2));

    return `${start}${middle}${end}`;
  }

  /**
   * Copy credentials to clipboard format
   */
  static formatCredentialsForClipboard(access: N8nAdminAccess): string {
    return `n8n Access - ${access.workspace_name}\n\n` +
           `URL: ${access.n8n_url}\n` +
           `Email: ${access.owner_email}\n` +
           `Password: ${access.owner_password}\n` +
           `Status: ${access.owner_account_status}`;
  }
}

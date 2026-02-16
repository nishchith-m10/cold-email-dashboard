/**
 * GENESIS PART VI - PHASE 60.C: ADMIN NOTIFICATION SYSTEM
 * Notification Templates Tests
 */

import { GmailTemplates, TelegramTemplates } from '@/lib/genesis/phase61b/notification-templates';
import type {
  ClientFirstLoginPayload,
  DropletReadyPayload,
  HighRiskSignupPayload,
  NewCampaignPayload,
  IgnitionFailedPayload,
  SetupNotReviewedPayload,
} from '@/lib/genesis/phase61b/notification-types';

describe('Notification Templates', () => {
  const mockTimestamp = new Date('2026-01-27T12:00:00Z');

  describe('GmailTemplates', () => {
    describe('clientFirstLogin', () => {
      it('should generate template with required fields', () => {
        const payload: ClientFirstLoginPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          user_email: 'john@acme.com',
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.clientFirstLogin(payload);

        expect(template.subject).toContain('Acme Corp');
        expect(template.body).toContain('Acme Corp');
        expect(template.body).toContain('john@acme.com');
        expect(template.body).toContain(mockTimestamp.toISOString());
      });

      it('should include user name if provided', () => {
        const payload: ClientFirstLoginPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          user_email: 'john@acme.com',
          user_name: 'John Doe',
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.clientFirstLogin(payload);

        expect(template.body).toContain('John Doe');
      });

      it('should omit user name if not provided', () => {
        const payload: ClientFirstLoginPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          user_email: 'john@acme.com',
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.clientFirstLogin(payload);

        expect(template.body).not.toContain('User Name:');
      });
    });

    describe('dropletReady', () => {
      it('should generate template with all setup details', () => {
        const payload: DropletReadyPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          user_email: 'john@acme.com',
          n8n_url: 'https://1.2.3.4.sslip.io',
          n8n_owner_email: 'admin_acme@genesis.local',
          n8n_owner_password: 'secure_password_123',
          admin_dashboard_url: 'https://app.example.com/admin/workspaces/ws-123',
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.dropletReady(payload);

        expect(template.subject).toContain('Ready for Setup');
        expect(template.subject).toContain('Acme Corp');
        expect(template.body).toContain('https://1.2.3.4.sslip.io');
        expect(template.body).toContain('admin_acme@genesis.local');
        expect(template.body).toContain('secure_password_123');
        expect(template.body).toContain('https://app.example.com/admin/workspaces/ws-123');
      });

      it('should include setup checklist', () => {
        const payload: DropletReadyPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          user_email: 'john@acme.com',
          n8n_url: 'https://1.2.3.4.sslip.io',
          n8n_owner_email: 'admin@genesis.local',
          n8n_owner_password: 'password',
          admin_dashboard_url: 'https://app.example.com',
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.dropletReady(payload);

        expect(template.body).toContain('Next Steps:');
        expect(template.body).toContain('1.');
        expect(template.body).toContain('workflow templates');
        expect(template.body).toContain('production test');
      });
    });

    describe('highRiskSignup', () => {
      it('should generate template with risk details', () => {
        const payload: HighRiskSignupPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Suspicious Corp',
          user_email: 'user@tempmail.com',
          risk_score: 75,
          risk_level: 'high',
          signals: ['Disposable email', 'VPN detected', 'Enterprise tier day 1'],
          review_url: 'https://app.example.com/admin/risk/ws-123',
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.highRiskSignup(payload);

        expect(template.subject).toContain('High-Risk');
        expect(template.body).toContain('Suspicious Corp');
        expect(template.body).toContain('75/100');
        expect(template.body).toContain('HIGH');
        expect(template.body).toContain('Disposable email');
        expect(template.body).toContain('VPN detected');
        expect(template.body).toContain('https://app.example.com/admin/risk/ws-123');
      });

      it('should list all risk signals', () => {
        const payload: HighRiskSignupPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Test',
          user_email: 'test@test.com',
          risk_score: 60,
          risk_level: 'high',
          signals: ['Signal 1', 'Signal 2', 'Signal 3'],
          review_url: 'https://app.example.com',
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.highRiskSignup(payload);

        expect(template.body).toContain('Signal 1');
        expect(template.body).toContain('Signal 2');
        expect(template.body).toContain('Signal 3');
      });

      it('should include action options', () => {
        const payload: HighRiskSignupPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Test',
          user_email: 'test@test.com',
          risk_score: 60,
          risk_level: 'high',
          signals: [],
          review_url: 'https://app.example.com',
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.highRiskSignup(payload);

        expect(template.body).toContain('Approve');
        expect(template.body).toContain('Reject');
        expect(template.body).toContain('Monitor');
      });
    });

    describe('newCampaign', () => {
      it('should generate template for campaign needing setup', () => {
        const payload: NewCampaignPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          campaign_name: 'Tech CTOs',
          campaign_id: 'camp-456',
          needs_setup: true,
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.newCampaign(payload);

        expect(template.subject).toContain('New Campaign Created');
        expect(template.subject).toContain('Tech CTOs');
        expect(template.body).toContain('Acme Corp');
        expect(template.body).toContain('Tech CTOs');
        expect(template.body).toContain('needs workflow setup');
        expect(template.body).toContain('Setup Required:');
      });

      it('should generate template for ready campaign', () => {
        const payload: NewCampaignPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          campaign_name: 'Marketing VPs',
          campaign_id: 'camp-789',
          needs_setup: false,
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.newCampaign(payload);

        expect(template.body).toContain('is ready');
        expect(template.body).not.toContain('Setup Required:');
      });
    });

    describe('ignitionFailed', () => {
      it('should generate template with error details', () => {
        const payload: IgnitionFailedPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Failed Corp',
          error_message: 'DigitalOcean API rate limit exceeded',
          retry_count: 3,
          failed_at: mockTimestamp,
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.ignitionFailed(payload);

        expect(template.subject).toContain('Ignition Failed');
        expect(template.subject).toContain('3 retries');
        expect(template.body).toContain('Failed Corp');
        expect(template.body).toContain('DigitalOcean API rate limit exceeded');
        expect(template.body).toContain('3');
        expect(template.body).toContain('MANUAL INTERVENTION REQUIRED');
      });

      it('should include possible causes', () => {
        const payload: IgnitionFailedPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Test',
          error_message: 'Error',
          retry_count: 3,
          failed_at: mockTimestamp,
          timestamp: mockTimestamp,
        };

        const template = GmailTemplates.ignitionFailed(payload);

        expect(template.body).toContain('Possible causes:');
        expect(template.body).toContain('DigitalOcean');
        expect(template.body).toContain('Network connectivity');
      });
    });

    describe('setupNotReviewed', () => {
      it('should generate escalation template', () => {
        const payload: SetupNotReviewedPayload = {
          pending_count: 3,
          oldest_workspace_id: 'ws-123',
          oldest_workspace_name: 'Old Corp',
          hours_pending: 26,
        };

        const template = GmailTemplates.setupNotReviewed(payload);

        expect(template.subject).toContain('OVERDUE');
        expect(template.subject).toContain('3 workspaces');
        expect(template.subject).toContain('26+ hours');
        expect(template.body).toContain('ESCALATION');
        expect(template.body).toContain('3 workspaces');
        expect(template.body).toContain('Old Corp');
        expect(template.body).toContain('26h');
        expect(template.body).toContain('IMMEDIATE ACTION REQUIRED');
      });

      it('should use singular for single workspace', () => {
        const payload: SetupNotReviewedPayload = {
          pending_count: 1,
          oldest_workspace_id: 'ws-123',
          oldest_workspace_name: 'Test',
          hours_pending: 25,
        };

        const template = GmailTemplates.setupNotReviewed(payload);

        expect(template.subject).toContain('1 workspace');
        expect(template.subject).not.toContain('workspaces');
      });
    });
  });

  describe('TelegramTemplates', () => {
    describe('clientFirstLogin', () => {
      it('should generate concise Telegram message', () => {
        const payload: ClientFirstLoginPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          user_email: 'john@acme.com',
          timestamp: mockTimestamp,
        };

        const template = TelegramTemplates.clientFirstLogin(payload);

        expect(template.body).toContain('NEW CLIENT LOGIN');
        expect(template.body).toContain('Acme Corp');
        expect(template.body).toContain('john@acme.com');
      });
    });

    describe('dropletReady', () => {
      it('should include n8n URL and dashboard link', () => {
        const payload: DropletReadyPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme Corp',
          user_email: 'john@acme.com',
          n8n_url: 'https://1.2.3.4.sslip.io',
          n8n_owner_email: 'admin@genesis.local',
          n8n_owner_password: 'password',
          admin_dashboard_url: 'https://app.example.com/admin',
          timestamp: mockTimestamp,
        };

        const template = TelegramTemplates.dropletReady(payload);

        expect(template.body).toContain('NEW CLIENT READY');
        expect(template.body).toContain('https://1.2.3.4.sslip.io');
        expect(template.body).toContain('Open Dashboard');
        expect(template.body).toContain('https://app.example.com/admin');
      });
    });

    describe('highRiskSignup', () => {
      it('should show risk score and review link', () => {
        const payload: HighRiskSignupPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Test',
          user_email: 'test@test.com',
          risk_score: 85,
          risk_level: 'high',
          signals: ['Signal 1'],
          review_url: 'https://app.example.com/review',
          timestamp: mockTimestamp,
        };

        const template = TelegramTemplates.highRiskSignup(payload);

        expect(template.body).toContain('HIGH-RISK');
        expect(template.body).toContain('85/100');
        expect(template.body).toContain('HIGH');
        expect(template.body).toContain('Review Now');
      });
    });

    describe('newCampaign', () => {
      it('should show setup status', () => {
        const payload: NewCampaignPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme',
          campaign_name: 'Campaign 1',
          campaign_id: 'camp-1',
          needs_setup: true,
          timestamp: mockTimestamp,
        };

        const template = TelegramTemplates.newCampaign(payload);

        expect(template.body).toContain('NEW CAMPAIGN');
        expect(template.body).toContain('Campaign 1');
        expect(template.body).toContain('Setup required');
      });

      it('should show ready status', () => {
        const payload: NewCampaignPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Acme',
          campaign_name: 'Campaign 2',
          campaign_id: 'camp-2',
          needs_setup: false,
          timestamp: mockTimestamp,
        };

        const template = TelegramTemplates.newCampaign(payload);

        expect(template.body).toContain('Ready');
      });
    });

    describe('ignitionFailed', () => {
      it('should truncate long error messages', () => {
        const longError = 'A'.repeat(150);
        const payload: IgnitionFailedPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Test',
          error_message: longError,
          retry_count: 3,
          failed_at: mockTimestamp,
          timestamp: mockTimestamp,
        };

        const template = TelegramTemplates.ignitionFailed(payload);

        expect(template.body).toContain('IGNITION FAILED');
        expect(template.body.length).toBeLessThan(longError.length + 100);
        expect(template.body).toContain('...');
      });

      it('should not truncate short error messages', () => {
        const shortError = 'Short error';
        const payload: IgnitionFailedPayload = {
          workspace_id: 'ws-123',
          workspace_name: 'Test',
          error_message: shortError,
          retry_count: 3,
          failed_at: mockTimestamp,
          timestamp: mockTimestamp,
        };

        const template = TelegramTemplates.ignitionFailed(payload);

        expect(template.body).toContain(shortError);
        expect(template.body).not.toContain('...');
      });
    });

    describe('setupNotReviewed', () => {
      it('should show escalation warning', () => {
        const payload: SetupNotReviewedPayload = {
          pending_count: 5,
          oldest_workspace_id: 'ws-123',
          oldest_workspace_name: 'Old',
          hours_pending: 30,
        };

        const template = TelegramTemplates.setupNotReviewed(payload);

        expect(template.body).toContain('ESCALATION');
        expect(template.body).toContain('5 workspaces');
        expect(template.body).toContain('30h+');
        expect(template.body).toContain('IMMEDIATE ACTION REQUIRED');
      });
    });
  });
});

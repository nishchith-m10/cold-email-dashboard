/**
 * GENESIS PART VI - PHASE 60.C: ADMIN NOTIFICATION SYSTEM
 * Notification Channels Tests
 */

import {
  GmailChannel,
  TelegramChannel,
  MockNotificationChannel,
} from '@/lib/genesis/phase60c/notification-channels';
import type {
  ClientFirstLoginPayload,
  DropletReadyPayload,
} from '@/lib/genesis/phase60c/notification-types';

describe('Notification Channels', () => {
  const mockTimestamp = new Date('2026-01-27T12:00:00Z');

  describe('GmailChannel', () => {
    const gmailConfig = {
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: 'alerts@example.com',
      smtp_pass: 'password',
      from_address: 'alerts@example.com',
      to_address: 'admin@example.com',
    };

    it('should have correct channel name', () => {
      const channel = new GmailChannel(gmailConfig);
      expect(channel.name).toBe('gmail');
    });

    it('should send client first login notification', async () => {
      const channel = new GmailChannel(gmailConfig);
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Acme Corp',
        user_email: 'john@acme.com',
        timestamp: mockTimestamp,
      };

      const result = await channel.send('client_first_login', payload);

      expect(result.channel).toBe('gmail');
      expect(result.success).toBe(true);
      expect(result.sent_at).toBeInstanceOf(Date);
    });

    it('should send droplet ready notification', async () => {
      const channel = new GmailChannel(gmailConfig);
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

      const result = await channel.send('droplet_ready_for_setup', payload);

      expect(result.success).toBe(true);
    });

    it('should get template for each event type', () => {
      const channel = new GmailChannel(gmailConfig);
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const template = channel.getTemplate('client_first_login', payload);

      expect(template.subject).toBeDefined();
      expect(template.body).toBeDefined();
      expect(template.body).toContain('Test');
    });

    it('should throw error for unknown event type', () => {
      const channel = new GmailChannel(gmailConfig);
      const payload: any = { workspace_id: 'ws-123' };

      expect(() => {
        channel.getTemplate('unknown_event' as any, payload);
      }).toThrow('Unknown event type');
    });
  });

  describe('TelegramChannel', () => {
    const telegramConfig = {
      bot_token: 'fake_token_123',
      chat_id: '-123456789',
    };

    it('should have correct channel name', () => {
      const channel = new TelegramChannel(telegramConfig);
      expect(channel.name).toBe('telegram');
    });

    it('should send notification successfully', async () => {
      const channel = new TelegramChannel(telegramConfig);
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Acme Corp',
        user_email: 'john@acme.com',
        timestamp: mockTimestamp,
      };

      const result = await channel.send('client_first_login', payload);

      expect(result.channel).toBe('telegram');
      expect(result.success).toBe(true);
      expect(result.sent_at).toBeInstanceOf(Date);
    });

    it('should get template for each event type', () => {
      const channel = new TelegramChannel(telegramConfig);
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const template = channel.getTemplate('client_first_login', payload);

      expect(template.body).toBeDefined();
      expect(template.body).toContain('Test');
    });

    it('should throw error for unknown event type', () => {
      const channel = new TelegramChannel(telegramConfig);
      const payload: any = { workspace_id: 'ws-123' };

      expect(() => {
        channel.getTemplate('invalid_type' as any, payload);
      }).toThrow('Unknown event type');
    });
  });

  describe('MockNotificationChannel', () => {
    it('should create mock channel with given name', () => {
      const channel = new MockNotificationChannel('gmail');
      expect(channel.name).toBe('gmail');
    });

    it('should track sent messages', async () => {
      const channel = new MockNotificationChannel('gmail');
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      await channel.send('client_first_login', payload);

      expect(channel.sentMessages).toHaveLength(1);
      expect(channel.sentMessages[0].eventType).toBe('client_first_login');
      expect(channel.sentMessages[0].payload).toEqual(payload);
    });

    it('should succeed by default', async () => {
      const channel = new MockNotificationChannel('gmail');
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await channel.send('client_first_login', payload);

      expect(result.success).toBe(true);
      expect(result.sent_at).toBeInstanceOf(Date);
    });

    it('should fail when configured to fail', async () => {
      const channel = new MockNotificationChannel('gmail', true);
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await channel.send('client_first_login', payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Mock failure');
    });

    it('should reset sent messages', async () => {
      const channel = new MockNotificationChannel('gmail');
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      await channel.send('client_first_login', payload);
      expect(channel.sentMessages).toHaveLength(1);

      channel.reset();
      expect(channel.sentMessages).toHaveLength(0);
    });

    it('should toggle failure mode', async () => {
      const channel = new MockNotificationChannel('gmail');
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result1 = await channel.send('client_first_login', payload);
      expect(result1.success).toBe(true);

      channel.setShouldFail(true);
      const result2 = await channel.send('client_first_login', payload);
      expect(result2.success).toBe(false);

      channel.setShouldFail(false);
      const result3 = await channel.send('client_first_login', payload);
      expect(result3.success).toBe(true);
    });

    it('should return mock template', () => {
      const channel = new MockNotificationChannel('gmail');
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const template = channel.getTemplate('client_first_login', payload);

      expect(template.subject).toContain('client_first_login');
      expect(template.body).toContain('client_first_login');
    });
  });
});

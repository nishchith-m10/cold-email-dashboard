/**
 * GENESIS PART VI - PHASE 60.C: ADMIN NOTIFICATION SYSTEM
 * Notification Dispatcher Tests
 */

import { NotificationDispatcher } from '@/lib/genesis/phase61b/notification-dispatcher';
import { MockNotificationChannel } from '@/lib/genesis/phase61b/notification-channels';
import type {
  ClientFirstLoginPayload,
  DropletReadyPayload,
  SetupNotReviewedPayload,
} from '@/lib/genesis/phase61b/notification-types';

describe('NotificationDispatcher', () => {
  const mockTimestamp = new Date('2026-01-27T12:00:00Z');
  
  let dispatcher: NotificationDispatcher;
  let gmailChannel: MockNotificationChannel;
  let telegramChannel: MockNotificationChannel;

  beforeEach(() => {
    dispatcher = new NotificationDispatcher();
    gmailChannel = new MockNotificationChannel('gmail');
    telegramChannel = new MockNotificationChannel('telegram');
  });

  describe('Channel Registration', () => {
    it('should register a channel', () => {
      dispatcher.registerChannel(gmailChannel);
      
      expect(dispatcher.isChannelRegistered('gmail')).toBe(true);
      expect(dispatcher.getRegisteredChannels()).toContain('gmail');
    });

    it('should register multiple channels', () => {
      dispatcher.registerChannel(gmailChannel);
      dispatcher.registerChannel(telegramChannel);
      
      expect(dispatcher.getRegisteredChannels()).toHaveLength(2);
      expect(dispatcher.getRegisteredChannels()).toContain('gmail');
      expect(dispatcher.getRegisteredChannels()).toContain('telegram');
    });

    it('should unregister a channel', () => {
      dispatcher.registerChannel(gmailChannel);
      expect(dispatcher.isChannelRegistered('gmail')).toBe(true);
      
      dispatcher.unregisterChannel('gmail');
      expect(dispatcher.isChannelRegistered('gmail')).toBe(false);
    });

    it('should return empty array when no channels registered', () => {
      expect(dispatcher.getRegisteredChannels()).toHaveLength(0);
    });

    it('should return false for unregistered channel', () => {
      expect(dispatcher.isChannelRegistered('gmail')).toBe(false);
    });
  });

  describe('Send Notification', () => {
    beforeEach(() => {
      dispatcher.registerChannel(gmailChannel);
      dispatcher.registerChannel(telegramChannel);
    });

    it('should send to single channel', async () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Acme Corp',
        user_email: 'john@acme.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.send({
        event_type: 'client_first_login',
        channels: ['gmail'],
        payload,
      });

      expect(result.all_succeeded).toBe(true);
      expect(result.any_succeeded).toBe(true);
      expect(result.channels_attempted).toEqual(['gmail']);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].channel).toBe('gmail');
      expect(result.results[0].success).toBe(true);
      expect(gmailChannel.sentMessages).toHaveLength(1);
    });

    it('should send to multiple channels', async () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Acme Corp',
        user_email: 'john@acme.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.send({
        event_type: 'client_first_login',
        channels: ['gmail', 'telegram'],
        payload,
      });

      expect(result.all_succeeded).toBe(true);
      expect(result.channels_attempted).toEqual(['gmail', 'telegram']);
      expect(result.results).toHaveLength(2);
      expect(gmailChannel.sentMessages).toHaveLength(1);
      expect(telegramChannel.sentMessages).toHaveLength(1);
    });

    it('should handle unregistered channel', async () => {
      dispatcher.unregisterChannel('telegram');
      
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.send({
        event_type: 'client_first_login',
        channels: ['gmail', 'telegram'],
        payload,
      });

      expect(result.all_succeeded).toBe(false);
      expect(result.any_succeeded).toBe(true);
      const telegramResult = result.results.find(r => r.channel === 'telegram');
      expect(telegramResult?.success).toBe(false);
      expect(telegramResult?.error).toContain('not registered');
    });

    it('should handle channel failure', async () => {
      gmailChannel.setShouldFail(true);
      
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.send({
        event_type: 'client_first_login',
        channels: ['gmail', 'telegram'],
        payload,
      });

      expect(result.all_succeeded).toBe(false);
      expect(result.any_succeeded).toBe(true);
      const gmailResult = result.results.find(r => r.channel === 'gmail');
      expect(gmailResult?.success).toBe(false);
      const telegramResult = result.results.find(r => r.channel === 'telegram');
      expect(telegramResult?.success).toBe(true);
    });

    it('should handle all channels failing', async () => {
      gmailChannel.setShouldFail(true);
      telegramChannel.setShouldFail(true);
      
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.send({
        event_type: 'client_first_login',
        channels: ['gmail', 'telegram'],
        payload,
      });

      expect(result.all_succeeded).toBe(false);
      expect(result.any_succeeded).toBe(false);
      expect(result.results.every(r => !r.success)).toBe(true);
    });

    it('should generate unique notification IDs', async () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result1 = await dispatcher.send({
        event_type: 'client_first_login',
        channels: ['gmail'],
        payload,
      });

      const result2 = await dispatcher.send({
        event_type: 'client_first_login',
        channels: ['gmail'],
        payload,
      });

      expect(result1.notification_id).not.toBe(result2.notification_id);
    });
  });

  describe('Send to Single Channel', () => {
    beforeEach(() => {
      dispatcher.registerChannel(gmailChannel);
    });

    it('should send to specified channel', async () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.sendToChannel(
        'gmail',
        'client_first_login',
        payload
      );

      expect(result.channel).toBe('gmail');
      expect(result.success).toBe(true);
      expect(gmailChannel.sentMessages).toHaveLength(1);
    });

    it('should return error for unregistered channel', async () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.sendToChannel(
        'telegram',
        'client_first_login',
        payload
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not registered');
    });
  });

  describe('Send to All Channels', () => {
    it('should send to all registered channels', async () => {
      dispatcher.registerChannel(gmailChannel);
      dispatcher.registerChannel(telegramChannel);

      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.sendToAll('client_first_login', payload);

      expect(result.channels_attempted).toHaveLength(2);
      expect(result.all_succeeded).toBe(true);
      expect(gmailChannel.sentMessages).toHaveLength(1);
      expect(telegramChannel.sentMessages).toHaveLength(1);
    });

    it('should handle no registered channels', async () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.sendToAll('client_first_login', payload);

      expect(result.channels_attempted).toHaveLength(0);
      expect(result.results).toHaveLength(0);
      expect(result.all_succeeded).toBe(true); // Vacuous truth
    });
  });

  describe('Request Validation', () => {
    it('should validate correct request', () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const validation = dispatcher.validateRequest({
        event_type: 'client_first_login',
        channels: ['gmail'],
        payload,
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid event type', () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const validation = dispatcher.validateRequest({
        event_type: 'invalid_event' as any,
        channels: ['gmail'],
        payload,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid event type'))).toBe(true);
    });

    it('should reject request with no channels', () => {
      const payload: ClientFirstLoginPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const validation = dispatcher.validateRequest({
        event_type: 'client_first_login',
        channels: [],
        payload,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('At least one'))).toBe(true);
    });

    it('should reject request without payload', () => {
      const validation = dispatcher.validateRequest({
        event_type: 'client_first_login',
        channels: ['gmail'],
        payload: null as any,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('payload is required'))).toBe(true);
    });

    it('should reject request without workspace_id', () => {
      const payload: any = {
        workspace_name: 'Test',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const validation = dispatcher.validateRequest({
        event_type: 'client_first_login',
        channels: ['gmail'],
        payload,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('workspace_id'))).toBe(true);
    });

    it('should reject request without workspace_name', () => {
      const payload: any = {
        workspace_id: 'ws-123',
        user_email: 'test@test.com',
        timestamp: mockTimestamp,
      };

      const validation = dispatcher.validateRequest({
        event_type: 'client_first_login',
        channels: ['gmail'],
        payload,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('workspace_name'))).toBe(true);
    });

    it('should allow setup_not_reviewed_24h without workspace fields', () => {
      const payload: SetupNotReviewedPayload = {
        pending_count: 3,
        oldest_workspace_id: 'ws-123',
        oldest_workspace_name: 'Old Corp',
        hours_pending: 26,
      };

      const validation = dispatcher.validateRequest({
        event_type: 'setup_not_reviewed_24h',
        channels: ['gmail'],
        payload,
      });

      expect(validation.valid).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const payload: any = {};

      const validation = dispatcher.validateRequest({
        event_type: 'invalid_type' as any,
        channels: [],
        payload,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Different Event Types', () => {
    beforeEach(() => {
      dispatcher.registerChannel(gmailChannel);
      dispatcher.registerChannel(telegramChannel);
    });

    it('should send droplet ready notification', async () => {
      const payload: DropletReadyPayload = {
        workspace_id: 'ws-123',
        workspace_name: 'Acme',
        user_email: 'john@acme.com',
        n8n_url: 'https://1.2.3.4.sslip.io',
        n8n_owner_email: 'admin@genesis.local',
        n8n_owner_password: 'password',
        admin_dashboard_url: 'https://app.example.com',
        timestamp: mockTimestamp,
      };

      const result = await dispatcher.send({
        event_type: 'droplet_ready_for_setup',
        channels: ['gmail', 'telegram'],
        payload,
      });

      expect(result.all_succeeded).toBe(true);
      expect(gmailChannel.sentMessages[0].eventType).toBe('droplet_ready_for_setup');
    });

    it('should send all event types successfully', async () => {
      const eventTypes: Array<{
        type: any;
        payload: any;
      }> = [
        {
          type: 'client_first_login',
          payload: {
            workspace_id: 'ws-1',
            workspace_name: 'Test',
            user_email: 'test@test.com',
            timestamp: mockTimestamp,
          },
        },
        {
          type: 'droplet_ready_for_setup',
          payload: {
            workspace_id: 'ws-2',
            workspace_name: 'Test',
            user_email: 'test@test.com',
            n8n_url: 'url',
            n8n_owner_email: 'email',
            n8n_owner_password: 'pass',
            admin_dashboard_url: 'url',
            timestamp: mockTimestamp,
          },
        },
        {
          type: 'high_risk_signup',
          payload: {
            workspace_id: 'ws-3',
            workspace_name: 'Test',
            user_email: 'test@test.com',
            risk_score: 75,
            risk_level: 'high',
            signals: ['Signal 1'],
            review_url: 'url',
            timestamp: mockTimestamp,
          },
        },
        {
          type: 'new_campaign_created',
          payload: {
            workspace_id: 'ws-4',
            workspace_name: 'Test',
            campaign_name: 'Campaign',
            campaign_id: 'camp-1',
            needs_setup: true,
            timestamp: mockTimestamp,
          },
        },
        {
          type: 'ignition_failed',
          payload: {
            workspace_id: 'ws-5',
            workspace_name: 'Test',
            error_message: 'Error',
            retry_count: 3,
            failed_at: mockTimestamp,
            timestamp: mockTimestamp,
          },
        },
        {
          type: 'setup_not_reviewed_24h',
          payload: {
            pending_count: 3,
            oldest_workspace_id: 'ws-6',
            oldest_workspace_name: 'Old',
            hours_pending: 26,
          },
        },
      ];

      for (const { type, payload } of eventTypes) {
        const result = await dispatcher.send({
          event_type: type,
          channels: ['gmail'],
          payload,
        });

        expect(result.all_succeeded).toBe(true);
      }

      expect(gmailChannel.sentMessages).toHaveLength(6);
    });
  });
});

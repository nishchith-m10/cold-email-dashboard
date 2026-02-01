/**
 * GENESIS PART VI - PHASE 60.C: ADMIN NOTIFICATION SYSTEM
 * Notification Dispatcher
 * 
 * Coordinates sending notifications across multiple channels
 */

import {
  NotificationRequest,
  NotificationSendResult,
  NotificationChannel,
  NotificationEventType,
  AnyNotificationPayload,
  ChannelSendResult,
} from './notification-types';
import { INotificationChannel } from './notification-channels';
import { randomUUID } from 'crypto';

/**
 * Notification Dispatcher
 * Manages notification sending across multiple channels
 */
export class NotificationDispatcher {
  private channels: Map<NotificationChannel, INotificationChannel> = new Map();

  /**
   * Register a notification channel
   */
  registerChannel(channel: INotificationChannel): void {
    this.channels.set(channel.name, channel);
  }

  /**
   * Unregister a notification channel
   */
  unregisterChannel(channelName: NotificationChannel): void {
    this.channels.delete(channelName);
  }

  /**
   * Get registered channels
   */
  getRegisteredChannels(): NotificationChannel[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Check if a channel is registered
   */
  isChannelRegistered(channelName: NotificationChannel): boolean {
    return this.channels.has(channelName);
  }

  /**
   * Send notification to specified channels
   */
  async send(request: NotificationRequest): Promise<NotificationSendResult> {
    const notificationId = randomUUID();
    const results: ChannelSendResult[] = [];

    // Send to each requested channel in parallel
    const sendPromises = request.channels.map(async (channelName) => {
      const channel = this.channels.get(channelName);
      
      if (!channel) {
        return {
          channel: channelName,
          success: false,
          error: `Channel '${channelName}' is not registered`,
        } as ChannelSendResult;
      }

      try {
        return await channel.send(request.event_type, request.payload);
      } catch (error) {
        return {
          channel: channelName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ChannelSendResult;
      }
    });

    const channelResults = await Promise.all(sendPromises);
    results.push(...channelResults);

    const allSucceeded = results.every(r => r.success);
    const anySucceeded = results.some(r => r.success);

    return {
      notification_id: notificationId,
      event_type: request.event_type,
      channels_attempted: request.channels,
      results,
      all_succeeded: allSucceeded,
      any_succeeded: anySucceeded,
    };
  }

  /**
   * Send notification to single channel
   */
  async sendToChannel(
    channelName: NotificationChannel,
    eventType: NotificationEventType,
    payload: AnyNotificationPayload
  ): Promise<ChannelSendResult> {
    const channel = this.channels.get(channelName);
    
    if (!channel) {
      return {
        channel: channelName,
        success: false,
        error: `Channel '${channelName}' is not registered`,
      };
    }

    return await channel.send(eventType, payload);
  }

  /**
   * Send notification to all registered channels
   */
  async sendToAll(
    eventType: NotificationEventType,
    payload: AnyNotificationPayload
  ): Promise<NotificationSendResult> {
    const allChannels = Array.from(this.channels.keys());
    
    return await this.send({
      event_type: eventType,
      channels: allChannels,
      payload,
    });
  }

  /**
   * Validate notification request
   */
  validateRequest(request: NotificationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if event type is valid
    const validEventTypes: NotificationEventType[] = [
      'client_first_login',
      'droplet_ready_for_setup',
      'high_risk_signup',
      'new_campaign_created',
      'ignition_failed',
      'setup_not_reviewed_24h',
    ];

    if (!validEventTypes.includes(request.event_type)) {
      errors.push(`Invalid event type: ${request.event_type}`);
    }

    // Check if at least one channel is specified
    if (!request.channels || request.channels.length === 0) {
      errors.push('At least one notification channel must be specified');
    }

    // Check if payload is provided
    if (!request.payload || typeof request.payload !== 'object') {
      errors.push('Notification payload is required');
    } else {
      // Check for required fields based on event type (only if payload exists)
      if (request.event_type !== 'setup_not_reviewed_24h') {
        if (!('workspace_id' in request.payload) || !request.payload.workspace_id) {
          errors.push('workspace_id is required in payload');
        }
        if (!('workspace_name' in request.payload) || !request.payload.workspace_name) {
          errors.push('workspace_name is required in payload');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

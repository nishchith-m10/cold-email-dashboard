/**
 * GENESIS PART VI - PHASE 60.C: ADMIN NOTIFICATION SYSTEM
 * Notification channel interfaces and implementations
 */

import {
  NotificationChannel,
  NotificationEventType,
  AnyNotificationPayload,
  ChannelSendResult,
} from './notification-types';
import { NotificationTemplate, GmailTemplates, TelegramTemplates } from './notification-templates';

/**
 * Abstract notification channel interface
 */
export interface INotificationChannel {
  readonly name: NotificationChannel;
  send(eventType: NotificationEventType, payload: AnyNotificationPayload): Promise<ChannelSendResult>;
  getTemplate(eventType: NotificationEventType, payload: AnyNotificationPayload): NotificationTemplate;
}

/**
 * Gmail channel configuration
 */
export interface GmailChannelConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_address: string;
  to_address: string;
}

/**
 * Telegram channel configuration
 */
export interface TelegramChannelConfig {
  bot_token: string;
  chat_id: string;
}

/**
 * Gmail notification channel
 */
export class GmailChannel implements INotificationChannel {
  readonly name: NotificationChannel = 'gmail';
  
  constructor(private config: GmailChannelConfig) {}

  async send(
    eventType: NotificationEventType,
    payload: AnyNotificationPayload
  ): Promise<ChannelSendResult> {
    try {
      const template = this.getTemplate(eventType, payload);
      
      // In production, this would use nodemailer or similar
      // For now, we'll simulate the send
      const success = await this.sendEmail(template.subject!, template.body);
      
      return {
        channel: 'gmail',
        success,
        sent_at: new Date(),
      };
    } catch (error) {
      return {
        channel: 'gmail',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getTemplate(eventType: NotificationEventType, payload: AnyNotificationPayload): NotificationTemplate {
    switch (eventType) {
      case 'client_first_login':
        return GmailTemplates.clientFirstLogin(payload as any);
      case 'droplet_ready_for_setup':
        return GmailTemplates.dropletReady(payload as any);
      case 'high_risk_signup':
        return GmailTemplates.highRiskSignup(payload as any);
      case 'new_campaign_created':
        return GmailTemplates.newCampaign(payload as any);
      case 'ignition_failed':
        return GmailTemplates.ignitionFailed(payload as any);
      case 'setup_not_reviewed_24h':
        return GmailTemplates.setupNotReviewed(payload as any);
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  private async sendEmail(subject: string, body: string): Promise<boolean> {
    // Production implementation would use nodemailer:
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({...});
    
    // For now, simulate success
    return true;
  }
}

/**
 * Telegram notification channel
 */
export class TelegramChannel implements INotificationChannel {
  readonly name: NotificationChannel = 'telegram';
  
  constructor(private config: TelegramChannelConfig) {}

  async send(
    eventType: NotificationEventType,
    payload: AnyNotificationPayload
  ): Promise<ChannelSendResult> {
    try {
      const template = this.getTemplate(eventType, payload);
      
      // In production, this would use Telegram Bot API
      const success = await this.sendTelegramMessage(template.body);
      
      return {
        channel: 'telegram',
        success,
        sent_at: new Date(),
      };
    } catch (error) {
      return {
        channel: 'telegram',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getTemplate(eventType: NotificationEventType, payload: AnyNotificationPayload): NotificationTemplate {
    switch (eventType) {
      case 'client_first_login':
        return TelegramTemplates.clientFirstLogin(payload as any);
      case 'droplet_ready_for_setup':
        return TelegramTemplates.dropletReady(payload as any);
      case 'high_risk_signup':
        return TelegramTemplates.highRiskSignup(payload as any);
      case 'new_campaign_created':
        return TelegramTemplates.newCampaign(payload as any);
      case 'ignition_failed':
        return TelegramTemplates.ignitionFailed(payload as any);
      case 'setup_not_reviewed_24h':
        return TelegramTemplates.setupNotReviewed(payload as any);
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  private async sendTelegramMessage(text: string): Promise<boolean> {
    // Production implementation would use Telegram Bot API:
    // const url = `https://api.telegram.org/bot${this.config.bot_token}/sendMessage`;
    // await fetch(url, { method: 'POST', body: JSON.stringify({...}) });
    
    // For now, simulate success
    return true;
  }
}

/**
 * Mock channel for testing
 */
export class MockNotificationChannel implements INotificationChannel {
  readonly name: NotificationChannel;
  public sentMessages: Array<{ eventType: NotificationEventType; payload: AnyNotificationPayload }> = [];
  private shouldFail: boolean = false;

  constructor(name: NotificationChannel, shouldFail: boolean = false) {
    this.name = name;
    this.shouldFail = shouldFail;
  }

  async send(
    eventType: NotificationEventType,
    payload: AnyNotificationPayload
  ): Promise<ChannelSendResult> {
    this.sentMessages.push({ eventType, payload });

    if (this.shouldFail) {
      return {
        channel: this.name,
        success: false,
        error: 'Mock failure',
      };
    }

    return {
      channel: this.name,
      success: true,
      sent_at: new Date(),
    };
  }

  getTemplate(eventType: NotificationEventType, payload: AnyNotificationPayload): NotificationTemplate {
    return {
      subject: `Mock: ${eventType}`,
      body: `Mock notification for ${eventType}`,
    };
  }

  reset() {
    this.sentMessages = [];
    this.shouldFail = false;
  }

  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }
}

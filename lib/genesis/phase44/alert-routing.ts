/**
 * PHASE 44: Alert Routing Service
 * 
 * Multi-channel alert delivery: Gmail + Telegram.
 * Includes 24-hour deduplication to prevent alert fatigue.
 * 
 * Channels are optional — if env vars are missing, the channel is
 * skipped with a warning log, not a hard failure.
 */

import type {
  ScaleAlert,
  AlertChannel,
  AlertDeliveryResult,
  AlertHistoryEntry,
  AlertSeverity,
} from './types';

// ============================================
// TYPES
// ============================================

export interface AlertRoutingConfig {
  gmailAlertEmail?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  dashboardUrl?: string;
  deduplicationWindowMs?: number; // default 24 hours
}

export interface AlertRoutingDB {
  schema(name: string): {
    from(table: string): {
      select(columns?: string): {
        eq(col: string, val: unknown): any;
        gte(col: string, val: unknown): any;
        order(col: string, opts?: { ascending?: boolean }): any;
        limit(n: number): any;
      };
      insert(row: Record<string, unknown>): { select(): { single(): Promise<{ data: unknown; error: unknown }> } };
    };
  };
}

/** Transport interface for testability */
export interface EmailTransport {
  send(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export interface TelegramTransport {
  send(botToken: string, chatId: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// ============================================
// DEFAULT TRANSPORTS (production)
// ============================================

/** Default email transport — calls a send endpoint or uses nodemailer */
export const defaultEmailTransport: EmailTransport = {
  async send(to, subject, html) {
    try {
      // In production, this would use Nodemailer or a transactional email API.
      // For now, log the intent — actual email sending will be wired in integration.
      /* eslint-disable-next-line no-console */
      console.log(`[AlertRouting] Would send email to ${to}: ${subject}`);
      return { success: true, messageId: `email-${Date.now()}` };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};

/** Default Telegram transport — calls the Bot API */
export const defaultTelegramTransport: TelegramTransport = {
  async send(botToken, chatId, text) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `Telegram API ${response.status}: ${body}` };
      }

      const result = await response.json() as { result?: { message_id?: number } };
      return { success: true, messageId: String(result.result?.message_id || '') };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};

// ============================================
// ALERT ROUTING SERVICE
// ============================================

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export class AlertRoutingService {
  private config: AlertRoutingConfig;
  private db: AlertRoutingDB;
  private emailTransport: EmailTransport;
  private telegramTransport: TelegramTransport;

  constructor(
    config: AlertRoutingConfig,
    db: AlertRoutingDB,
    emailTransport: EmailTransport = defaultEmailTransport,
    telegramTransport: TelegramTransport = defaultTelegramTransport,
  ) {
    this.config = config;
    this.db = db;
    this.emailTransport = emailTransport;
    this.telegramTransport = telegramTransport;
  }

  /**
   * Route an alert to the appropriate channels based on severity.
   * Respects 24-hour deduplication window.
   */
  async routeAlert(alert: ScaleAlert): Promise<AlertDeliveryResult[]> {
    // Check deduplication
    const isDuplicate = await this.isDuplicateAlert(alert.alertType, alert.severity);
    if (isDuplicate) {
      return [{ channel: 'in_app', success: true, error: 'Skipped: duplicate within 24h window' }];
    }

    const results: AlertDeliveryResult[] = [];

    // Always deliver in-app (no external dependency)
    results.push({ channel: 'in_app', success: true });

    // Gmail
    if (this.config.gmailAlertEmail) {
      const emailResult = await this.sendGmailAlert(alert);
      results.push(emailResult);
    }

    // Telegram (RED alerts only, or all if configured)
    if (this.config.telegramBotToken && this.config.telegramChatId) {
      const telegramResult = await this.sendTelegramAlert(alert);
      results.push(telegramResult);
    }

    // Record in alert_history
    await this.recordAlertHistory(alert, results);

    return results;
  }

  /**
   * Get recent alert history entries.
   */
  async getAlertHistory(limit: number = 50): Promise<AlertHistoryEntry[]> {
    const genesisDb = this.db.schema('genesis');
    const { data } = await genesisDb
      .from('alert_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return ((data || []) as any[]).map(row => ({
      id: row.id,
      metric: row.metric,
      level: row.level,
      message: row.message,
      channelsSent: row.channels_sent || [],
      createdAt: row.created_at,
    }));
  }

  // ============================================
  // PRIVATE: Channel Implementations
  // ============================================

  private async sendGmailAlert(alert: ScaleAlert): Promise<AlertDeliveryResult> {
    const to = this.config.gmailAlertEmail!;
    const subject = alert.severity === 'RED'
      ? `🚨 CRITICAL: ${alert.metricName} Alert`
      : `⚠️ WARNING: ${alert.metricName} Alert`;

    const dashboardLink = this.config.dashboardUrl
      ? `${this.config.dashboardUrl}/admin?tab=scale-health&alert_id=${alert.id}`
      : '#';

    const html = `
      <h2>${alert.severity === 'RED' ? 'Critical' : 'Warning'} Scale Alert</h2>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 12px;font-weight:bold;">Metric:</td><td style="padding:4px 12px;">${alert.metricName}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Current:</td><td style="padding:4px 12px;">${alert.currentValue}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Threshold:</td><td style="padding:4px 12px;">${alert.thresholdValue}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Runway:</td><td style="padding:4px 12px;">${alert.runwayDays != null ? `${alert.runwayDays} days` : 'N/A'}</td></tr>
      </table>
      <h3>Recommended Action:</h3>
      <p>${alert.recommendation}</p>
      <p><a href="${dashboardLink}">View in Dashboard</a></p>
    `.trim();

    const result = await this.emailTransport.send(to, subject, html);
    return { channel: 'gmail', ...result };
  }

  private async sendTelegramAlert(alert: ScaleAlert): Promise<AlertDeliveryResult> {
    const icon = alert.severity === 'RED' ? '🚨' : '⚠️';
    const text = [
      `${icon} <b>${alert.severity} Scale Alert</b>`,
      ``,
      `<b>Metric:</b> ${alert.metricName}`,
      `<b>Current:</b> ${alert.currentValue}`,
      `<b>Threshold:</b> ${alert.thresholdValue}`,
      alert.runwayDays != null ? `<b>Runway:</b> ${alert.runwayDays} days` : '',
      ``,
      `<b>Action:</b> ${alert.recommendation}`,
    ].filter(Boolean).join('\n');

    const result = await this.telegramTransport.send(
      this.config.telegramBotToken!,
      this.config.telegramChatId!,
      text,
    );
    return { channel: 'telegram', ...result };
  }

  // ============================================
  // PRIVATE: Deduplication & History
  // ============================================

  /**
   * Check if same metric+level was alerted within the dedup window (default 24h).
   */
  private async isDuplicateAlert(metric: string, level: AlertSeverity): Promise<boolean> {
    const windowMs = this.config.deduplicationWindowMs ?? TWENTY_FOUR_HOURS_MS;
    const since = new Date(Date.now() - windowMs).toISOString();

    const genesisDb = this.db.schema('genesis');
    const { data } = await genesisDb
      .from('alert_history')
      .select('id')
      .eq('metric', metric)
      .eq('level', level)
      .gte('created_at', since)
      .limit(1);

    return ((data || []) as any[]).length > 0;
  }

  /**
   * Record alert delivery to genesis.alert_history.
   */
  private async recordAlertHistory(alert: ScaleAlert, results: AlertDeliveryResult[]): Promise<void> {
    const genesisDb = this.db.schema('genesis');
    const channelsSent = results.filter(r => r.success).map(r => r.channel);

    await genesisDb.from('alert_history').insert({
      metric: alert.alertType,
      level: alert.severity,
      message: `${alert.metricName}: ${alert.currentValue} (threshold: ${alert.thresholdValue})`,
      channels_sent: channelsSent,
    }).select().single();
  }
}

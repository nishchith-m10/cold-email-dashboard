/**
 * GENESIS PART VI - PHASE 60.C: ADMIN NOTIFICATION SYSTEM
 * Type definitions for admin notifications
 */

/**
 * Notification channels
 */
export type NotificationChannel = 'gmail' | 'telegram';

/**
 * Notification event types
 */
export type NotificationEventType =
  | 'client_first_login'
  | 'droplet_ready_for_setup'
  | 'high_risk_signup'
  | 'new_campaign_created'
  | 'ignition_failed'
  | 'setup_not_reviewed_24h';

/**
 * Base notification payload
 */
export interface NotificationPayload {
  workspace_id: string;
  workspace_name: string;
  timestamp: Date;
}

/**
 * Client first login payload
 */
export interface ClientFirstLoginPayload extends NotificationPayload {
  user_email: string;
  user_name?: string;
}

/**
 * Droplet ready for setup payload
 */
export interface DropletReadyPayload extends NotificationPayload {
  user_email: string;
  n8n_url: string;
  n8n_owner_email: string;
  n8n_owner_password: string;
  admin_dashboard_url: string;
}

/**
 * High-risk signup payload
 */
export interface HighRiskSignupPayload extends NotificationPayload {
  user_email: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  signals: string[];
  review_url: string;
}

/**
 * New campaign created payload
 */
export interface NewCampaignPayload extends NotificationPayload {
  campaign_name: string;
  campaign_id: string;
  needs_setup: boolean;
}

/**
 * Ignition failed payload
 */
export interface IgnitionFailedPayload extends NotificationPayload {
  error_message: string;
  retry_count: number;
  failed_at: Date;
}

/**
 * Setup not reviewed (24h escalation) payload
 */
export interface SetupNotReviewedPayload {
  pending_count: number;
  oldest_workspace_id: string;
  oldest_workspace_name: string;
  hours_pending: number;
}

/**
 * Union type for all notification payloads
 */
export type AnyNotificationPayload =
  | ClientFirstLoginPayload
  | DropletReadyPayload
  | HighRiskSignupPayload
  | NewCampaignPayload
  | IgnitionFailedPayload
  | SetupNotReviewedPayload;

/**
 * Notification send request
 */
export interface NotificationRequest {
  event_type: NotificationEventType;
  channels: NotificationChannel[];
  payload: AnyNotificationPayload;
}

/**
 * Notification send result for a single channel
 */
export interface ChannelSendResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  sent_at?: Date;
}

/**
 * Overall notification send result
 */
export interface NotificationSendResult {
  notification_id: string;
  event_type: NotificationEventType;
  channels_attempted: NotificationChannel[];
  results: ChannelSendResult[];
  all_succeeded: boolean;
  any_succeeded: boolean;
}

/**
 * Notification log entry (for database)
 */
export interface NotificationLogEntry {
  id: string;
  workspace_id?: string;
  event_type: NotificationEventType;
  channels: NotificationChannel[];
  sent_at: Date;
  acknowledged_at?: Date;
  payload: Record<string, any>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  max_attempts: number;
  delays_seconds: number[]; // [30, 60, 120] for 3 retries
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  threshold_hours: number;
  repeat_interval_hours: number;
}

/**
 * Default retry configuration (for ignition failures)
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  max_attempts: 3,
  delays_seconds: [30, 60, 120],
};

/**
 * Default escalation configuration (for pending setup)
 */
export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  threshold_hours: 24,
  repeat_interval_hours: 12,
};

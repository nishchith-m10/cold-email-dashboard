/**
 * Campaign Notification Helper
 * 
 * Utility function to create notifications for campaign milestone events
 */

import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import type { NotificationType } from '@/lib/notification-utils';
import type { Json } from '@/lib/database.types';

interface CreateCampaignNotificationParams {
  workspaceId: string;
  campaignName: string;
  campaignId?: string;
  type: 'started' | 'paused' | 'completed' | 'error';
  errorMessage?: string;
  userId?: string | null; // If null, notification is broadcast to all workspace users
}

/**
 * Maps campaign event types to notification types
 */
function getNotificationType(eventType: CreateCampaignNotificationParams['type']): NotificationType {
  switch (eventType) {
    case 'started':
      return 'system'; // Info notification
    case 'paused':
      return 'system'; // Warning notification
    case 'completed':
      return 'campaign_complete'; // Success notification
    case 'error':
      return 'system'; // Danger notification
    default:
      return 'system';
  }
}

/**
 * Gets notification title and message based on event type
 */
function getNotificationContent(
  eventType: CreateCampaignNotificationParams['type'],
  campaignName: string,
  errorMessage?: string
): { title: string; message: string } {
  switch (eventType) {
    case 'started':
      return {
        title: 'Campaign Started',
        message: `Campaign "${campaignName}" has been started and is now active.`,
      };
    case 'paused':
      return {
        title: 'Campaign Paused',
        message: `Campaign "${campaignName}" has been paused.`,
      };
    case 'completed':
      return {
        title: 'Campaign Completed',
        message: `Campaign "${campaignName}" has been completed successfully.`,
      };
    case 'error':
      return {
        title: 'Campaign Error',
        message: `Campaign "${campaignName}" encountered an error${errorMessage ? `: ${errorMessage}` : ''}.`,
      };
    default:
      return {
        title: 'Campaign Update',
        message: `Campaign "${campaignName}" status has been updated.`,
      };
  }
}

/**
 * Creates a notification for a campaign milestone event
 * 
 * @param params - Notification parameters
 * @returns Promise resolving to the created notification or null if creation failed
 */
export async function createCampaignNotification(
  params: CreateCampaignNotificationParams
): Promise<{ id: string } | null> {
  if (!supabaseAdmin) {
    console.error('Cannot create notification: Database not configured');
    return null;
  }

  const { workspaceId, campaignName, campaignId, type, errorMessage, userId } = params;

  const notificationType = getNotificationType(type);
  const { title, message } = getNotificationContent(type, campaignName, errorMessage);

  // Build payload with campaign details
  const payload: Record<string, unknown> = {
    campaign_id: campaignId,
    campaign_name: campaignName,
    event_type: type,
  };

  if (errorMessage) {
    payload.error_message = errorMessage;
  }

  // Insert notification
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      workspace_id: workspaceId || DEFAULT_WORKSPACE_ID,
      user_id: userId || null, // null = broadcast to all workspace users
      type: notificationType,
      title,
      message,
      related_campaign: campaignName,
      payload: payload as Json,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create campaign notification:', error);
    return null;
  }

  return data;
}

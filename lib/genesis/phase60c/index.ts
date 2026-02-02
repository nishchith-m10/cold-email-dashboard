/**
 * GENESIS PART VI - PHASE 60.C: ADMIN NOTIFICATION SYSTEM
 * Main exports
 */

// Types
export * from './notification-types';

// Templates
export { GmailTemplates, TelegramTemplates } from './notification-templates';
export type { NotificationTemplate } from './notification-templates';

// Channels
export {
  GmailChannel,
  TelegramChannel,
  MockNotificationChannel,
} from './notification-channels';
export type {
  INotificationChannel,
  GmailChannelConfig,
  TelegramChannelConfig,
} from './notification-channels';

// Dispatcher
export { NotificationDispatcher } from './notification-dispatcher';

/**
 * Telegram Alert Helper
 *
 * Sends messages to a Telegram chat via the Bot API.
 * Used by watchdog and scale-alerts services for real-time alerting.
 *
 * Gracefully degrades: if credentials are missing or the API call fails,
 * errors are logged but never crash the calling service.
 */

import type { Logger } from '../config';

const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Send a message to a Telegram chat.
 *
 * @param message - The alert text to send (supports Telegram markdown)
 * @param logger  - Pino logger instance for error reporting
 */
export async function sendTelegramAlert(
  message: string,
  logger: Logger
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    logger.warn(
      'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram alert'
    );
    return;
  }

  try {
    const url = `${TELEGRAM_API}/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error(
        { status: res.status, body },
        'Telegram API returned non-OK status'
      );
    }
  } catch (err) {
    logger.error(
      { err },
      'Failed to send Telegram alert — network error'
    );
  }
}

/**
 * SMTP SERVICE - Email Sending & Reply Detection
 * 
 * Provides SMTP email sending with threading support and IMAP reply detection.
 * Used by n8n workflows for multi-provider email abstraction.
 * 
 * Endpoints:
 * - POST /send: Send email via SMTP (with optional threading)
 * - GET /check-reply: Check if recipient replied (IMAP)
 */

import nodemailer, { Transporter } from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

// ============================================
// INTERFACES
// ============================================

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  htmlBody: string;
  raw?: string;              // Base64-encoded RFC 2822 raw email (for threading)
  inReplyTo?: string;        // Message-ID for threading
  references?: string;       // Message-ID chain for threading
}

export interface SendEmailResponse {
  success: boolean;
  messageId: string;
  error?: string;
}

export interface CheckReplyRequest {
  email: string;             // Recipient email to check
  messageId: string;         // Original message ID to check replies for
}

export interface SendEmailResponse {
  success: boolean;
  messageId: string;
  error?: string;
}

export interface CheckReplyResponse {
  replied: boolean;
  replyCount: number;
  error?: string;
}

// ============================================
// SMTP SERVICE CLASS
// ============================================

export class SMTPService {
  private config: SMTPConfig;
  private transporter: Transporter | null = null;

  constructor(config: SMTPConfig) {
    this.config = config;
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter
   */
  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
        tls: {
          rejectUnauthorized: false, // For self-signed certs
        },
      });

      console.log('✅ SMTP transporter initialized:', this.config.host);
    } catch (error) {
      console.error('❌ Failed to initialize SMTP transporter:', error);
      throw error;
    }
  }

  /**
   * SEND EMAIL
   * Supports both simple HTML and raw RFC 2822 (for threading)
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    if (!this.transporter) {
      return {
        success: false,
        messageId: '',
        error: 'SMTP transporter not initialized',
      };
    }

    try {
      // If raw email provided (for threading), decode and send
      if (request.raw) {
        const decoded = Buffer.from(request.raw, 'base64').toString('utf-8');
        
        const info = await this.transporter.sendMail({
          envelope: {
            from: this.config.fromEmail,
            to: request.to,
          },
          raw: decoded,
        });

        return {
          success: true,
          messageId: info.messageId,
        };
      }

      // Standard email send (Email 1, no threading)
      const mailOptions: any = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: request.to,
        subject: request.subject,
        html: request.htmlBody,
      };

      // Add threading headers if provided (Email 2, 3)
      if (request.inReplyTo) {
        mailOptions.inReplyTo = request.inReplyTo;
        mailOptions.references = request.references || request.inReplyTo;
      }

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        messageId: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * CHECK REPLY
   * Uses IMAP to check if recipient replied to original message
   */
  async checkReply(request: CheckReplyRequest): Promise<CheckReplyResponse> {
    return new Promise((resolve) => {
      const imap = new Imap({
        user: this.config.user,
        password: this.config.pass,
        host: this.config.host.replace('smtp', 'imap'), // smtp.example.com -> imap.example.com
        port: 993,
        tls: true,
        tlsOptions: {
          rejectUnauthorized: false,
        },
      });

      let replyCount = 0;

          imap.once('ready', () => {
            imap.openBox('INBOX', true, (err: Error | null, box: any) => {
              if (err) {
                console.error('❌ IMAP openBox error:', err);
                imap.end();
                resolve({
                  replied: false,
                  replyCount: 0,
                  error: err.message,
                });
                return;
              }

              // Search for emails FROM the recipient (potential replies)
              imap.search(
                [
                  ['FROM', request.email],
                  ['SINCE', this.getSearchDateDaysAgo(14)], // Last 14 days
                ],
                (err: Error | null, results: any) => {
                  if (err) {
                    console.error('❌ IMAP search error:', err);
                    imap.end();
                    resolve({
                      replied: false,
                      replyCount: 0,
                      error: err.message,
                    });
                    return;
                  }

                  if (!results || results.length === 0) {
                    imap.end();
                    resolve({
                      replied: false,
                      replyCount: 0,
                    });
                    return;
                  }

                  // Fetch messages to check In-Reply-To header
                  const fetch = imap.fetch(results, {
                    bodies: 'HEADER.FIELDS (IN-REPLY-TO REFERENCES SUBJECT)',
                    struct: true,
                  });

                  fetch.on('message', (msg: any) => {
                    msg.on('body', (stream: any) => {
                      simpleParser(stream, (err: Error | null, parsed: any) => {
                        if (err) {
                          console.error('❌ Email parse error:', err);
                          return;
                        }

                        // Check if In-Reply-To or References matches our messageId
                        const inReplyTo = parsed.inReplyTo || '';
                        const references = parsed.references?.join(' ') || '';

                        if (
                          inReplyTo.includes(request.messageId) ||
                          references.includes(request.messageId)
                        ) {
                          replyCount++;
                        }
                      });
                    });
                  });

                  fetch.once('error', (err: Error) => {
                    console.error('❌ IMAP fetch error:', err);
                    imap.end();
                    resolve({
                      replied: false,
                      replyCount: 0,
                      error: err.message,
                    });
                  });

                  fetch.once('end', () => {
                    imap.end();
                    resolve({
                      replied: replyCount > 0,
                      replyCount,
                    });
                  });
                }
              );
            });
          });

          imap.once('error', (err: Error) => {
            console.error('❌ IMAP connection error:', err);
            resolve({
              replied: false,
              replyCount: 0,
              error: err.message,
            });
          });

      imap.once('end', () => {
        // Connection closed
      });

      // Connect
      imap.connect();
    });
  }

  /**
   * UTILITY: Get date string for IMAP search (N days ago)
   */
  private getSearchDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0].replace(/-/g, '-');
  }

  /**
   * VERIFY CONNECTION
   * Test SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP verification failed:', error);
      return false;
    }
  }
}

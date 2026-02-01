/**
 * Type declarations for mailparser module
 */
declare module 'mailparser' {
  export interface ParsedMail {
    headers: Map<string, string | string[]>;
    subject?: string;
    from?: {
      value: Array<{
        address: string;
        name: string;
      }>;
      text: string;
    };
    to?: {
      value: Array<{
        address: string;
        name: string;
      }>;
      text: string;
    };
    messageId?: string;
    inReplyTo?: string;
    references?: string | string[];
    text?: string;
    html?: string | false;
    textAsHtml?: string;
    date?: Date;
  }

  export function simpleParser(
    source: Buffer | string | NodeJS.ReadableStream,
    options?: any
  ): Promise<ParsedMail>;
}

/**
 * PHASE 65.3: Calendly Link Validator
 * 
 * Validates booking links (Calendly, Cal.com, etc.) before campaign launch.
 * 
 * Checks:
 * 1. URL format (regex for known providers)
 * 2. HTTP status (HEAD request, expect 200)
 * 3. Page content (check for booking keywords)
 */

export interface CalendlyValidationResult {
  valid: boolean;
  provider?: 'calendly' | 'cal.com' | 'savvycal' | 'chili-piper' | 'unknown';
  error?: string;
  warnings?: string[];
  checks: {
    formatValid: boolean;
    linkAccessible: boolean;
    contentValid?: boolean;
  };
}

export interface ValidationOptions {
  timeout?: number; // Milliseconds, default 5000
  skipContentCheck?: boolean; // Skip page content check (faster)
}

/**
 * Calendly Link Validator
 * 
 * Fast, reliable validation of booking links.
 * No browser automation - just format check + HEAD request + optional content check.
 */
export class CalendlyValidator {
  private readonly defaultTimeout = 5000; // 5 seconds
  
  // Known booking providers and their URL patterns
  // Order matters: Check more specific patterns first (savvycal before cal.com)
  private readonly providers = [
    { name: 'calendly' as const, pattern: /calendly\.com\/[a-zA-Z0-9_-]+/ },
    { name: 'savvycal' as const, pattern: /savvycal\.com\/[a-zA-Z0-9_-]+/ },
    { name: 'cal.com' as const, pattern: /cal\.com\/[a-zA-Z0-9_-]+/ },
    { name: 'chili-piper' as const, pattern: /chilipiper\.com\/[a-zA-Z0-9_-]+/ },
  ];

  // Keywords to check in page content (if content check is enabled)
  private readonly bookingKeywords = [
    'schedule',
    'booking',
    'appointment',
    'meeting',
    'calendar',
    'book a call',
    'book a meeting',
    'select a time',
  ];

  /**
   * Validate a booking link
   * 
   * Process:
   * 1. Format validation (URL structure + provider recognition)
   * 2. Accessibility check (HEAD request)
   * 3. Content validation (optional, checks for booking keywords)
   * 
   * Returns validation result with detailed checks
   */
  async validate(
    bookingUrl: string,
    options: ValidationOptions = {}
  ): Promise<CalendlyValidationResult> {
    const warnings: string[] = [];

    // 1. Format validation
    const formatCheck = this.validateFormat(bookingUrl);
    if (!formatCheck.valid) {
      return {
        valid: false,
        error: formatCheck.error,
        checks: {
          formatValid: false,
          linkAccessible: false,
        },
      };
    }

    // 2. Accessibility check
    const accessCheck = await this.checkAccessibility(bookingUrl, options);
    if (!accessCheck.accessible) {
      warnings.push(accessCheck.warning || 'Link may not be accessible');
    }

    // 3. Content validation (optional)
    let contentValid: boolean | undefined;
    if (!options.skipContentCheck && accessCheck.accessible) {
      const contentCheck = await this.checkContent(bookingUrl, options);
      contentValid = contentCheck.valid;
      if (!contentCheck.valid && contentCheck.warning) {
        warnings.push(contentCheck.warning);
      }
    }

    // Determine overall validity
    const valid = formatCheck.valid && accessCheck.accessible;

    return {
      valid,
      provider: formatCheck.provider,
      warnings: warnings.length > 0 ? warnings : undefined,
      checks: {
        formatValid: formatCheck.valid,
        linkAccessible: accessCheck.accessible,
        contentValid,
      },
    };
  }

  /**
   * Validate URL format
   * 
   * Checks:
   * - Valid URL structure
   * - HTTPS protocol (required for modern booking systems)
   * - Has path component (booking links need username/event)
   * - Recognized provider pattern
   */
  private validateFormat(url: string): {
    valid: boolean;
    provider?: 'calendly' | 'cal.com' | 'savvycal' | 'chili-piper' | 'unknown';
    error?: string;
  } {
    try {
      const parsed = new URL(url);

      // Must be https (all modern booking systems require it)
      if (parsed.protocol !== 'https:') {
        return {
          valid: false,
          error: 'Booking link must use HTTPS',
        };
      }

      // Must have a path (e.g., /username or /username/event)
      if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname.length <= 1) {
        return {
          valid: false,
          error: 'Booking link must include a username or event path',
        };
      }

      // Check against known providers
      for (const provider of this.providers) {
        if (provider.pattern.test(url)) {
          return {
            valid: true,
            provider: provider.name,
          };
        }
      }

      // Unknown provider, but valid URL
      return {
        valid: true,
        provider: 'unknown',
      };
    } catch {
      return {
        valid: false,
        error: 'Invalid URL format',
      };
    }
  }

  /**
   * Check link accessibility
   * 
   * Makes HEAD request to verify link returns 200 OK.
   * Warns (but doesn't fail) on 4xx/5xx errors.
   */
  private async checkAccessibility(
    url: string,
    options: ValidationOptions
  ): Promise<{ accessible: boolean; warning?: string }> {
    const timeout = options.timeout || this.defaultTimeout;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { accessible: true };
      }

      // Link exists but returns error status
      return {
        accessible: false,
        warning: `Link returned ${response.status} status`,
      };
    } catch (error) {
      // Timeout or network error
      return {
        accessible: false,
        warning: 'Link could not be reached (timeout or network error)',
      };
    }
  }

  /**
   * Check page content for booking keywords
   * 
   * Fetches page HTML and looks for booking-related keywords.
   * This is an optional check (can be skipped for faster validation).
   */
  private async checkContent(
    url: string,
    options: ValidationOptions
  ): Promise<{ valid: boolean; warning?: string }> {
    const timeout = options.timeout || this.defaultTimeout;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          valid: false,
          warning: 'Could not verify page content',
        };
      }

      const html = await response.text();
      const lowerHtml = html.toLowerCase();

      // Check for booking keywords
      const hasBookingKeyword = this.bookingKeywords.some(
        (keyword) => lowerHtml.includes(keyword)
      );

      if (!hasBookingKeyword) {
        return {
          valid: false,
          warning: 'Page does not appear to be a booking/scheduling page',
        };
      }

      return { valid: true };
    } catch {
      // Content check failed, but this is not critical
      return {
        valid: false,
        warning: 'Could not verify page content (timeout or error)',
      };
    }
  }

  /**
   * Quick format-only validation
   * 
   * Faster validation that only checks URL format.
   * Use when you don't need to verify link accessibility.
   */
  validateFormatOnly(bookingUrl: string): Pick<CalendlyValidationResult, 'valid' | 'provider' | 'error'> {
    const result = this.validateFormat(bookingUrl);
    return {
      valid: result.valid,
      provider: result.provider,
      error: result.error,
    };
  }
}

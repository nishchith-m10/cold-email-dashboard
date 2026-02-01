/**
 * PHASE 65.1: Brand Metadata Scraper
 * 
 * Simple metadata fetcher (Option B): Fetches og: meta tags from homepage.
 * No browser automation, no complex scraping, immediate fallback on failure.
 * 
 * For cold email, we only need:
 * - Company Name (og:title or title tag)
 * - Logo URL (og:image or favicon)
 * - Brief Description (og:description)
 */

export interface BrandMetadata {
  companyName?: string;
  logoUrl?: string;
  description?: string;
  success: boolean;
  error?: string;
}

export interface MetadataFetchOptions {
  timeout?: number; // Milliseconds, default 5000
  userAgent?: string;
}

/**
 * Brand Metadata Scraper
 * 
 * Simple, fast, reliable metadata extraction from homepage.
 * NO browser automation - just HTTP GET + HTML parsing.
 */
export class BrandMetadataScraper {
  private readonly defaultTimeout = 5000; // 5 seconds
  private readonly defaultUserAgent = 'Genesis Metadata Scraper/1.0';

  /**
   * Fetch brand metadata from a website
   * 
   * Process:
   * 1. Normalize URL (add https://, remove path)
   * 2. HTTP GET to homepage (5s timeout)
   * 3. Extract og: meta tags + fallbacks
   * 4. Return structured data
   * 
   * If ANY step fails → return { success: false, error }
   */
  async fetchMetadata(
    websiteUrl: string,
    options: MetadataFetchOptions = {}
  ): Promise<BrandMetadata> {
    try {
      // 1. Normalize URL
      const url = this.normalizeUrl(websiteUrl);
      if (!url) {
        return {
          success: false,
          error: 'Invalid URL format',
        };
      }

      // 2. Fetch homepage HTML
      const html = await this.fetchHtml(url, options);
      if (!html) {
        return {
          success: false,
          error: 'Failed to fetch website (timeout or blocked)',
        };
      }

      // 3. Extract metadata
      const metadata = this.extractMetadata(html, url);

      return {
        ...metadata,
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Normalize URL to https:// homepage
   * 
   * Examples:
   * - "acmecorp.com" → "https://acmecorp.com"
   * - "http://acmecorp.com/about" → "https://acmecorp.com"
   * - "www.acmecorp.com" → "https://www.acmecorp.com"
   */
  private normalizeUrl(input: string): string | null {
    try {
      let url = input.trim();

      if (!url) {
        return null;
      }

      // Add protocol if missing
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }

      const parsed = new URL(url);

      // Only accept http/https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      // Validate hostname (must contain at least one dot for TLD)
      if (!parsed.hostname.includes('.')) {
        return null;
      }

      // Convert http to https
      const protocol = 'https:';

      // Return homepage only (no path)
      return `${protocol}//${parsed.host}`;
    } catch {
      return null;
    }
  }

  /**
   * Fetch HTML from URL with timeout
   * 
   * Returns null if:
   * - Timeout (5s)
   * - 403/429 (blocked)
   * - Network error
   */
  private async fetchHtml(
    url: string,
    options: MetadataFetchOptions
  ): Promise<string | null> {
    const timeout = options.timeout || this.defaultTimeout;
    const userAgent = options.userAgent || this.defaultUserAgent;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      // If blocked or forbidden, return null immediately
      if (response.status === 403 || response.status === 429) {
        return null;
      }

      if (!response.ok) {
        return null;
      }

      return await response.text();
    } catch (error) {
      // Timeout, network error, etc.
      return null;
    }
  }

  /**
   * Extract metadata from HTML
   * 
   * Priority:
   * 1. Open Graph tags (og:title, og:image, og:description)
   * 2. Fallback to standard tags (title, link[rel=icon], meta[name=description])
   */
  private extractMetadata(html: string, baseUrl: string): Omit<BrandMetadata, 'success' | 'error'> {
    return {
      companyName: this.extractCompanyName(html),
      logoUrl: this.extractLogoUrl(html, baseUrl),
      description: this.extractDescription(html),
    };
  }

  /**
   * Extract company name
   * 
   * Priority:
   * 1. og:title
   * 2. og:site_name
   * 3. <title> tag
   */
  private extractCompanyName(html: string): string | undefined {
    // Try og:title
    const ogTitle = this.extractMetaTag(html, 'og:title');
    if (ogTitle) return this.cleanText(ogTitle);

    // Try og:site_name
    const ogSiteName = this.extractMetaTag(html, 'og:site_name');
    if (ogSiteName) return this.cleanText(ogSiteName);

    // Fallback to <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return this.cleanText(titleMatch[1]);
    }

    return undefined;
  }

  /**
   * Extract logo URL
   * 
   * Priority:
   * 1. og:image
   * 2. link[rel="icon"]
   * 3. link[rel="apple-touch-icon"]
   */
  private extractLogoUrl(html: string, baseUrl: string): string | undefined {
    // Try og:image
    const ogImage = this.extractMetaTag(html, 'og:image');
    if (ogImage) return this.resolveUrl(ogImage, baseUrl);

    // Try favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    if (faviconMatch && faviconMatch[1]) {
      return this.resolveUrl(faviconMatch[1], baseUrl);
    }

    // Try apple-touch-icon
    const appleIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    if (appleIconMatch && appleIconMatch[1]) {
      return this.resolveUrl(appleIconMatch[1], baseUrl);
    }

    return undefined;
  }

  /**
   * Extract description
   * 
   * Priority:
   * 1. og:description
   * 2. meta[name="description"]
   */
  private extractDescription(html: string): string | undefined {
    // Try og:description
    const ogDescription = this.extractMetaTag(html, 'og:description');
    if (ogDescription) return this.cleanText(ogDescription);

    // Try standard description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch && descMatch[1]) {
      return this.cleanText(descMatch[1]);
    }

    return undefined;
  }

  /**
   * Extract Open Graph meta tag
   */
  private extractMetaTag(html: string, property: string): string | undefined {
    const regex = new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`,
      'i'
    );
    const match = html.match(regex);
    return match && match[1] ? match[1] : undefined;
  }

  /**
   * Clean extracted text
   * - Trim whitespace
   * - Remove extra spaces
   * - Decode HTML entities
   * - Truncate to reasonable length
   */
  private cleanText(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Max 500 chars
  }

  /**
   * Resolve relative URL to absolute
   * 
   * Examples:
   * - "/logo.png" + "https://acme.com" → "https://acme.com/logo.png"
   * - "//cdn.example.com/logo.png" → "https://cdn.example.com/logo.png"
   * - "https://other.com/logo.png" → "https://other.com/logo.png" (absolute)
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      // Protocol-relative URL
      if (url.startsWith('//')) {
        return `https:${url}`;
      }

      // Absolute URL
      if (/^https?:\/\//i.test(url)) {
        return url;
      }

      // Relative URL
      return new URL(url, baseUrl).toString();
    } catch {
      return url; // Return as-is if resolution fails
    }
  }
}

import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify to allow safe email formatting
 * while stripping dangerous XSS vectors.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 
    'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4',
    'blockquote'
  ],
  ALLOWED_ATTR: ['href', 'target', 'style', 'class'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  ADD_ATTR: ['target'], // We will force target="_blank" on links
};

/**
 * Sanitizes HTML content for safe rendering via dangerouslySetInnerHTML.
 * Removes XSS vectors while preserving safe formatting tags.
 * 
 * Note: This must be called in a Client Component or an environment where 'window' is defined,
 * unless JSDOM is configured server-side.
 * 
 * @param dirty - Raw HTML string from database
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';

  // Initialize DOMPurify (handles both browser and server-with-jsdom if needed later)
  // For now, assuming Client Component usage where window is available.
  const sanitizer = typeof window !== 'undefined' 
    ? DOMPurify(window) 
    : DOMPurify; // Fallback, though standard DOMPurify needs window

  // Force all links to open in new tab
  sanitizer.addHook('afterSanitizeAttributes', function(node) {
    if ('target' in node) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return sanitizer.sanitize(dirty, SANITIZE_CONFIG as any) as unknown as string;
}

/**
 * Detects if email body contains "Hey ," or similar patterns indicating 
 * a missing first name variable.
 * 
 * @param body - Email body content to check
 * @returns True if missing name pattern detected
 */
export function hasMissingNameVariable(body: string | null | undefined): boolean {
  if (!body) return false;
  
  // Normalize checking by removing extra whitespace
  const cleanBody = body.trim();
  
  // Common patterns for missing variables in cold email tools
  const patterns = [
    'Hey ,',
    'Hi ,',
    'Hello ,',
    'Dear ,'
  ];

  return patterns.some(pattern => cleanBody.includes(pattern));
}

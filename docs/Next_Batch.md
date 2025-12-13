### Batch 2: Security Utility

We need a utility to clean the HTML coming from your email drafts so it's safe to render in the browser.

**1. Create `lib/html-sanitizer.ts`**

Since `dompurify` relies on a window object (which doesn't exist on the server), we will structure this utility to work primarily in Client Components or ensure it handles the environment gracefully.

```typescript
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
 * * Note: This must be called in a Client Component or an environment where 'window' is defined,
 * unless JSDOM is configured server-side.
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

  return sanitizer.sanitize(dirty, SANITIZE_CONFIG as any);
}

/**
 * Detects if email body contains "Hey ," or similar patterns indicating 
 * a missing first name variable.
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
```

**2. Create Test File `__tests__/unit/lib/html-sanitizer.test.ts`**

*(If you don't have a `__tests__` folder yet, create it. If you aren't running Jest/Vitest locally, you can skip this, but it's good practice).*

```typescript
import { sanitizeHtml, hasMissingNameVariable } from '@/lib/html-sanitizer';

describe('HTML Sanitizer', () => {
  it('strips script tags', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('<p>Hello</p>');
  });

  it('preserves safe formatting', () => {
    const safe = '<b>Bold</b> and <i>Italic</i>';
    expect(sanitizeHtml(safe)).toBe(safe);
  });

  it('handles null input', () => {
    expect(sanitizeHtml(null)).toBe('');
  });
});

describe('Missing Name Detector', () => {
  it('detects missing name', () => {
    expect(hasMissingNameVariable('Hey , how are you?')).toBe(true);
  });

  it('ignores correct names', () => {
    expect(hasMissingNameVariable('Hey John,')).toBe(false);
  });
});
```

-----

### Batch 3: Type Definitions

We need to define the shape of the data for the new API endpoints.

**1. Update `lib/dashboard-types.ts`**

Add the following interfaces to the end of your existing file.

```typescript
// ... existing types ...

/* =========================================
   SEQUENCES / DRAFTS TYPES
   ========================================= */

/** Lightweight item for Sequences list sidebar */
export interface SequenceListItem {
  id: number;
  full_name: string | null;
  email_address: string;
  company_name: string | null;
  email_1_sent: boolean | null;
  email_2_sent: boolean | null;
  email_3_sent: boolean | null;
  created_at: string | null;
}

/** Paginated response for /api/sequences */
export interface SequenceListResponse {
  items: SequenceListItem[];
  next_cursor: number | null;
  total: number;
}

/** Heavy payload for /api/sequences/[id] details */
export interface SequenceDetail {
  id: number;
  full_name: string | null;
  email_address: string;
  company_name: string | null;
  
  // Draft Content
  email_1_subject: string | null;
  email_1_body: string | null;
  email_2_body: string | null;
  email_3_subject: string | null;
  email_3_body: string | null;
  
  // Status
  email_1_sent: boolean | null;
  email_2_sent: boolean | null;
  email_3_sent: boolean | null;
}

/** Quality flags for UI badges */
export interface SequenceQualityFlags {
  email_1_missing_name: boolean;
  email_2_missing_name: boolean;
  email_3_missing_name: boolean;
}
```
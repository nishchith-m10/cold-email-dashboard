'use client';

/**
 * NodeDetailDrawer — Slide-in panel showing full node details.
 *
 * Opens from the right side when a node is clicked on the canvas.
 * Shows name, type, category badge, all parameters (with special
 * rendering for cron, AI prompts, code blocks), and credentials.
 *
 * @module components/sandbox/flow/NodeDetailDrawer
 */

import { memo, useEffect, useRef } from 'react';
import { X, Lock, Clock, Code2, MessageSquare, ChevronRight } from 'lucide-react';
import type { GraphNode } from '@/lib/workflow-graph/types';
import { getNodeRegistryEntry } from '@/lib/workflow-graph/registry';
import { humanizeCron } from '@/lib/workflow-graph/cron-humanizer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  trigger: 'bg-green-500/10 text-green-600 dark:text-green-400',
  ai_llm: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  email_send: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  data_db: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  logic_routing: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  tracking: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  utility: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  unknown: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

/** Keys that are purely structural / internal to n8n and should be hidden */
const HIDDEN_PARAM_KEYS = new Set([
  'options', // Often empty or redundant
  'additionalFields',
]);

/** Long-text keys that should get monospace/pre rendering */
const PROMPT_LIKE_KEYS = new Set([
  'text', 'body', 'message', 'content', 'prompt',
  'systemMessage', 'userMessage', 'jsonOutput',
  'value', 'jsCode', 'code', 'html',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isLongString(v: unknown): boolean {
  return typeof v === 'string' && v.length > 80;
}

function isCronLike(key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return (
    key.toLowerCase().includes('cron') ||
    /^[\d*/,-]+(\s+[\d*/,-]+){4}$/.test(value.trim())
  );
}

function isCodeLike(key: string): boolean {
  return key.toLowerCase().includes('code') || key.toLowerCase().includes('script');
}

// ---------------------------------------------------------------------------
// Parameter renderers
// ---------------------------------------------------------------------------

function renderParamValue(key: string, value: unknown, depth: number = 0): React.ReactNode {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted-foreground italic text-xs">empty</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={`text-xs font-mono ${value ? 'text-green-600' : 'text-red-500'}`}>
        {value ? 'true' : 'false'}
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span className="font-mono text-xs">{value}</span>;
  }

  if (typeof value === 'string') {
    // Cron expression
    if (isCronLike(key, value)) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{value}</span>
          </div>
          <div className="text-xs text-muted-foreground pl-4.5">
            {humanizeCron(value)}
          </div>
        </div>
      );
    }

    // Code block
    if (isCodeLike(key)) {
      return (
        <div className="relative">
          <Code2 className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
          <pre className="text-xs font-mono bg-muted rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
            {value}
          </pre>
        </div>
      );
    }

    // Long text / prompts
    if (PROMPT_LIKE_KEYS.has(key) || isLongString(value)) {
      return (
        <div className="relative">
          <MessageSquare className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
          <pre className="text-xs font-mono bg-muted rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
            {value}
          </pre>
        </div>
      );
    }

    // Short string
    return <span className="text-xs break-all">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic text-xs">[]</span>;
    }
    return (
      <div className="space-y-1 pl-2 border-l border-border">
        {value.map((item, i) => (
          <div key={i} className="text-xs">
            {renderParamValue(`${key}[${i}]`, item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (isObject(value)) {
    const entries = Object.entries(value).filter(
      ([k]) => !HIDDEN_PARAM_KEYS.has(k),
    );
    if (entries.length === 0) {
      return <span className="text-muted-foreground italic text-xs">{'{}'}</span>;
    }
    if (depth > 2) {
      return (
        <pre className="text-xs font-mono bg-muted rounded p-1 overflow-x-auto max-h-24">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return (
      <div className="space-y-2 pl-2 border-l border-border">
        {entries.map(([k, v]) => (
          <div key={k}>
            <span className="text-xs font-medium text-muted-foreground">{k}</span>
            <div className="mt-0.5">{renderParamValue(k, v, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-xs">{String(value)}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface NodeDetailDrawerProps {
  /** The node data to display, or null to close the drawer */
  node: GraphNode | null;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Optional: slot for edit form below read-only params */
  children?: React.ReactNode;
}

function NodeDetailDrawerComponent({
  node,
  onClose,
  children,
}: NodeDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as HTMLElement)
      ) {
        onClose();
      }
    }

    if (node) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [node, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (node) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [node, onClose]);

  const registryEntry = node ? getNodeRegistryEntry(node.type) : null;
  const categoryBadge = node ? CATEGORY_BADGE_COLORS[node.category] ?? CATEGORY_BADGE_COLORS.unknown : '';

  // Visible parameters (exclude n8n internals)
  const visibleParams = node
    ? Object.entries(node.parameters).filter(
        ([key]) => !HIDDEN_PARAM_KEYS.has(key) && !key.startsWith('__'),
      )
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/20 z-40 transition-opacity duration-200
          ${node ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          fixed top-0 right-0 h-full w-96 max-w-[90vw] z-50
          bg-background border-l border-border shadow-xl
          transform transition-transform duration-200 ease-out
          overflow-y-auto
          ${node ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {node && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-border">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{node.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${categoryBadge}`}>
                    {registryEntry?.label ?? node.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{node.type}</span>
                </div>
                {node.disabled && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 block">
                    Disabled
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Credentials */}
              {node.credentials.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Credentials
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {node.credentials.map((cred) => (
                      <span
                        key={cred}
                        className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md"
                      >
                        <Lock className="h-3 w-3" />
                        {cred}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable params indicator */}
              {node.editableParams.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Editable Parameters ({node.editableParams.length})
                  </h4>
                  <div className="space-y-1">
                    {node.editableParams.map((ep) => (
                      <div
                        key={ep.key}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <ChevronRight className="h-3 w-3" />
                        <span className="font-medium">{ep.label}</span>
                        <span className="text-[10px] bg-muted px-1 py-0.5 rounded">{ep.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Parameters */}
              {visibleParams.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Parameters
                  </h4>
                  <div className="space-y-3">
                    {visibleParams.map(([key, value]) => (
                      <div key={key}>
                        <span className="text-xs font-medium text-foreground">{key}</span>
                        <div className="mt-1">{renderParamValue(key, value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {visibleParams.length === 0 && node.credentials.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No parameters to display
                </div>
              )}

              {/* Edit form slot */}
              {children}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export const NodeDetailDrawer = memo(NodeDetailDrawerComponent);

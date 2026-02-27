'use client';

/**
 * BaseNode — Shared rendering logic for all custom flow node components.
 *
 * Each category node delegates to this component, passing its specific
 * icon, border color, and accent styles. This avoids duplication across
 * the 6+ node category components.
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeExecutionOverlayStatus } from '@/lib/workflow-graph/types';
import { CheckCircle2, XCircle, Pencil } from 'lucide-react';

interface BaseNodeProps {
  /** Display name */
  label: string;
  /** Type label (e.g., 'Gmail', 'Schedule Trigger') */
  typeLabel: string;
  /** Whether the node is disabled in n8n */
  disabled: boolean;
  /** Execution status for overlay */
  status: NodeExecutionOverlayStatus;
  /** Category icon (React element) */
  icon: React.ReactNode;
  /** Tailwind border color class (e.g., 'border-green-500') */
  borderColorClass: string;
  /** Tailwind bg tint for the icon area */
  iconBgClass: string;
  /** Whether this node has editable parameters */
  hasEditableParams: boolean;
}

/**
 * Status indicator styles and icons.
 */
const STATUS_STYLES: Record<
  NodeExecutionOverlayStatus,
  { border: string; bg: string; icon: React.ReactNode | null }
> = {
  idle: { border: '', bg: '', icon: null },
  running: {
    border: 'ring-2 ring-blue-400 animate-pulse',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    icon: null,
  },
  success: {
    border: 'ring-2 ring-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  },
  error: {
    border: 'ring-2 ring-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  },
};

function BaseNodeComponent({
  label,
  typeLabel,
  disabled,
  status,
  icon,
  borderColorClass,
  iconBgClass,
  hasEditableParams,
}: BaseNodeProps) {
  const statusStyle = STATUS_STYLES[status];

  return (
    <>
      {/* Target (input) handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-background"
      />

      {/* Node body */}
      <div
        className={`
          flex items-center gap-2.5 px-3 py-2.5
          bg-card text-card-foreground
          border-l-[3px] border rounded-lg shadow-md
          min-w-[200px] max-w-[260px]
          transition-all duration-200
          ${borderColorClass}
          ${statusStyle.border}
          ${statusStyle.bg}
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        {/* Category icon */}
        <div
          className={`
            flex items-center justify-center
            w-7 h-7 rounded-md flex-shrink-0
            ${iconBgClass}
          `}
        >
          {icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[11px] font-medium truncate leading-tight">
              {label}
            </p>
            {statusStyle.icon}
          </div>
          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
            {typeLabel}
          </p>
        </div>

        {/* Editable indicator */}
        {hasEditableParams && (
          <Pencil className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
        )}
      </div>

      {/* Source (output) handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-background"
      />
    </>
  );
}

export const BaseNode = memo(BaseNodeComponent);

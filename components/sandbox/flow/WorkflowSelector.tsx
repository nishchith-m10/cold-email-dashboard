'use client';

/**
 * WorkflowSelector — Horizontal tab bar for switching between
 * the 7 workflow types within a campaign.
 *
 * @module components/sandbox/flow/WorkflowSelector
 */

import { memo } from 'react';
import type { WorkflowTemplateType } from '@/lib/workflow-graph/types';
import { WORKFLOW_DISPLAY_NAMES } from '@/lib/workflow-graph/types';
import {
  FlaskConical,
  Search,
  Mail,
  Reply,
  ShieldOff,
} from 'lucide-react';

/**
 * All workflow types in display order.
 */
const WORKFLOW_ORDER: WorkflowTemplateType[] = [
  'email_preparation',
  'research_report',
  'email_1',
  'email_2',
  'email_3',
  'reply_tracker',
  'opt_out',
];

/**
 * Icons for each workflow type.
 */
const WORKFLOW_ICONS: Record<WorkflowTemplateType, React.ReactNode> = {
  email_preparation: <FlaskConical className="h-3.5 w-3.5" />,
  research_report: <Search className="h-3.5 w-3.5" />,
  email_1: <Mail className="h-3.5 w-3.5" />,
  email_2: <Mail className="h-3.5 w-3.5" />,
  email_3: <Mail className="h-3.5 w-3.5" />,
  reply_tracker: <Reply className="h-3.5 w-3.5" />,
  opt_out: <ShieldOff className="h-3.5 w-3.5" />,
};

interface WorkflowSelectorProps {
  /** Currently selected workflow type */
  selected: WorkflowTemplateType;
  /** Callback when a workflow tab is selected */
  onSelect: (workflowType: WorkflowTemplateType) => void;
  /** Optional: workflow active status map from sidecar */
  activeStatus?: Partial<Record<WorkflowTemplateType, boolean>>;
}

function WorkflowSelectorComponent({
  selected,
  onSelect,
  activeStatus,
}: WorkflowSelectorProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin px-1 py-1">
      {WORKFLOW_ORDER.map((type) => {
        const isSelected = type === selected;
        const isActive = activeStatus?.[type];
        const displayName = WORKFLOW_DISPLAY_NAMES[type];
        const icon = WORKFLOW_ICONS[type];

        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md
              text-xs font-medium whitespace-nowrap
              transition-all duration-150 cursor-pointer
              ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            {icon}
            <span>{displayName}</span>
            {isActive !== undefined && (
              <span
                className={`
                  inline-block w-1.5 h-1.5 rounded-full ml-1
                  ${isActive ? 'bg-green-500' : 'bg-muted-foreground/30'}
                `}
                title={isActive ? 'Active' : 'Inactive'}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export const WorkflowSelector = memo(WorkflowSelectorComponent);

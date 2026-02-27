'use client';

/**
 * NodeEditForm — Inline edit forms for editable node parameters.
 *
 * Renders appropriate input types per EditableParamDescriptor.type:
 *   - text: single-line Input
 *   - textarea: multi-line Textarea
 *   - number: Number input
 *   - cron: Text input + humanized preview
 *   - select: Select dropdown
 *
 * Tracks dirty state. Save/Reset buttons appear when values differ
 * from originals.
 *
 * @module components/sandbox/flow/NodeEditForm
 */

import { memo, useCallback, useMemo, useState } from 'react';
import type { EditableParamDescriptor } from '@/lib/workflow-graph/types';
import { humanizeCron } from '@/lib/workflow-graph/cron-humanizer';
import { Save, RotateCcw, Clock } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NodeEditFormProps {
  /** Node ID for identifying which node is being edited */
  nodeId: string;
  /** Editable parameter descriptors */
  editableParams: EditableParamDescriptor[];
  /** Current parameter values from the workflow */
  currentValues: Record<string, unknown>;
  /** Callback when user clicks Save */
  onSave: (nodeId: string, changes: Record<string, unknown>) => void;
  /** Whether saving is in progress */
  isSaving?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a nested value from an object using a dot-separated path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// ---------------------------------------------------------------------------
// Input renderers
// ---------------------------------------------------------------------------

interface FieldProps {
  param: EditableParamDescriptor;
  value: string;
  onChange: (key: string, value: string) => void;
}

function TextField({ param, value, onChange }: FieldProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(param.key, e.target.value)}
      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      placeholder={param.label}
    />
  );
}

function TextareaField({ param, value, onChange }: FieldProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(param.key, e.target.value)}
      rows={4}
      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[80px]"
      placeholder={param.label}
    />
  );
}

function NumberField({ param, value, onChange }: FieldProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(param.key, e.target.value)}
      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      placeholder={param.label}
    />
  );
}

function CronField({ param, value, onChange }: FieldProps) {
  const humanized = value ? humanizeCron(value) : '';
  return (
    <div className="space-y-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(param.key, e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="0 9 * * 1-5"
      />
      {humanized && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{humanized}</span>
        </div>
      )}
    </div>
  );
}

function SelectField({ param, value, onChange }: FieldProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(param.key, e.target.value)}
      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {param.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function NodeEditFormComponent({
  nodeId,
  editableParams,
  currentValues,
  onSave,
  isSaving,
}: NodeEditFormProps) {
  // Initialize form state from current values
  const originalValues = useMemo(() => {
    const vals: Record<string, string> = {};
    for (const param of editableParams) {
      const raw = param.path
        ? getNestedValue(currentValues, param.path)
        : currentValues[param.key];
      vals[param.key] = raw !== undefined && raw !== null ? String(raw) : '';
    }
    return vals;
  }, [editableParams, currentValues]);

  const [formValues, setFormValues] = useState<Record<string, string>>(originalValues);

  // Track dirty state
  const isDirty = useMemo(() => {
    return editableParams.some(
      (p) => formValues[p.key] !== originalValues[p.key],
    );
  }, [editableParams, formValues, originalValues]);

  const handleChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setFormValues(originalValues);
  }, [originalValues]);

  const handleSave = useCallback(() => {
    // Build changes object — only include changed values
    const changes: Record<string, unknown> = {};
    for (const param of editableParams) {
      if (formValues[param.key] !== originalValues[param.key]) {
        const value = formValues[param.key];
        // Convert number-type params back to numbers
        if (param.type === 'number') {
          changes[param.key] = value === '' ? 0 : Number(value);
        } else {
          changes[param.key] = value;
        }
      }
    }
    onSave(nodeId, changes);
  }, [editableParams, formValues, originalValues, nodeId, onSave]);

  if (editableParams.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border pt-4 mt-4">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Edit Parameters
      </h4>

      <div className="space-y-3">
        {editableParams.map((param) => {
          const value = formValues[param.key] ?? '';
          const props: FieldProps = { param, value, onChange: handleChange };

          return (
            <div key={param.key}>
              <label className="text-xs font-medium text-foreground mb-1 block">
                {param.label}
              </label>
              {param.type === 'textarea' && <TextareaField {...props} />}
              {param.type === 'text' && <TextField {...props} />}
              {param.type === 'number' && <NumberField {...props} />}
              {param.type === 'cron' && <CronField {...props} />}
              {param.type === 'select' && <SelectField {...props} />}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-3 w-3" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleReset}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-input hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>
    </div>
  );
}

export const NodeEditForm = memo(NodeEditFormComponent);

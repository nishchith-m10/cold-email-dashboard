'use client';

/**
 * Dashboard Settings Panel
 * 
 * Side panel for customizing dashboard widget visibility
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardWidget } from '@/hooks/use-dashboard-layout';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback } from 'react';

interface DashboardSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidget[];
  onToggleWidget: (widgetId: string) => void;
  onResetLayout: () => void;
}

const WIDGET_GROUP_LABELS: Record<string, string> = {
  metrics: 'Metrics',
  'chart-row': 'Charts',
  table: 'Tables',
  ai: 'AI Tools',
};

const WIDGET_GROUP_ORDER = ['metrics', 'chart-row', 'table', 'ai'];

export function DashboardSettingsPanel({
  open,
  onOpenChange,
  widgets,
  onToggleWidget,
  onResetLayout,
}: DashboardSettingsPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleReset = () => {
    if (confirm('Reset dashboard to default layout? This will clear your customizations.')) {
      onResetLayout();
    }
  };

  // Group widgets by type
  const groupedWidgets = WIDGET_GROUP_ORDER
    .map((groupType) => ({
      type: groupType,
      label: WIDGET_GROUP_LABELS[groupType] || groupType,
      items: widgets.filter((w) => w.type === groupType),
    }))
    .filter((group) => group.items.length > 0);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-surface border-l border-border shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-accent-primary" />
                <h2 className="text-lg font-semibold text-text-primary">
                  Customize Dashboard
                </h2>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Widget Visibility — Grouped by type */}
              {groupedWidgets.map((group) => (
                <div key={group.type} className="space-y-3">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {group.label}
                  </h3>

                  <div className="space-y-1">
                    {group.items.map((widget) => (
                      <div
                        key={widget.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg transition-colors',
                          widget.canHide
                            ? 'hover:bg-surface-elevated cursor-pointer'
                            : 'opacity-50 cursor-not-allowed'
                        )}
                        onClick={() => {
                          if (widget.canHide) onToggleWidget(widget.id);
                        }}
                      >
                        <Checkbox
                          checked={widget.visible}
                          onCheckedChange={() => {
                            if (widget.canHide) {
                              onToggleWidget(widget.id);
                            }
                          }}
                          disabled={!widget.canHide}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary">
                            {widget.label}
                          </p>
                          {!widget.canHide && (
                            <p className="text-xs text-text-secondary">
                              Required widget
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Instructions */}
              <div className="p-4 rounded-lg bg-surface-elevated border border-border">
                <h4 className="text-sm font-medium text-text-primary mb-2">
                  💡 Tip
                </h4>
                <p className="text-xs text-text-secondary">
                  Hover over widgets and use the drag handle (⋮⋮) to reorder them. Your
                  layout will be saved automatically.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface-elevated">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="w-full gap-2 text-accent-danger hover:text-accent-danger hover:bg-accent-danger/10"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Default Layout
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

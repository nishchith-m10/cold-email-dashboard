'use client';

/**
 * General Settings Tab
 * 
 * Workspace configuration settings
 */

import { useState, useEffect } from 'react';
import { useWorkspaceSettings } from '@/hooks/use-workspace-settings';
import { useWorkspace } from '@/lib/workspace-context';
import { usePermission } from '@/components/ui/permission-gate';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { Save, Loader2, ChevronDown, Calendar, DollarSign } from 'lucide-react';

export function GeneralSettingsTab() {
  const { workspace, renameWorkspace } = useWorkspace();
  const { settings, isLoading, updateSettings } = useWorkspaceSettings();
  const canWrite = usePermission('write');

  const [workspaceName, setWorkspaceName] = useState('');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [dateFormat, setDateFormat] = useState<'US' | 'EU'>('US');
  const [currency, setCurrency] = useState('USD');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDateFormatOpen, setIsDateFormatOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  // Load settings into form
  useEffect(() => {
    if (settings) {
      // Always derive display name from workspaces.name — never from the
      // stale workspace_settings.workspace_name override column.
      setWorkspaceName(workspace?.name || '');
      setTimezone(settings.timezone || 'America/Los_Angeles');
      setDateFormat(settings.date_format || 'US');
      setCurrency(settings.currency || 'USD');
    }
  }, [settings, workspace]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    // Rename the workspace if the name changed
    if (workspace && workspaceName.trim() && workspaceName.trim() !== workspace.name) {
      const renameResult = await renameWorkspace(workspace.id, workspaceName.trim());
      if (!renameResult.success) {
        setIsSaving(false);
        setSaveMessage({ type: 'error', text: renameResult.error || 'Failed to rename workspace' });
        return;
      }
    }

    // Save the remaining preferences (timezone, date_format, currency)
    const result = await updateSettings({
      timezone,
      date_format: dateFormat,
      currency,
    });

    setIsSaving(false);

    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage({ type: 'error', text: result.error || 'Failed to save settings' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two-column settings container */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 md:grid-cols-[5fr_1px_6fr] gap-6">

          {/* Left column — Workspace fields */}
          <div className="flex flex-col justify-start gap-4">
            <FormField
              label="Workspace Name"
              description="The display name for your workspace"
            >
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Workspace"
                disabled={!canWrite}
              />
            </FormField>

            <FormField
              label="Workspace Slug"
              description="URL-friendly identifier (read-only)"
            >
              <Input
                value={workspace?.slug || 'N/A'}
                disabled
                className="bg-surface-elevated cursor-not-allowed"
              />
            </FormField>
          </div>

          {/* Vertical divider */}
          <div className="hidden md:block w-px bg-border self-stretch" />

          {/* Right column — Dashboard Preferences */}
          <div className="flex flex-col justify-start">
            <div className="flex flex-col items-start gap-4">
              <FormField
                label="Default Timezone"
                description="Timezone used for displaying dates and times"
              >
                <TimezoneSelector
                  selectedTimezone={timezone}
                  onTimezoneChange={setTimezone}
                  disabled={!canWrite}
                />
              </FormField>

              <FormField
                label="Date Format"
                description="Preferred date display format"
              >
                <Popover.Root open={isDateFormatOpen} onOpenChange={setIsDateFormatOpen}>
                  <Popover.Trigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start gap-1.5 h-8 px-2.5 text-xs"
                      disabled={!canWrite}
                    >
                      <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                      <span>{dateFormat === 'US' ? 'US Format (MM/DD/YYYY)' : 'EU Format (DD/MM/YYYY)'}</span>
                      <ChevronDown className={cn(
                        'h-3.5 w-3.5 text-text-secondary transition-transform',
                        isDateFormatOpen && 'rotate-180'
                      )} />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-50 animate-in fade-in-0 zoom-in-95"
                      sideOffset={8}
                      align="start"
                    >
                      <div className="rounded-xl border border-border bg-surface shadow-lg p-2 min-w-[180px]">
                        <div className="px-2 py-1.5 mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                            Date Format
                          </p>
                        </div>
                        {[
                          { value: 'US' as const, label: 'US Format (MM/DD/YYYY)' },
                          { value: 'EU' as const, label: 'EU Format (DD/MM/YYYY)' },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setDateFormat(option.value);
                              setIsDateFormatOpen(false);
                            }}
                            className={cn(
                              'w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                              option.value === dateFormat
                                ? 'bg-accent-primary/10 text-accent-primary'
                                : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </FormField>

              <FormField
                label="Currency"
                description="Default currency for cost displays"
              >
                <Popover.Root open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
                  <Popover.Trigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start gap-1.5 h-8 px-2.5 text-xs"
                      disabled={!canWrite}
                    >
                      <DollarSign className="h-3.5 w-3.5 text-text-secondary" />
                      <span>{{ USD: 'USD ($)', EUR: 'EUR (€)', GBP: 'GBP (£)', JPY: 'JPY (¥)' }[currency]}</span>
                      <ChevronDown className={cn(
                        'h-3.5 w-3.5 text-text-secondary transition-transform',
                        isCurrencyOpen && 'rotate-180'
                      )} />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-50 animate-in fade-in-0 zoom-in-95"
                      sideOffset={8}
                      align="start"
                    >
                      <div className="rounded-xl border border-border bg-surface shadow-lg p-2 min-w-[140px]">
                        <div className="px-2 py-1.5 mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                            Currency
                          </p>
                        </div>
                        {[
                          { value: 'USD', label: 'USD ($)' },
                          { value: 'EUR', label: 'EUR (€)' },
                          { value: 'GBP', label: 'GBP (£)' },
                          { value: 'JPY', label: 'JPY (¥)' },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setCurrency(option.value);
                              setIsCurrencyOpen(false);
                            }}
                            className={cn(
                              'w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                              option.value === currency
                                ? 'bg-accent-primary/10 text-accent-primary'
                                : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </FormField>
            </div>
          </div>

        </div>
      </div>

      {/* Save Button & Messages */}
      {canWrite && (
        <div className="flex items-center justify-end gap-4">
          {saveMessage && (
            <div className={cn(
              'text-sm font-medium',
              saveMessage.type === 'success' ? 'text-accent-success' : 'text-accent-danger'
            )}>
              {saveMessage.text}
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {!canWrite && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            You don&apos;t have permission to edit workspace settings. Contact an admin or owner.
          </p>
        </div>
      )}
    </div>
  );
}

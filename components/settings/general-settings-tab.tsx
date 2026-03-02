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
import { AppLoadingSpinner } from '@/components/ui/loading-states';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';
import { useCurrency, type Currency } from '@/lib/currency-context';
import { useDateFormat, type DateFormat } from '@/lib/date-format-context';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { Save, Loader2, ChevronDown, Calendar, DollarSign, Building2, Globe, Copy, Check } from 'lucide-react';

export function GeneralSettingsTab() {
  const { workspace, renameWorkspace } = useWorkspace();
  const { settings, isLoading, updateSettings } = useWorkspaceSettings();
  const canWrite = usePermission('write');
  const { setCurrency: applyCurrency } = useCurrency();
  const { setDateFormat: applyDateFormat } = useDateFormat();

  const [workspaceName, setWorkspaceName] = useState('');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [dateFormat, setDateFormat] = useState<'US' | 'EU'>('US');
  const [currency, setCurrency] = useState('USD');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDateFormatOpen, setIsDateFormatOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setWorkspaceName(workspace?.name || '');
      setTimezone(settings.timezone || 'America/Los_Angeles');
      setDateFormat(settings.date_format || 'US');
      setCurrency(settings.currency || 'USD');
    }
  }, [settings, workspace]);

  const handleCopyId = () => {
    if (workspace?.id) {
      navigator.clipboard.writeText(workspace.id).catch(() => {});
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    if (workspace && workspaceName.trim() && workspaceName.trim() !== workspace.name) {
      const renameResult = await renameWorkspace(workspace.id, workspaceName.trim());
      if (!renameResult.success) {
        setIsSaving(false);
        setSaveMessage({ type: 'error', text: renameResult.error || 'Failed to rename workspace' });
        return;
      }
    }

    const result = await updateSettings({
      timezone,
      date_format: dateFormat,
      currency,
    });

    if (result.success) {
      // Apply to live contexts so changes reflect instantly without reload
      applyCurrency(currency as Currency);
      applyDateFormat(dateFormat as DateFormat);
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage({ type: 'error', text: result.error || 'Failed to save settings' });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AppLoadingSpinner size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Main settings card ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">

        {/* ── Section: Workspace Identity ── */}
        <div className="px-6 py-3 border-b border-border bg-surface-elevated/10 flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70">Workspace Identity</span>
        </div>

        {/* Workspace Name */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">Workspace Name</p>
            <p className="text-xs text-text-secondary mt-0.5">Display name shown across the dashboard</p>
          </div>
          <div className="shrink-0 w-64">
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="My Workspace"
              disabled={!canWrite}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Workspace Slug */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">Workspace Slug</p>
            <p className="text-xs text-text-secondary mt-0.5">Auto-generated URL-friendly identifier</p>
          </div>
          <div className="shrink-0 w-64">
            <Input
              value={workspace?.slug || 'N/A'}
              disabled
              className="h-9 text-sm bg-surface-elevated/60 cursor-not-allowed text-text-secondary"
            />
          </div>
        </div>

        {/* ── Section: Localization ── */}
        <div className="px-6 py-3 border-b border-border bg-surface-elevated/10 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70">Localization</span>
        </div>

        {/* Timezone */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">Timezone</p>
            <p className="text-xs text-text-secondary mt-0.5">Used for displaying all dates and times</p>
          </div>
          <div className="shrink-0 w-64">
            <TimezoneSelector
              selectedTimezone={timezone}
              onTimezoneChange={setTimezone}
              disabled={!canWrite}
            />
          </div>
        </div>

        {/* Date Format */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">Date Format</p>
            <p className="text-xs text-text-secondary mt-0.5">How dates appear throughout the dashboard</p>
          </div>
          <div className="shrink-0 w-64">
            <Popover.Root open={isDateFormatOpen} onOpenChange={setIsDateFormatOpen}>
              <Popover.Trigger asChild>
                <Button variant="outline" className="justify-start gap-2 h-9 px-3 text-sm w-full" disabled={!canWrite}>
                  <Calendar className="h-4 w-4 text-text-secondary" />
                  <span className="flex-1 text-left">{dateFormat === 'US' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'}</span>
                  <ChevronDown className={cn('h-4 w-4 text-text-secondary transition-transform', isDateFormatOpen && 'rotate-180')} />
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50 animate-in fade-in-0 zoom-in-95" sideOffset={6} align="start">
                  <div className="rounded-xl border border-border bg-surface shadow-xl p-1.5 w-64">
                    <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">Date Format</p>
                    {([{ value: 'US' as const, label: 'US Format', sub: 'MM/DD/YYYY' }, { value: 'EU' as const, label: 'EU Format', sub: 'DD/MM/YYYY' }]).map(opt => (
                      <button key={opt.value} onClick={() => { setDateFormat(opt.value); setIsDateFormatOpen(false); }}
                        className={cn('w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors',
                          opt.value === dateFormat ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary hover:bg-surface-elevated'
                        )}>
                        <span>{opt.label}</span>
                        <span className="text-xs text-text-secondary font-mono">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

        {/* Currency */}
        <div className="flex items-center justify-between px-6 py-4 gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">Currency</p>
            <p className="text-xs text-text-secondary mt-0.5">Default currency for cost and spend displays</p>
          </div>
          <div className="shrink-0 w-64">
            <Popover.Root open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
              <Popover.Trigger asChild>
                <Button variant="outline" className="justify-start gap-2 h-9 px-3 text-sm w-full" disabled={!canWrite}>
                  <DollarSign className="h-4 w-4 text-text-secondary" />
                  <span className="flex-1 text-left">{{ USD: 'USD — US Dollar', EUR: 'EUR — Euro', GBP: 'GBP — Pound', JPY: 'JPY — Yen' }[currency]}</span>
                  <ChevronDown className={cn('h-4 w-4 text-text-secondary transition-transform', isCurrencyOpen && 'rotate-180')} />
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50 animate-in fade-in-0 zoom-in-95" sideOffset={6} align="start">
                  <div className="rounded-xl border border-border bg-surface shadow-xl p-1.5 w-64">
                    <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">Currency</p>
                    {([{ value: 'USD', label: 'US Dollar', symbol: '$' }, { value: 'EUR', label: 'Euro', symbol: '€' }, { value: 'GBP', label: 'Pound Sterling', symbol: '£' }, { value: 'JPY', label: 'Japanese Yen', symbol: '¥' }]).map(opt => (
                      <button key={opt.value} onClick={() => { setCurrency(opt.value); setIsCurrencyOpen(false); }}
                        className={cn('w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                          opt.value === currency ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary hover:bg-surface-elevated'
                        )}>
                        <span className="w-5 text-center font-medium">{opt.symbol}</span>
                        <span className="flex-1 text-left">{opt.label}</span>
                        <span className="text-xs text-text-secondary">{opt.value}</span>
                      </button>
                    ))}
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

      </div>

      {/* ── Workspace Info — read-only grid card ─────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-6 py-3 border-b border-border bg-surface-elevated/10 flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70">Workspace Info</span>
          <span className="ml-auto text-[10px] text-text-secondary bg-surface-elevated px-2 py-0.5 rounded-full border border-border">Read-only</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">

          {/* Workspace ID */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Workspace ID</p>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 text-xs text-text-primary font-mono bg-black/[0.04] border border-border/50 rounded-md px-2.5 py-1.5 truncate">
                {workspace?.id || 'N/A'}
              </code>
              <button
                onClick={handleCopyId}
                title="Copy workspace ID"
                className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md border border-border bg-surface-elevated hover:bg-surface-elevated/80 transition-colors"
              >
                {copiedId ? <Check className="h-3.5 w-3.5 text-accent-success" /> : <Copy className="h-3.5 w-3.5 text-text-secondary" />}
              </button>
            </div>
          </div>

          {/* Plan */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Plan</p>
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border capitalize',
              workspace?.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : workspace?.plan === 'pro' ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/20'
                : workspace?.plan === 'starter' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-surface-elevated text-text-secondary border-border'
            )}>
              {workspace?.plan || 'free'}
            </span>
          </div>

          {/* Created */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Created</p>
            <p className="text-sm text-text-primary">
              {workspace?.created_at
                ? new Date(workspace.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'N/A'}
            </p>
          </div>

        </div>
      </div>

      {/* Save Button & Messages */}
      {canWrite && (
        <div className="flex items-center justify-end gap-4 pt-1">
          {saveMessage && (
            <div className={cn('text-sm font-medium', saveMessage.type === 'success' ? 'text-accent-success' : 'text-accent-danger')}>
              {saveMessage.text}
            </div>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4" />Save Changes</>
            )}
          </Button>
        </div>
      )}

      {!canWrite && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            You don&apos;t have permission to edit workspace settings. Contact an admin or owner.
          </p>
        </div>
      )}
    </div>
  );
}

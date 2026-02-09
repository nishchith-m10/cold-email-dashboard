/**
 * Configuration Section - Campaign parameter settings integrated into Sandbox
 * Collapsible panel with sliders and toggles for campaign configuration
 */

'use client';

import { useState } from 'react';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { ConfigStatusBar } from './config-status-bar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save as SaveIcon, Lock, Clock, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ConfigurationSectionProps {
  workspaceId: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  onSave?: () => void; // Called after successful save
}

export function ConfigurationSection({
  workspaceId,
  isCollapsed = false,
  onToggle,
  onSave,
}: ConfigurationSectionProps) {
  const { configs, isLoading, updateConfigs, getValue } = useWorkspaceConfig();
  const { canManage } = usePermissions();
  const canEdit = canManage;
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, string | number | boolean>>({});

  // Get local or config value
  const getLocalValue = <T extends string | number | boolean>(key: string, defaultValue: T): T => {
    if (key in localValues) {
      return localValues[key] as T;
    }
    const configValue = getValue<T>(key);
    return configValue !== undefined ? configValue : defaultValue;
  };

  const handleChange = (key: string, value: string | number | boolean) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!canEdit || !isDirty) return;

    setIsSaving(true);

    const updates = Object.entries(localValues).map(([key, value]) => ({
      key,
      value,
    }));

    const success = await updateConfigs(updates);

    if (success) {
      setLocalValues({});
      setIsDirty(false);
      onSave?.(); // Notify parent of successful save
    }

    setIsSaving(false);
  };

  // Calculate status for status bar
  const dailyEmailLimit = getLocalValue('MAX_EMAILS_PER_DAY', 100);
  const replyDelay = getLocalValue('REPLY_DELAY_MINUTES', 30);
  const officeStart = getLocalValue('OFFICE_HOURS_START', '09:00');
  const officeEnd = getLocalValue('OFFICE_HOURS_END', '17:00');
  const weekendSendsEnabled = getLocalValue('ENABLE_WEEKEND_SENDS', false);

  // Get current time and day
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Parse office hours
  const [startHour, startMinute] = officeStart.split(':').map(Number);
  const [endHour, endMinute] = officeEnd.split(':').map(Number);
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  const startTimeMinutes = startHour * 60 + startMinute;
  const endTimeMinutes = endHour * 60 + endMinute;
  const withinOfficeHours =
    currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;

  // Determine office hours status
  const officeHoursStatus: 'active' | 'outside' | 'weekend' = isWeekend
    ? 'weekend'
    : withinOfficeHours
    ? 'active'
    : 'outside';

  // Mock daily email count (in production, fetch from API)
  const dailyEmailCount = 47; // TODO: Fetch actual count from API

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status Bar (Always Visible) */}
      <ConfigStatusBar
        dailyEmailCount={dailyEmailCount}
        dailyEmailLimit={dailyEmailLimit}
        officeHoursStatus={officeHoursStatus}
        replyDelay={replyDelay}
        weekendSendsEnabled={weekendSendsEnabled}
        isExpanded={!isCollapsed}
        onToggle={() => onToggle?.()}
      />

      {/* Expandable Configuration Panel */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border rounded-lg p-4 space-y-6 bg-background">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Campaign Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tune your campaign parameters. Changes affect all workflows.
                  </p>
                </div>
                {!canEdit && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Read Only
                  </Badge>
                )}
              </div>

              {/* Max Emails Per Day */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-emails">Maximum Emails Per Day</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {getLocalValue('MAX_EMAILS_PER_DAY', 100)}
                  </span>
                </div>
                <Slider
                  id="max-emails"
                  value={[getLocalValue('MAX_EMAILS_PER_DAY', 100)]}
                  onValueChange={([value]) => handleChange('MAX_EMAILS_PER_DAY', value)}
                  min={10}
                  max={500}
                  step={10}
                  disabled={!canEdit}
                  className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-white dark:[&_[role=slider]]:bg-white dark:[&_[role=slider]]:border-white [&_.bg-primary]:!bg-blue-600 dark:[&_.bg-primary]:!bg-blue-600 [&_span[data-orientation]]:bg-zinc-300 dark:[&_span[data-orientation]]:bg-zinc-700"
                />
                <p className="text-xs text-muted-foreground">
                  Limits the total emails sent per day across all campaigns
                </p>
              </div>

              {/* Reply Delay */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reply-delay">Reply Delay (minutes)</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {getLocalValue('REPLY_DELAY_MINUTES', 30)} min
                  </span>
                </div>
                <Slider
                  id="reply-delay"
                  value={[getLocalValue('REPLY_DELAY_MINUTES', 30)]}
                  onValueChange={([value]) => handleChange('REPLY_DELAY_MINUTES', value)}
                  min={5}
                  max={120}
                  step={5}
                  disabled={!canEdit}
                  className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-white dark:[&_[role=slider]]:bg-white dark:[&_[role=slider]]:border-white [&_.bg-primary]:!bg-blue-600 dark:[&_.bg-primary]:!bg-blue-600 [&_span[data-orientation]]:bg-zinc-300 dark:[&_span[data-orientation]]:bg-zinc-700"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum wait time before sending auto-reply sequences
                </p>
              </div>

              {/* Office Hours */}
              <div className="space-y-3">
                <Label>Office Hours</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="office-start" className="text-xs">
                      Start
                    </Label>
                    <Input
                      id="office-start"
                      type="time"
                      value={getLocalValue('OFFICE_HOURS_START', '09:00')}
                      onChange={(e) => handleChange('OFFICE_HOURS_START', e.target.value)}
                      disabled={!canEdit}
                      className="w-full [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office-end" className="text-xs">
                      End
                    </Label>
                    <Input
                      id="office-end"
                      type="time"
                      value={getLocalValue('OFFICE_HOURS_END', '17:00')}
                      onChange={(e) => handleChange('OFFICE_HOURS_END', e.target.value)}
                      disabled={!canEdit}
                      className="w-full [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails will only be queued during these hours (recipient&apos;s timezone if known)
                </p>
              </div>

              {/* Weekend Sends */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="weekend-sends" className="text-sm">
                    Enable Weekend Sends
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow emails to be sent on Saturdays and Sundays
                  </p>
                </div>
                <Switch
                  id="weekend-sends"
                  checked={getLocalValue('ENABLE_WEEKEND_SENDS', false)}
                  onCheckedChange={(checked) => handleChange('ENABLE_WEEKEND_SENDS', checked)}
                  disabled={!canEdit}
                />
              </div>

              {/* Current Status Info */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Current Status</p>
                  <p className="mt-1">
                    {officeHoursStatus === 'active' && '✓ Within office hours'}
                    {officeHoursStatus === 'outside' && '⚠️ Outside office hours'}
                    {officeHoursStatus === 'weekend' &&
                      (weekendSendsEnabled
                        ? '✓ Weekend sends enabled'
                        : '⚠️ Weekend (sends disabled)')}
                  </p>
                </div>
              </div>

              {/* Save Button */}
              {canEdit && (
                <div className="flex justify-end gap-3">
                  {isDirty && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLocalValues({});
                        setIsDirty(false);
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={!isDirty || isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

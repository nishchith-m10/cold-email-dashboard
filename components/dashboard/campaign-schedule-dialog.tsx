'use client';

import { useState } from 'react';
import { SlidersHorizontal, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTimezone } from '@/lib/timezone-context';

interface CampaignScheduleDialogProps {
  campaignId: string;
  workflowId: string | null | undefined;
  workspaceId?: string;
}

const DAYS_OF_WEEK = [
  { value: 'MON', label: 'Mo' },
  { value: 'TUE', label: 'Tu' },
  { value: 'WED', label: 'We' },
  { value: 'THU', label: 'Th' },
  { value: 'FRI', label: 'Fr' },
  { value: 'SAT', label: 'Sa' },
  { value: 'SUN', label: 'Su' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (UTC)', offset: 0 },
  { value: 'America/New_York', label: 'Eastern (ET)', offset: -5 },
  { value: 'America/Chicago', label: 'Central (CT)', offset: -6 },
  { value: 'America/Denver', label: 'Mountain (MT)', offset: -7 },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)', offset: -8 },
  { value: 'Europe/London', label: 'London (GMT)', offset: 0 },
  { value: 'Europe/Paris', label: 'Paris (CET)', offset: 1 },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: 1 },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: 4 },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: 5.5 },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: 8 },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 9 },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)', offset: 10 },
];

// Dynamically compute the UTC offset (in hours) for any IANA timezone via
// the Intl API. This handles DST-aware offsets and timezones outside the
// hardcoded list (e.g. auto-detected system timezones).
function getUTCOffsetHours(tz: string): number {
  try {
    const now = new Date();
    // Parse a UTC date string and the same moment in the target tz to get delta
    const utcMs = Date.parse(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzMs  = Date.parse(now.toLocaleString('en-US', { timeZone: tz }));
    return (tzMs - utcMs) / 3_600_000;
  } catch {
    return 0; // fallback to UTC
  }
}

export function CampaignScheduleDialog({
  campaignId,
  workflowId,
  workspaceId,
}: CampaignScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [hour, setHour] = useState('9');       // 1-12
  const [minute, setMinute] = useState('0');   // 0-55 by 5
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [emailLimit, setEmailLimit] = useState('50');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Timezone: defaults to the current dashboard timezone so the schedule is
  // consistent with how the user views all other dates in the app. They can
  // override it here for this specific campaign independently.
  const { timezone: dashboardTimezone } = useTimezone();
  const [timezoneOverride, setTimezoneOverride] = useState<string | null>(null);
  const timezone = timezoneOverride ?? dashboardTimezone;
  const isUsingDashboardTz = timezoneOverride === null;
  const setTimezone = (tz: string) => setTimezoneOverride(tz);

  if (!workflowId) return null;

  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const buildCronExpr = () => {
    // Use dynamic Intl offset so any IANA timezone (incl. those not in the
    // hardcoded list, e.g. auto-detected system tz) computes cron correctly.
    const knownTz = TIMEZONES.find((t) => t.value === timezone);
    const offsetHours = knownTz ? knownTz.offset : getUTCOffsetHours(timezone);
    const h12 = Math.max(1, Math.min(12, Number(hour) || 12));
    const h24 = ampm === 'AM'
      ? (h12 === 12 ? 0 : h12)
      : (h12 === 12 ? 12 : h12 + 12);
    const m = Math.max(0, Math.min(59, Number(minute) || 0));
    const totalMinutes = h24 * 60 + m - offsetHours * 60;
    const utcHour = ((Math.floor(totalMinutes / 60) % 24) + 24) % 24;
    const utcMinute = ((totalMinutes % 60) + 60) % 60;
    const dayStr = days.length > 0 ? days.join(',') : 'MON,TUE,WED,THU,FRI';
    return `${utcMinute} ${utcHour} * * ${dayStr}`;
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (days.length === 0) {
      toast({ variant: 'destructive', title: 'Select at least one day' });
      return;
    }
    setSaving(true);
    try {
      const url = new URL(`/api/campaigns/${campaignId}/schedule`, window.location.origin);
      if (workspaceId) url.searchParams.set('workspace_id', workspaceId);

      const cronExpr = buildCronExpr();

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cronExpr,
          maxPerRun: Number(emailLimit),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const displayMinute = String(minute).padStart(2, '0');
      const tzLabel = TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone;
      toast({
        title: 'Schedule saved',
        description: `Sends at ${hour}:${displayMinute} ${ampm} ${tzLabel}, max ${emailLimit}/run`,
      });
      setOpen(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="p-1.5 rounded transition-colors text-text-secondary/40 hover:text-text-primary"
        title="Configure send schedule"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[420px] p-6 max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Send Schedule</DialogTitle>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            {/* Day picker */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Send days</Label>
              <div className="flex items-center gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const active = days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={[
                        'flex-1 text-[11px] font-medium py-1.5 rounded transition-colors',
                        active
                          ? 'bg-accent-primary text-white'
                          : 'bg-surface-elevated text-text-secondary hover:bg-surface-elevated/80',
                      ].join(' ')}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Send time</Label>
              <div className="flex items-center gap-1.5">
                {/* Hour — plain input, no dropdown arrow */}
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="w-14 h-8 text-xs text-center rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-text-secondary/50 text-base font-medium leading-none">:</span>
                {/* Minute — plain input, no dropdown arrow */}
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="w-14 h-8 text-xs text-center rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {/* AM / PM */}
                <div className="flex rounded-md overflow-hidden border border-border ml-1">
                  {(['AM', 'PM'] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setAmpm(period)}
                      className={[
                        'px-2.5 h-8 text-[11px] font-semibold transition-colors',
                        ampm === period
                          ? 'bg-accent-primary text-white'
                          : 'text-text-secondary hover:bg-surface-elevated',
                      ].join(' ')}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-text-secondary">Timezone</Label>
                {!isUsingDashboardTz && (
                  <button
                    type="button"
                    onClick={() => setTimezoneOverride(null)}
                    className="flex items-center gap-1 text-[10px] text-accent-primary hover:text-accent-primary/80 font-medium transition-colors"
                  >
                    <MapPin className="h-3 w-3" />
                    Reset to dashboard
                  </button>
                )}
              </div>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* If the current timezone (e.g. auto-detected) is not in the
                      hardcoded list, surface it as the first option so the
                      Select always shows a valid label. */}
                  {!TIMEZONES.find(t => t.value === timezone) && (
                    <SelectItem value={timezone} className="text-xs">
                      {timezone}
                    </SelectItem>
                  )}
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} className="text-xs">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isUsingDashboardTz && (
                <p className="flex items-center gap-1 text-[11px] text-text-secondary/50 leading-snug">
                  <MapPin className="h-3 w-3 text-accent-success flex-shrink-0" />
                  Using your dashboard timezone. Select to override for this campaign.
                </p>
              )}
            </div>

            {/* Email limit */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Select your email limit</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={emailLimit}
                onChange={(e) => setEmailLimit(e.target.value)}
                className="h-8 text-xs"
              />
              <p className="text-[11px] text-text-secondary/45 leading-snug">
                Max emails sent each time the workflow triggers.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-accent-primary text-white px-4 py-1.5 rounded-md hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

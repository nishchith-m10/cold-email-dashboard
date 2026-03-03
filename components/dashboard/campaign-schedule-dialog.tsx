'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
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

export function CampaignScheduleDialog({
  campaignId,
  workflowId,
  workspaceId,
}: CampaignScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [hour, setHour] = useState('9');
  const [minute, setMinute] = useState('0');
  const [timezone, setTimezone] = useState('UTC');
  const [emailLimit, setEmailLimit] = useState('50');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!workflowId) return null;

  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const buildCronExpr = () => {
    const tz = TIMEZONES.find((t) => t.value === timezone) ?? TIMEZONES[0];
    const h = Math.max(0, Math.min(23, Number(hour) || 0));
    const m = Math.max(0, Math.min(59, Number(minute) || 0));
    const totalMinutes = h * 60 + m - tz.offset * 60;
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

      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      const tzLabel = TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone;
      toast({
        title: 'Schedule saved',
        description: `Sends at ${hh}:${mm} ${tzLabel}, max ${emailLimit}/run`,
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
        className="p-1.5 rounded hover:bg-surface-elevated transition-colors text-text-secondary/40 hover:text-text-primary"
        title="Configure send schedule"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[420px] p-6"
          onClick={(e) => e.stopPropagation()}
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
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={hour}
                    onChange={(e) => setHour(e.target.value)}
                    placeholder="HH"
                    className="h-8 text-xs text-center"
                  />
                  <span className="text-text-secondary/60 text-xs">h</span>
                </div>
                <span className="text-text-secondary/60 text-sm font-medium">:</span>
                <div className="flex-1 flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={minute}
                    onChange={(e) => setMinute(e.target.value)}
                    placeholder="MM"
                    className="h-8 text-xs text-center"
                  />
                  <span className="text-text-secondary/60 text-xs">m</span>
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} className="text-xs">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

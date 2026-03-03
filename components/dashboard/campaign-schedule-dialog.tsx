'use client';

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
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

export function CampaignScheduleDialog({
  campaignId,
  workflowId,
  workspaceId,
}: CampaignScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('9');
  const [minute, setMinute] = useState('0');
  const [maxPerRun, setMaxPerRun] = useState('50');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!workflowId) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = new URL(`/api/campaigns/${campaignId}/schedule`, window.location.origin);
      if (workspaceId) url.searchParams.set('workspace_id', workspaceId);

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hour: Number(hour),
          minute: Number(minute),
          maxPerRun: Number(maxPerRun),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      toast({
        title: 'Schedule saved',
        description: `Sends at ${hh}:${mm} UTC Mon–Fri, max ${maxPerRun} per run`,
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
        className="p-1.5 rounded hover:bg-surface-elevated transition-colors text-text-secondary/40 hover:text-text-primary"
        title="Configure send schedule"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <CalendarClock className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[340px]"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Send Schedule</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Time */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Send time (UTC, Mon–Fri)</Label>
              <div className="flex items-center gap-2">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)} className="text-xs">
                        {String(i).padStart(2, '0')}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-text-secondary text-sm">:</span>
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45].map((m) => (
                      <SelectItem key={m} value={String(m)} className="text-xs">
                        {String(m).padStart(2, '0')}m
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Max per run */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Max contacts per run</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={maxPerRun}
                onChange={(e) => setMaxPerRun(e.target.value)}
                className="h-8 text-xs"
              />
              <p className="text-[11px] text-text-secondary/45 leading-snug">
                Controls the n8n Limit node. Emails sent each time the workflow triggers.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5"
            >
              Cancel
            </button>
            <button
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

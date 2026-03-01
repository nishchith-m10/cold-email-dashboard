'use client';

/**
 * PHASE 61.B: CSV Lead Import Dialog
 *
 * Wires the Phase 61.B CSV import lib to a user-facing modal.
 * Users pick a campaign, drag/drop (or choose) a CSV file, preview
 * row count, and submit — result shows imported / skipped / errors.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CampaignOption {
  id: string;
  name: string;
}

interface ImportResult {
  success: boolean;
  summary: string;
  campaign_name: string;
  file_name: string | null;
  imported: number;
  duplicates_skipped: number;
  invalid_rows: number;
  total_rows_processed: number;
  warnings: string[];
  errors: Array<{ row_number: number; error: string; field?: string }>;
  error?: string; // top-level error message on failure
}

export interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  /** Pre-select a specific campaign (optional). */
  preselectedCampaignId?: string;
  onSuccess?: (result: ImportResult) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CsvImportDialog({
  open,
  onOpenChange,
  workspaceId,
  preselectedCampaignId,
  onSuccess,
}: CsvImportDialogProps) {
  type Phase = 'idle' | 'uploading' | 'done' | 'error';

  const [phase, setPhase] = useState<Phase>('idle');
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    preselectedCampaignId ?? ''
  );
  const [file, setFile] = useState<File | null>(null);
  const [rowPreview, setRowPreview] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load campaign groups when dialog opens ──────────────────────────────

  useEffect(() => {
    if (!open || !workspaceId) return;
    setCampaignsLoading(true);
    fetch(`/api/campaign-groups?workspace_id=${workspaceId}`)
      .then(r => r.json())
      .then((body: { groups?: { id: string; name: string; is_test?: boolean }[] }) => {
        // Exclude test groups — only real campaigns
        const realGroups = (body.groups ?? []).filter(g => !g.is_test);
        setCampaigns(realGroups.map(g => ({ id: g.id, name: g.name })));
        // Auto-select if only one group or preselection given
        if (preselectedCampaignId) {
          setSelectedCampaignId(preselectedCampaignId);
        } else if (realGroups.length === 1) {
          setSelectedCampaignId(realGroups[0].id);
        }
      })
      .catch(() => setCampaigns([]))
      .finally(() => setCampaignsLoading(false));
  }, [open, workspaceId, preselectedCampaignId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPhase('idle');
      setFile(null);
      setRowPreview(null);
      setResult(null);
      setDragOver(false);
      if (!preselectedCampaignId) setSelectedCampaignId('');
    }
  }, [open, preselectedCampaignId]);

  // ── File helpers ──────────────────────────────────────────────────────────

  const acceptFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      return; // silently ignore non-csv
    }
    setFile(f);
    // Quick row count preview (count newlines, subtract header)
    try {
      const text = await f.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      setRowPreview(Math.max(0, lines.length - 1)); // minus header
    } catch {
      setRowPreview(null);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setRowPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!file || !selectedCampaignId) return;

    setPhase('uploading');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const url = `/api/campaign-groups/${selectedCampaignId}/import?workspace_id=${encodeURIComponent(workspaceId)}`;
      const res = await fetch(url, { method: 'POST', body: formData });
      const body: ImportResult = await res.json();

      setResult(body);
      setPhase(body.success ? 'done' : 'error');

      if (body.success) {
        onSuccess?.(body);
      }
    } catch (err) {
      setResult({
        success: false,
        summary: 'Network error — please try again.',
        campaign_name: '',
        file_name: file.name,
        imported: 0,
        duplicates_skipped: 0,
        invalid_rows: 0,
        total_rows_processed: 0,
        warnings: [],
        errors: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setPhase('error');
    }
  };

  const canSubmit =
    phase === 'idle' && !!file && !!selectedCampaignId && !campaignsLoading;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Import CSV Leads</DialogTitle>
          <p className="text-sm text-text-secondary mt-1">
            Upload a CSV file to import leads into a campaign.
            Required column: <code className="text-xs bg-surface px-1 py-0.5 rounded">email_address</code>
          </p>
        </DialogHeader>

        {/* ── Idle / Upload phase ── */}
        {(phase === 'idle' || phase === 'uploading') && (
          <div className="space-y-5 px-6 py-5">
            {/* Campaign selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Campaign *</label>
              <p className="text-xs text-text-secondary">
                Select the campaign — Email 1, 2 &amp; 3 are sequences within it.
              </p>
              <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
                disabled={campaignsLoading || phase === 'uploading'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      campaignsLoading ? 'Loading campaigns…' : 'Select a campaign'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {campaigns.length === 0 && !campaignsLoading && (
                    <SelectItem value="__none__" disabled>
                      No campaigns found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* File drop zone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">CSV File *</label>

              {!file ? (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-surface-elevated'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-text-secondary" />
                  <p className="text-sm font-medium text-text-primary">
                    Drop CSV here or <span className="text-primary underline">browse</span>
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Max 5 MB · Up to 5,000 rows</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                    <p className="text-xs text-text-secondary">
                      {(file.size / 1024).toFixed(1)} KB
                      {rowPreview !== null && ` · ~${rowPreview} row${rowPreview === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  {phase === 'idle' && (
                    <button
                      onClick={clearFile}
                      className="p-1 rounded hover:bg-surface transition-colors"
                    >
                      <X className="h-4 w-4 text-text-secondary" />
                    </button>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* CSV column hint */}
            <div className="rounded-lg bg-surface border border-border p-3">
              <p className="text-xs text-text-secondary font-medium mb-1.5">Expected columns</p>
              <div className="flex flex-wrap gap-1">
                {['email_address ✱', 'first_name', 'last_name', 'organization_name', 'position', 'linkedin_url', 'website_url', 'industry', 'company_size'].map(col => (
                  <code
                    key={col}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      col.includes('✱')
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'bg-surface-elevated text-text-secondary'
                    )}
                  >
                    {col}
                  </code>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Result phase (done or error) ── */}
        {(phase === 'done' || phase === 'error') && result && (
          <div className="px-6 py-5 space-y-4">
            {/* Summary header */}
            <div
              className={cn(
                'flex items-start gap-3 rounded-xl p-4 border',
                phase === 'done'
                  ? 'bg-accent-success/5 border-accent-success/20'
                  : 'bg-accent-danger/5 border-accent-danger/20'
              )}
            >
              {phase === 'done' ? (
                <CheckCircle2 className="h-5 w-5 text-accent-success flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-accent-danger flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {result.summary || (result.error ?? 'Import failed')}
                </p>
                {result.campaign_name && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    Campaign: <span className="font-medium">{result.campaign_name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Stats row */}
            {phase === 'done' && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Imported', value: result.imported, variant: 'success' as const },
                  { label: 'Skipped', value: result.duplicates_skipped, variant: 'secondary' as const },
                  { label: 'Invalid', value: result.invalid_rows, variant: result.invalid_rows > 0 ? 'warning' as const : 'secondary' as const },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-surface p-3 text-center"
                  >
                    <div className="text-xl font-bold text-text-primary">{stat.value}</div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      <Badge variant={stat.variant} className="text-xs">{stat.label}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Errors list (capped at 20 by API) */}
            {result.errors.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Errors ({result.errors.length})
                </p>
                {result.errors.map((e, i) => (
                  <div
                    key={i}
                    className="flex gap-2 text-xs text-accent-danger bg-accent-danger/5 border border-accent-danger/10 rounded-lg px-3 py-2"
                  >
                    {e.row_number > 0 && (
                      <span className="font-medium flex-shrink-0">Row {e.row_number}:</span>
                    )}
                    <span>{e.error}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Warnings ({result.warnings.length})
                </p>
                {result.warnings.slice(0, 10).map((w, i) => (
                  <div
                    key={i}
                    className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"
                  >
                    {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter>
          {(phase === 'done' || phase === 'error') ? (
            <div className="flex gap-2 w-full justify-end">
              {phase === 'error' && (
                <Button
                  variant="outline"
                  onClick={() => { setPhase('idle'); setResult(null); }}
                >
                  Try Again
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>
                {phase === 'done' ? 'Done' : 'Close'}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={phase === 'uploading'}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={phase === 'uploading' || !file || !selectedCampaignId || campaignsLoading}
              >
                {phase === 'uploading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Leads
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * PHASE 64: Ignition Stage — rich real-time progress UI
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Check, Loader2, Zap, AlertCircle, Terminal, Server, Wifi, Key, GitBranch, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProvisioningStep {
  key: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  startedAt?: number;
  completedAt?: number;
}

interface LogEntry {
  ts: number;
  level: 'info' | 'success' | 'warn' | 'error';
  msg: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsed(startedAt?: number): string {
  if (!startedAt) return '';
  const s = Math.floor((Date.now() - startedAt) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtTs(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IgnitionStage({ workspaceId, onComplete }: StageComponentProps) {
  useEffect(() => {
    if (workspaceId) {
      try { sessionStorage.setItem('current_workspace_id', workspaceId); } catch {}
    }
  }, [workspaceId]);

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningSteps, setProvisioningSteps] = useState<ProvisioningStep[]>([
    { key: 'droplet',     label: 'Provisioning droplet',      detail: 'Creating DigitalOcean VM',         icon: <Server className="h-4 w-4" />,    status: 'pending' },
    { key: 'database',    label: 'Creating DB partition',     detail: 'Isolating workspace in Postgres',  icon: <GitBranch className="h-4 w-4" />, status: 'pending' },
    { key: 'sidecar',     label: 'Sidecar booting',           detail: 'Pulling Docker images + n8n',      icon: <Wifi className="h-4 w-4" />,      status: 'pending' },
    { key: 'credentials', label: 'Injecting credentials',     detail: 'Pushing API keys into n8n',        icon: <Key className="h-4 w-4" />,       status: 'pending' },
    { key: 'workflows',   label: 'Deploying workflows',       detail: 'Loading automation templates',     icon: <Zap className="h-4 w-4" />,       status: 'pending' },
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dropletIp, setDropletIp] = useState<string | null>(null);
  const [n8nUrl, setN8nUrl] = useState<string | null>(null);
  const [n8nOwnerEmail, setN8nOwnerEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pollIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const dbPollIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const phase2AttemptsRef  = useRef(0);
  const tickRef            = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef         = useRef<HTMLDivElement>(null);

  // ── Tick: re-render every second so elapsed timers update ─────────────────
  const [, forceRender] = useState(0);
  useEffect(() => {
    tickRef.current = setInterval(() => forceRender(n => n + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // Auto-scroll log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ── Log helper ─────────────────────────────────────────────────────────────
  const log = useCallback((msg: string, level: LogEntry['level'] = 'info') => {
    setLogs(prev => [...prev.slice(-49), { ts: Date.now(), level, msg }]);
  }, []);

  // ── Step helpers ───────────────────────────────────────────────────────────
  const setStep = useCallback((key: string, status: ProvisioningStep['status'], detail?: string) => {
    setProvisioningSteps(steps => steps.map(s => {
      if (s.key !== key) return s;
      const now = Date.now();
      return {
        ...s,
        status,
        detail:      detail ?? s.detail,
        startedAt:   status === 'in_progress' ? now : s.startedAt,
        completedAt: (status === 'complete' || status === 'failed') ? now : s.completedAt,
      };
    }));
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    [pollIntervalRef, dbPollIntervalRef].forEach(r => {
      if (r.current) { clearInterval(r.current); r.current = null; }
    });
    try {
      sessionStorage.removeItem('ignition_running_workspace');
      sessionStorage.removeItem('ignition_started_at');
    } catch {}
  }, []);

  // ── DB status polling (every 5s) — independent visibility regardless of Phase 2 ──
  const startDbPolling = useCallback(() => {
    if (dbPollIntervalRef.current) return;
    dbPollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/onboarding/ignition-status?workspace_id=${workspaceId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d.droplet_ip && !dropletIp) {
          setDropletIp(d.droplet_ip);
          log(`Droplet IP assigned: ${d.droplet_ip}`, 'success');
        }
        if (d.status === 'credentials_injecting') {
          setStep('credentials', 'in_progress', 'Sending API keys to sidecar…');
        }
        if (d.status === 'workflows_deploying') {
          setStep('credentials', 'complete');
          setStep('workflows', 'in_progress', 'Loading automation templates…');
        }
        if (d.status === 'active') {
          if (dbPollIntervalRef.current) { clearInterval(dbPollIntervalRef.current); dbPollIntervalRef.current = null; }
        }
        if (d.error_message && d.status === 'failed') {
          log(`Backend error: ${d.error_message}`, 'error');
        }
      } catch {}
    }, 5000);
  }, [workspaceId, dropletIp, log, setStep]);

  // ── Phase 2 polling ────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    try {
      sessionStorage.setItem('ignition_running_workspace', workspaceId);
      sessionStorage.setItem('ignition_started_at', Date.now().toString());
    } catch {}
    setStep('sidecar', 'in_progress', 'Waiting for Docker images to pull…');
    log('Waiting for sidecar to boot (2-4 min)…');
    startDbPolling();

    let pollCount = 0;

    const attempt = async () => {
      pollCount++;
      const elapsedSec = pollCount * 10;

      if (elapsedSec % 30 === 0) {
        log(elapsedSec < 120
          ? `Still waiting… (${elapsedSec}s) — Docker images pulling`
          : `Still waiting… (${elapsedSec}s) — n8n starting up`
        );
        setStep('sidecar', 'in_progress',
          elapsedSec < 120 ? 'Pulling Docker images…' : 'n8n container starting…'
        );
      }

      try {
        const res  = await fetch('/api/onboarding/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, phase: 2 }),
        });
        const data = await res.json();

        if (data.in_progress) {
          // Phase 2 already running server-side — just keep showing progress
          return;
        }

        if (data.status === 'waiting_for_sidecar') {
          const sub = data.sidecar_ready
            ? 'Sidecar up — waiting for n8n bootstrap…'
            : 'Sidecar booting — pulling images…';
          setStep('sidecar', 'in_progress', sub);
          if (data.sidecar_ready && !data.n8n_bootstrapped) {
            log('Sidecar is up — waiting for n8n owner setup…');
          }
          return;
        }

        if (data.success && data.status === 'active') {
          cleanup();
          setStep('sidecar',     'complete');
          setStep('credentials', 'complete');
          setStep('workflows',   'complete');
          if (data.droplet_ip)     { setDropletIp(data.droplet_ip); setN8nUrl(`https://${data.droplet_ip}.sslip.io`); }
          if (data.n8n_owner_email) setN8nOwnerEmail(data.n8n_owner_email);
          log('All workflows deployed — engine is live!', 'success');
          setTimeout(() => { setIsProvisioning(false); onComplete(); }, 2500);
          return;
        }

        if (data.status === 'failed' || (!data.success && data.error)) {
          cleanup();
          log(`Engine failed: ${data.error || 'unknown'}`, 'error');
          setError(data.error || 'Provisioning failed');
          setIsProvisioning(false);
          return;
        }

        if (!res.ok && data.error) {
          cleanup();
          log(`Config error: ${data.error}`, 'error');
          setError(data.error);
          setIsProvisioning(false);
        }
      } catch {
        // transient — keep polling
      }
    };

    setTimeout(attempt, 5000);
    pollIntervalRef.current = setInterval(attempt, 10000);
  }, [workspaceId, onComplete, cleanup, setStep, log, startDbPolling]);

  // ── Ref trick for resume-on-mount ─────────────────────────────────────────
  const startPollingRef = useRef(startPolling);
  useEffect(() => { startPollingRef.current = startPolling; }, [startPolling]);

  // ── Resume on mount if navigated away ─────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    try {
      if (sessionStorage.getItem('ignition_running_workspace') !== workspaceId) return;
    } catch { return; }

    fetch(`/api/onboarding/ignition-status?workspace_id=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.status === 'active') {
          setProvisioningSteps(s => s.map(x => ({ ...x, status: 'complete' })));
          setIsProvisioning(false);
          try { sessionStorage.removeItem('ignition_running_workspace'); } catch {}
          return;
        }
        if (d.status === 'failed') {
          setError(d.error_message || 'Provisioning failed');
          setIsProvisioning(false);
          try { sessionStorage.removeItem('ignition_running_workspace'); } catch {}
          return;
        }
        if (['handshake_pending', 'credentials_injecting', 'workflows_deploying'].includes(d.status)) {
          setIsProvisioning(true);
          if (d.droplet_ip) setDropletIp(d.droplet_ip);
          setProvisioningSteps(steps => steps.map(s => {
            if (s.key === 'droplet' || s.key === 'database') return { ...s, status: 'complete' };
            if (s.key === 'sidecar')     return { ...s, status: d.status === 'handshake_pending' ? 'in_progress' : 'complete' };
            if (s.key === 'credentials') return { ...s, status: d.status === 'workflows_deploying' ? 'complete' : d.status === 'credentials_injecting' ? 'in_progress' : 'pending' };
            if (s.key === 'workflows')   return { ...s, status: d.status === 'workflows_deploying' ? 'in_progress' : 'pending' };
            return s;
          }));
          log(`Resumed — current status: ${d.status}`);
          startPollingRef.current();
        } else {
          try { sessionStorage.removeItem('ignition_running_workspace'); } catch {}
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Phase 1 ────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    setIsProvisioning(true);
    setError(null);
    setLogs([]);
    phase2AttemptsRef.current = 0;
    log('Starting engine — Phase 1: partition + droplet…');
    setStep('database', 'in_progress');

    try {
      const res  = await fetch('/api/onboarding/launch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ workspaceId, phase: 1 }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.field_errors) {
          const summary = (data.field_errors as Array<{field: string; message: string}>)
            .map(e => `${e.field}: ${e.message}`).join('\n');
          throw new Error(`Some steps need attention:\n${summary}`);
        }
        throw new Error(data.error || 'Phase 1 failed');
      }

      if (data.status === 'active') {
        setProvisioningSteps(s => s.map(x => ({ ...x, status: 'complete' })));
        if (data.droplet_ip) { setDropletIp(data.droplet_ip); setN8nUrl(`https://${data.droplet_ip}.sslip.io`); }
        setTimeout(() => { setIsProvisioning(false); onComplete(); }, 1200);
        return;
      }

      if (data.success && (data.polling || data.status === 'handshake_pending')) {
        setStep('database', 'complete');
        setStep('droplet', 'complete');
        if (data.droplet_ip) {
          setDropletIp(data.droplet_ip);
          log(`Droplet created — IP: ${data.droplet_ip}`, 'success');
        }
        if (data.droplet_id) log(`Droplet ID: ${data.droplet_id}`);
        log('Phase 1 complete — waiting for sidecar to boot…', 'success');
        startPolling();
        return;
      }

      if (!data.success) throw new Error(data.error || 'Phase 1 failed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Phase 1 failed';
      log(msg, 'error');
      setError(msg);
      setIsProvisioning(false);
    }
  };

  const allComplete = provisioningSteps.every(s => s.status === 'complete');

  const copyIp = () => {
    if (!dropletIp) return;
    navigator.clipboard.writeText(`https://${dropletIp}.sslip.io`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Pre-launch summary ── */}
      {!isProvisioning && !allComplete && (
        <>
          <div className="bg-surface border border-border rounded-lg divide-y divide-border">
            <div className="p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-3">What happens next:</h4>
              <ul className="space-y-2.5">
                {provisioningSteps.map((step, i) => (
                  <li key={step.key} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-text-secondary">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{step.label}</div>
                      <div className="text-xs text-text-secondary">{step.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-accent-primary" />
              <span className="font-medium text-text-primary">Estimated time: ~3-5 minutes</span>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 h-11 bg-surface-elevated border border-border text-text-primary rounded-lg font-medium hover:border-accent-primary hover:text-accent-primary transition-all"
          >
            <Zap className="h-4 w-4" />
            Start Engine
          </button>
        </>
      )}

      {/* ── Active provisioning ── */}
      {isProvisioning && (
        <div className="space-y-3">

          {/* Steps */}
          <div className="space-y-2">
            {provisioningSteps.map(step => (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all',
                  step.status === 'complete'    && 'border-green-500/20 bg-green-500/5',
                  step.status === 'in_progress' && 'border-blue-500/30 bg-blue-500/5',
                  step.status === 'pending'     && 'border-border bg-surface-elevated opacity-50',
                  step.status === 'failed'      && 'border-red-500/30 bg-red-500/5',
                )}
              >
                {/* Icon bubble */}
                <div className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                  step.status === 'complete'    && 'bg-green-500 text-white',
                  step.status === 'in_progress' && 'bg-blue-500 text-white',
                  step.status === 'pending'     && 'bg-border text-text-secondary',
                  step.status === 'failed'      && 'bg-red-500 text-white',
                )}>
                  {step.status === 'complete'    ? <Check className="h-4 w-4" /> :
                   step.status === 'in_progress' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                   step.status === 'failed'      ? <AlertCircle className="h-4 w-4" /> :
                   <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>

                {/* Label + detail */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-sm font-medium',
                    step.status === 'complete'    && 'text-green-600 dark:text-green-400',
                    step.status === 'in_progress' && 'text-blue-600 dark:text-blue-400',
                    step.status === 'pending'     && 'text-text-secondary',
                    step.status === 'failed'      && 'text-red-500',
                  )}>
                    {step.label}
                  </div>
                  <div className="text-xs text-text-secondary truncate">{step.detail}</div>
                </div>

                {/* Elapsed / badge */}
                <div className="flex-shrink-0 text-xs text-text-secondary font-mono">
                  {step.status === 'in_progress' && step.startedAt && (
                    <span className="text-blue-500">{elapsed(step.startedAt)}</span>
                  )}
                  {step.status === 'complete' && step.startedAt && step.completedAt && (
                    <span className="text-green-500">
                      {Math.round((step.completedAt - step.startedAt) / 1000)}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Droplet IP badge — shown as soon as we have it */}
          {dropletIp && (
            <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-xs font-mono">
              <Server className="h-3.5 w-3.5 text-text-secondary flex-shrink-0" />
              <span className="text-text-secondary">Droplet:</span>
              <span className="text-text-primary">{dropletIp}</span>
              <span className="text-text-secondary mx-1">→</span>
              <a
                href={`https://${dropletIp}.sslip.io`}
                target="_blank"
                rel="noreferrer"
                className="text-accent-primary hover:underline truncate"
              >
                {dropletIp}.sslip.io
              </a>
            </div>
          )}

          {/* Live log feed */}
          <div className="rounded-lg border border-border bg-black/80 dark:bg-black/60 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
              <Terminal className="h-3.5 w-3.5 text-white/40" />
              <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Live log</span>
            </div>
            <div className="h-36 overflow-y-auto p-3 space-y-0.5 font-mono text-xs">
              {logs.length === 0 && (
                <p className="text-white/30 italic">Waiting for events…</p>
              )}
              {logs.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-white/30 shrink-0">{fmtTs(entry.ts)}</span>
                  <span className={cn(
                    entry.level === 'success' && 'text-green-400',
                    entry.level === 'warn'    && 'text-yellow-400',
                    entry.level === 'error'   && 'text-red-400',
                    entry.level === 'info'    && 'text-white/70',
                  )}>
                    {entry.level === 'success' ? '✓ ' : entry.level === 'error' ? '✗ ' : entry.level === 'warn' ? '⚠ ' : '› '}
                    {entry.msg}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ── Success panel ── */}
      {allComplete && n8nUrl && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-green-600 dark:text-green-400">Engine is live!</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary w-24 shrink-0">n8n URL</span>
              <a href={n8nUrl} target="_blank" rel="noreferrer" className="text-accent-primary hover:underline font-mono text-xs truncate">
                {n8nUrl}
              </a>
              <button onClick={copyIp} className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors" title="Copy URL">
                <Copy className="h-3.5 w-3.5 text-text-secondary" />
              </button>
              {copied && <span className="text-xs text-green-500">Copied!</span>}
            </div>
            {n8nOwnerEmail && (
              <div className="flex items-center gap-2">
                <span className="text-text-secondary w-24 shrink-0">Owner email</span>
                <code className="text-xs bg-surface-elevated px-2 py-0.5 rounded font-mono">{n8nOwnerEmail}</code>
              </div>
            )}
            <p className="text-xs text-text-secondary">Credentials are stored securely. Access n8n details anytime from Settings.</p>
          </div>
        </div>
      )}

      {/* ── Error panel ── */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-500 mb-1">Provisioning Failed</div>
              <div className="text-sm text-text-secondary whitespace-pre-wrap">{error}</div>
              <button onClick={handleStart} className="mt-3 text-sm text-accent-primary hover:underline">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

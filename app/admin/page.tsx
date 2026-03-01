/**
 * Admin Page — Grouped Sidebar Navigation
 *
 * 13 tabs reorganised into 5 logical groups rendered as a sticky left sidebar
 * on desktop and a grouped bottom-sheet picker on mobile.
 *
 * Groups:
 *   Platform       — Workspaces, Audit Log
 *   Infrastructure — Scale Health, Alert History, Disaster Recovery, Fleet Updates
 *   Services       — API Health, Control Plane, Sidecar Fleet
 *   Automation     — Webhook DLQ, Watchdog & Drift, Migration
 *   Analytics      — LLM Usage
 */

'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useUser } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-2 gap-4 mt-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    </div>
  );
}

const SuperAdminPanel       = dynamic(() => import('@/components/admin/super-admin-panel').then(m => ({ default: m.SuperAdminPanel })),           { loading: () => <TabSkeleton /> });
const AuditLogViewer        = dynamic(() => import('@/components/admin/audit-log-viewer').then(m => ({ default: m.AuditLogViewer })),             { loading: () => <TabSkeleton /> });
const ScaleHealthTab        = dynamic(() => import('@/components/admin/scale-health-tab').then(m => ({ default: m.ScaleHealthTab })),             { loading: () => <TabSkeleton /> });
const AlertHistoryTab       = dynamic(() => import('@/components/admin/alert-history-tab').then(m => ({ default: m.AlertHistoryTab })),           { loading: () => <TabSkeleton /> });
const APIHealthTab          = dynamic(() => import('@/components/admin/api-health-tab').then(m => ({ default: m.APIHealthTab })),                 { loading: () => <TabSkeleton /> });
const MigrationControlTab   = dynamic(() => import('@/components/admin/migration-control-tab').then(m => ({ default: m.MigrationControlTab })),   { loading: () => <TabSkeleton /> });
const DisasterRecoveryTab   = dynamic(() => import('@/components/admin/disaster-recovery-tab').then(m => ({ default: m.DisasterRecoveryTab })),   { loading: () => <TabSkeleton /> });
const FleetUpdatesTab       = dynamic(() => import('@/components/admin/fleet-updates-tab').then(m => ({ default: m.FleetUpdatesTab })),           { loading: () => <TabSkeleton /> });
const WebhookDLQTab         = dynamic(() => import('@/components/admin/webhook-dlq-tab').then(m => ({ default: m.WebhookDLQTab })),               { loading: () => <TabSkeleton /> });
const ControlPlaneHealthTab = dynamic(() => import('@/components/admin/control-plane-health-tab').then(m => ({ default: m.ControlPlaneHealthTab })), { loading: () => <TabSkeleton /> });
const SidecarCommandCenterTab = dynamic(() => import('@/components/admin/sidecar-command-center-tab').then(m => ({ default: m.SidecarCommandCenterTab })), { loading: () => <TabSkeleton /> });
const WatchdogDriftTab      = dynamic(() => import('@/components/admin/watchdog-drift-tab').then(m => ({ default: m.WatchdogDriftTab })),         { loading: () => <TabSkeleton /> });
const LLMUsageTab           = dynamic(() => import('@/components/admin/llm-usage-tab').then(m => ({ default: m.LLMUsageTab })),                   { loading: () => <TabSkeleton /> });
import {
  Shield, AlertTriangle, Building2, ScrollText, Activity, Bell,
  ChevronDown, ChevronRight, Stethoscope, Database, Globe, Rocket,
  Mail, Cloud, Terminal, Eye, Brain, Server, Cpu, Zap, BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/mobile';

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminTab =
  | 'workspaces' | 'audit'
  | 'scale-health' | 'alert-history' | 'disaster-recovery' | 'fleet-updates'
  | 'api-health' | 'control-plane' | 'sidecar'
  | 'webhook-dlq' | 'watchdog' | 'migration'
  | 'llm-usage';

interface TabDef {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
}

interface GroupDef {
  id: string;
  label: string;
  icon: LucideIcon;
  tabs: TabDef[];
}

// ─── Navigation Structure ─────────────────────────────────────────────────────

const GROUPS: GroupDef[] = [
  {
    id: 'platform',
    label: 'Platform',
    icon: Building2,
    tabs: [
      { id: 'workspaces', label: 'Workspaces',  icon: Building2 },
      { id: 'audit',      label: 'Audit Log',   icon: ScrollText },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: Server,
    tabs: [
      { id: 'scale-health',      label: 'Scale Health',      icon: Activity },
      { id: 'alert-history',     label: 'Alert History',     icon: Bell },
      { id: 'disaster-recovery', label: 'Disaster Recovery', icon: Globe },
      { id: 'fleet-updates',     label: 'Fleet Updates',     icon: Rocket },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: Cpu,
    tabs: [
      { id: 'api-health',     label: 'API Health',     icon: Stethoscope },
      { id: 'control-plane', label: 'Control Plane',  icon: Cloud },
      { id: 'sidecar',       label: 'Sidecar Fleet',  icon: Terminal },
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: Zap,
    tabs: [
      { id: 'webhook-dlq', label: 'Webhook DLQ',       icon: Mail },
      { id: 'watchdog',    label: 'Watchdog & Drift',  icon: Eye },
      { id: 'migration',   label: 'Migration',         icon: Database },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    tabs: [
      { id: 'llm-usage', label: 'LLM Usage', icon: Brain },
    ],
  },
];

// Flat list for lookups
const ALL_TABS: TabDef[] = GROUPS.flatMap(g => g.tabs);

// ─── Auth guard ───────────────────────────────────────────────────────────────

const SUPER_ADMIN_IDS = process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS
  ? process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS.split(',').map(id => id.trim())
  : [];

// ─── Tab content renderer ─────────────────────────────────────────────────────

function TabContent({ tab }: { tab: AdminTab }) {
  const wrap = (node: React.ReactNode) => (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <div className="px-4 md:px-0">{node}</div>
    </div>
  );
  switch (tab) {
    case 'workspaces':        return <div className="overflow-x-auto -mx-4 md:mx-0"><div className="px-4 md:px-0 min-w-[600px] md:min-w-0"><SuperAdminPanel /></div></div>;
    case 'audit':             return wrap(<AuditLogViewer />);
    case 'scale-health':      return wrap(<ScaleHealthTab />);
    case 'alert-history':     return wrap(<AlertHistoryTab />);
    case 'disaster-recovery': return wrap(<DisasterRecoveryTab />);
    case 'fleet-updates':     return wrap(<FleetUpdatesTab />);
    case 'api-health':        return wrap(<APIHealthTab />);
    case 'control-plane':     return wrap(<ControlPlaneHealthTab />);
    case 'sidecar':           return wrap(<SidecarCommandCenterTab />);
    case 'webhook-dlq':       return wrap(<WebhookDLQTab />);
    case 'watchdog':          return wrap(<WatchdogDriftTab />);
    case 'migration':         return wrap(<MigrationControlTab />);
    case 'llm-usage':         return wrap(<LLMUsageTab />);
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ active, onSelect }: { active: AdminTab; onSelect: (t: AdminTab) => void }) {
  return (
    <nav className="space-y-1" aria-label="Admin navigation">
      {GROUPS.map((group) => (
        <div key={group.id} className="mb-1">
          {/* Group label */}
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
            {group.label}
          </p>
          {/* Group items */}
          {group.tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelect(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-amber-500/10 text-amber-500 font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-amber-500' : 'text-muted-foreground')} />
                <span className="truncate">{tab.label}</span>
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-amber-500/60" />}
              </button>
            );
          })}

          {/* Group divider (not after last) */}
          {group.id !== 'analytics' && (
            <div className="my-2 mx-3 border-t border-border/40" />
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<AdminTab>('workspaces');
  const [showTabPicker, setShowTabPicker] = useState(false);
  const [, startTabTransition] = useTransition();

  const selectTab = (tab: AdminTab) => {
    startTabTransition(() => setActiveTab(tab));
  };

  const activeTabDef = ALL_TABS.find(t => t.id === activeTab) ?? ALL_TABS[0];
  const activeGroup  = GROUPS.find(g => g.tabs.some(t => t.id === activeTab));
  const ActiveIcon   = activeTabDef.icon;

  if (!isLoaded) {
    return (
      <div className="px-4 md:container md:mx-auto py-6 md:py-8 pb-24 md:pb-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-[200px_1fr] gap-6 mt-4">
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !SUPER_ADMIN_IDS.includes(user.id)) {
    return (
      <div className="px-4 md:container md:mx-auto py-6 md:py-8 pb-24 md:pb-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-xl md:text-2xl font-bold">Access Denied</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            This page is restricted to Super Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:container md:mx-auto py-6 md:py-8 pb-24 md:pb-8 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Shield className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-xs md:text-base text-muted-foreground">
            Platform administration &amp; governance
          </p>
        </div>
      </div>

      {/* ── Mobile: active tab button → bottom-sheet picker ── */}
      <div className="md:hidden">
        <button
          onClick={() => setShowTabPicker(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors"
        >
          <div className="flex items-center gap-3">
            <ActiveIcon className="h-5 w-5 text-amber-500" />
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
                {activeGroup?.label}
              </p>
              <p className="text-sm font-medium text-text-primary">{activeTabDef.label}</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>
      </div>

      {/* ── Mobile: grouped bottom sheet ── */}
      <BottomSheet open={showTabPicker} onClose={() => setShowTabPicker(false)} title="Admin Navigation">
        <div className="pb-4">
          {GROUPS.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.id} className="mb-3">
                <div className="flex items-center gap-2 px-4 py-2">
                  <GroupIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </p>
                </div>
                <div className="space-y-0.5">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { selectTab(tab.id); setShowTabPicker(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 transition-colors',
                          isActive
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'text-text-primary hover:bg-surface-elevated',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">{tab.label}</span>
                        {isActive && <span className="ml-auto text-[10px] text-amber-500 font-medium">Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </BottomSheet>

      {/* ── Desktop: sidebar + content grid ── */}
      <div className="hidden md:grid md:grid-cols-[220px_1fr] gap-6 items-start">

        {/* Sticky sidebar */}
        <aside className="sticky top-6 bg-surface border border-border rounded-xl p-3">
          <Sidebar active={activeTab} onSelect={selectTab} />
        </aside>

        {/* Content panel */}
        <main className="min-w-0 min-h-[500px]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <span>{activeGroup?.label}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{activeTabDef.label}</span>
          </div>
          <TabContent tab={activeTab} />
        </main>
      </div>

      {/* ── Mobile: content only ── */}
      <div className="md:hidden min-h-[300px]">
        <TabContent tab={activeTab} />
      </div>

    </div>
  );
}

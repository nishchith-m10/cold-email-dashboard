'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Search, Mail, BarChart3, FileText, X,
  LayoutDashboard, Users, Settings, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace-context';
import { pagesCatalog, settingsCatalog } from '@/lib/search-pages';

type ResultType = 'contact' | 'campaign' | 'page' | 'setting' | 'daterange';

interface ApiResponse {
  campaigns: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; email: string; name: string; company?: string }>;
  pages: Array<{ id: string; title: string; url: string }>;
}

interface PaletteItem {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  url: string;
}

/** Fuzzy score: higher = better match. Returns -1 if no match. */
function fuzzyScore(query: string, item: { title: string; description: string }): number {
  const q = query.toLowerCase();
  const title = item.title.toLowerCase();
  const desc = item.description.toLowerCase();
  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (desc.includes(q)) return 30;
  // Word-by-word: all query words must appear somewhere
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const combined = `${title} ${desc}`;
    if (words.every(w => combined.includes(w))) return 20;
  }
  return -1;
}

/** Build a /dashboard URL with start/end date params */
function buildDateRangeUrl(days: number): string {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `/dashboard?start=${fmt(start)}&end=${fmt(end)}`;
}

/** First day of current month → today */
function buildThisMonthUrl(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `/dashboard?start=${fmt(start)}&end=${fmt(now)}`;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { workspaceId } = useWorkspace();

  const performSearch = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        // 1. Local catalog fuzzy match (instant, no network)
        const catalogMatches: PaletteItem[] = pagesCatalog
          .map(p => ({ page: p, score: fuzzyScore(query, p) }))
          .filter(r => r.score >= 0)
          .sort((a, b) => b.score - a.score)
          .map(({ page }) => ({
            id: `catalog-${page.id}`,
            type: (page.category === 'Settings' ? 'setting' : 'page') as ResultType,
            title: page.title,
            subtitle: page.description,
            url: page.url,
          }));

        // 2. Remote API search (campaigns + contacts)
        const params = new URLSearchParams({
          query,
          workspace_id: workspaceId || 'default',
        });

        let apiItems: PaletteItem[] = [];
        try {
          const response = await fetch(`/api/search?${params}`);
          if (response.ok) {
            const data: ApiResponse = await response.json();

            (data.campaigns || []).forEach((c) => {
              apiItems.push({
                id: `campaign-${c.id}`,
                type: 'campaign',
                title: c.name,
                subtitle: 'Campaign → Go to Analytics',
                url: `/analytics?campaign=${encodeURIComponent(c.id)}`,
              });
            });

            (data.contacts || []).forEach((c) => {
              apiItems.push({
                id: `contact-${c.id}`,
                type: 'contact',
                title: c.name || c.email,
                subtitle: c.company ? `${c.email} • ${c.company}` : c.email,
                url: `/contacts?search=${encodeURIComponent(c.email || c.name)}`,
              });
            });
          }
        } catch {
          // API unreachable — catalog results still shown
        }

        setItems([...catalogMatches, ...apiItems]);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        performSearch(search);
      } else {
        setItems([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, performSearch]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setSearch('');
      setItems([]);
    }
  }, [open]);

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (item: PaletteItem) => {
    router.push(item.url);
    onOpenChange(false);
  };

  const grouped = useMemo(() => {
    const groups: Record<ResultType, PaletteItem[]> = {
      contact: [], campaign: [], page: [], setting: [], daterange: [],
    };
    items.forEach((i) => groups[i.type].push(i));
    return groups;
  }, [items]);

  const getIcon = (type: ResultType) => {
    switch (type) {
      case 'contact':   return Mail;
      case 'campaign':  return BarChart3;
      case 'setting':   return Settings;
      case 'daterange': return CalendarDays;
      case 'page':
      default:          return FileText;
    }
  };

  const groupMeta: { key: ResultType; label: string; emoji: string }[] = [
    { key: 'contact',  label: 'Contacts',  emoji: '📧' },
    { key: 'campaign', label: 'Campaigns', emoji: '🚀' },
    { key: 'page',     label: 'Pages',     emoji: '🗂️' },
    { key: 'setting',  label: 'Settings',  emoji: '⚙️' },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <Command
          className="rounded-xl border border-border bg-surface shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-5 w-5 text-text-secondary mr-3 shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search pages, contacts, campaigns..."
              className="flex-1 bg-transparent py-4 text-text-primary placeholder:text-text-secondary outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="p-1 rounded-md hover:bg-surface-elevated transition-colors"
              >
                <X className="h-4 w-4 text-text-secondary" />
              </button>
            )}
          </div>

          {/* Results List */}
          <Command.List className="max-h-[26rem] overflow-y-auto p-2">
            {loading && (
              <div className="py-8 text-center text-sm text-text-secondary">Searching...</div>
            )}

            {!loading && search && items.length === 0 && (
              <div className="py-8 text-center text-sm text-text-secondary">
                No results for &ldquo;{search}&rdquo;
              </div>
            )}

            {/* ── Empty state: three quick-nav groups ── */}
            {!loading && !search && (
              <>
                {/* Pages group */}
                <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-secondary">
                  {[
                    { id: 'overview',  icon: LayoutDashboard, title: 'Overview',  sub: 'Campaign performance at a glance',    url: '/dashboard' },
                    { id: 'analytics', icon: BarChart3,       title: 'Analytics', sub: 'Deep-dive metrics and cost breakdown', url: '/analytics' },
                    { id: 'contacts',  icon: Users,           title: 'Contacts',  sub: 'Manage leads and import CSV',         url: '/contacts' },
                    { id: 'sequences', icon: FileText,        title: 'Sequences', sub: 'Email sequence management',           url: '/sequences' },
                  ].map(({ id, icon: Icon, title, sub, url }) => (
                    <Command.Item
                      key={id}
                      onSelect={() => handleSelect({ id, type: 'page', title, subtitle: sub, url })}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-elevated cursor-pointer transition-colors"
                    >
                      <Icon className="h-4 w-4 text-text-secondary shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-text-primary">{title}</div>
                        <div className="text-xs text-text-secondary">{sub}</div>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Date Ranges group */}
                <Command.Group heading="Date Ranges" className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-secondary">
                  {[
                    { id: 'range-7',   label: 'Last 7 days',  url: buildDateRangeUrl(7) },
                    { id: 'range-30',  label: 'Last 30 days', url: buildDateRangeUrl(30) },
                    { id: 'range-90',  label: 'Last 90 days', url: buildDateRangeUrl(90) },
                    { id: 'range-mtd', label: 'This month',   url: buildThisMonthUrl() },
                  ].map(({ id, label, url }) => (
                    <Command.Item
                      key={id}
                      onSelect={() => handleSelect({ id, type: 'daterange', title: label, subtitle: 'Filter Overview', url })}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-elevated cursor-pointer transition-colors"
                    >
                      <CalendarDays className="h-4 w-4 text-text-secondary shrink-0" />
                      <div className="text-sm font-medium text-text-primary">{label}</div>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Settings group */}
                <Command.Group heading="Settings" className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-secondary">
                  {settingsCatalog.map((page) => (
                    <Command.Item
                      key={page.id}
                      onSelect={() => handleSelect({ id: page.id, type: 'setting', title: page.title, subtitle: page.description, url: page.url })}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-elevated cursor-pointer transition-colors"
                    >
                      <Settings className="h-4 w-4 text-text-secondary shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-text-primary">{page.title}</div>
                        <div className="text-xs text-text-secondary">{page.description}</div>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}

            {/* ── Search results ── */}
            {!loading && items.length > 0 && (
              <>
                {groupMeta.map(({ key, emoji, label }) => {
                  const typeResults = grouped[key];
                  if (!typeResults || typeResults.length === 0) return null;
                  const Icon = getIcon(key);
                  return (
                    <div key={key} className="mb-2 last:mb-0">
                      <Command.Group
                        heading={`${emoji} ${label}`}
                        className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-secondary"
                      >
                        {typeResults.map((result) => (
                          <Command.Item
                            key={result.id}
                            value={`${result.type}-${result.id}`}
                            onSelect={() => handleSelect(result)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-surface-elevated transition-colors data-[selected=true]:bg-surface-elevated group"
                          >
                            <div className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                              result.type === 'contact'  && 'bg-accent-primary/10',
                              result.type === 'campaign' && 'bg-accent-success/10',
                              result.type === 'setting'  && 'bg-yellow-500/10',
                              result.type === 'page'     && 'bg-accent-purple/10',
                            )}>
                              <Icon className={cn(
                                'h-4 w-4',
                                result.type === 'contact'  && 'text-accent-primary',
                                result.type === 'campaign' && 'text-accent-success',
                                result.type === 'setting'  && 'text-yellow-400',
                                result.type === 'page'     && 'text-accent-purple',
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                                {result.title}
                              </p>
                              <p className="text-xs text-text-secondary truncate">{result.subtitle}</p>
                            </div>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    </div>
                  );
                })}
              </>
            )}
          </Command.List>

          {/* Footer — navigation hints only (no Escape) */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-elevated/50">
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface rounded border border-border">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface rounded border border-border">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface rounded border border-border">↵</kbd>
                Select
              </span>
            </div>
            {items.length > 0 && (
              <span className="text-xs text-text-secondary">
                {items.length} result{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </Command>
      </div>
    </>
  );
}


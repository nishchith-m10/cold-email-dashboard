'use client';

/**
 * Vertical Sidebar Navigation
 * Hybrid approach: Compact vertical sidebar + horizontal top navbar
 * 
 * IMPORTANT: Navigation preserves URL search params (start, end, campaign, workspace)
 * to ensure date range selections persist across page navigation.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from '@/lib/sidebar-context';
import { useWorkspace } from '@/lib/workspace-context';
import { SystemHealthBar } from '@/components/ui/system-health-bar';
import { 
  LayoutDashboard,
  BarChart3,
  Users,
  Mail,
  Settings, 
  Shield,
  ChevronsLeft,
  ChevronsRight,
  Sidebar as SidebarIcon,
  Check,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Sequences', href: '/sequences', icon: Mail },
  { label: 'Onboarding', href: '/onboarding', icon: Rocket },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Admin', href: '/admin', icon: Shield, requiresAdmin: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mode, setMode, isHovered, setIsHovered, isExpanded, effectiveWidth } = useSidebar();
  const { workspace, userRole } = useWorkspace();
  const workspaceId = workspace?.id;
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const menuCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Include super_admin in admin check for Admin panel access
  const isAdmin = userRole === 'owner' || userRole === 'admin' || userRole === 'super_admin';
  
  // Preserve URL search params (start, end, campaign) when navigating
  const searchParams = useSearchParams();
  const query = useMemo(() => {
    const params = new URLSearchParams();
    
    // Always include workspace slug if present
    if (workspace?.slug) {
      params.set('workspace', workspace.slug);
    }
    
    // Preserve date range params
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    
    // Preserve campaign filter
    const campaign = searchParams.get('campaign');
    if (campaign) params.set('campaign', campaign);
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }, [workspace?.slug, searchParams]);

  // Don't show sidebar on auth pages or join page
  if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up') || pathname === '/join') {
    return null;
  }

  // Close mode menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setShowModeMenu(false);
      }
    };
    if (showModeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModeMenu]);

  // Hover handling with smoother delay
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (mode === 'hover') {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (mode === 'hover') {
      // Minimal delay for instant feel
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
        hoverTimeoutRef.current = null;
      }, 100);
    }
  };

  const handleModeSelect = (newMode: 'expanded' | 'collapsed' | 'hover') => {
    setMode(newMode);
    setShowModeMenu(false);
  };

  return (
    <motion.aside
      className={cn(
        'fixed left-0 top-12 h-[calc(100vh-3rem)] border-r border-border bg-surface flex flex-col z-40',
        'hidden md:flex', // Hide on mobile, show on desktop
        'will-change-[width]', // GPU acceleration hint
      )}
      style={{ overflow: 'visible' }} // Allow dropdown to overflow
      initial={false}
      animate={{
        width: effectiveWidth,
      }}
      transition={{ 
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1], // Material Design standard easing
        type: 'tween'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Navigation Items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const fullHref = item.href === '/' ? `/${query}` : `${item.href}${query}`;

          return (
            <Link
              key={item.href}
              href={fullHref}
              className={cn(
                'flex items-center h-10 rounded-lg transition-colors',
                isExpanded ? 'gap-3 px-3' : 'justify-center',
                isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:text-text-primary hover:bg-accent-primary/5'
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.span
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-border" />
            {ADMIN_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const fullHref = `${item.href}${query}`;

              return (
                <Link
                  key={item.href}
                  href={fullHref}
                  className={cn(
                    'flex items-center h-10 rounded-lg transition-colors',
                    isExpanded ? 'gap-3 px-3' : 'justify-center',
                    isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:text-text-primary hover:bg-accent-primary/5'
                  )}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <AnimatePresence mode="wait">
                    {isExpanded && (
                      <motion.span
                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer Section */}
      <div className="border-t border-border px-2 py-3 space-y-2 flex-shrink-0">
        {/* System Health - Compact in sidebar */}
        {workspaceId && (
          <SystemHealthBar workspaceId={workspaceId} compact={!isExpanded} className={isExpanded ? 'w-full' : ''} />
        )}

        {/* Sidebar Display Mode Selector */}
        <div className="relative" ref={modeMenuRef}>
          <button
            type="button"
            onClick={() => setShowModeMenu(!showModeMenu)}
            onMouseEnter={() => {
              // Clear any pending close timeout
              if (menuCloseTimeoutRef.current) {
                clearTimeout(menuCloseTimeoutRef.current);
                menuCloseTimeoutRef.current = null;
              }
              setShowModeMenu(true);
            }}
            onMouseLeave={(e) => {
              // Only close if not moving to the dropdown
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget || !relatedTarget.closest('[data-mode-menu]')) {
                // Longer timeout to allow mouse to reach dropdown
                menuCloseTimeoutRef.current = setTimeout(() => {
                  setShowModeMenu(false);
                  menuCloseTimeoutRef.current = null;
                }, 300);
              }
            }}
            className={cn(
              'flex items-center h-10 rounded-lg transition-colors w-full',
              isExpanded ? 'gap-3 px-3' : 'justify-center',
              'text-text-secondary hover:text-text-primary hover:bg-accent-primary/5'
            )}
            title="Sidebar control"
          >
            <SidebarIcon className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                >
                  Sidebar control
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Mode dropdown menu */}
          <AnimatePresence>
            {showModeMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className={cn(
                  'fixed bg-surface border border-border rounded-lg shadow-2xl overflow-hidden z-[100]',
                  isExpanded ? 'w-[200px]' : 'w-48'
                )}
                style={{
                  bottom: 'calc(3rem + 0.75rem)',
                  left: isExpanded ? '0.5rem' : '0.5rem',
                }}
                onMouseEnter={() => {
                  // Clear any pending close timeout
                  if (menuCloseTimeoutRef.current) {
                    clearTimeout(menuCloseTimeoutRef.current);
                    menuCloseTimeoutRef.current = null;
                  }
                  setShowModeMenu(true);
                }}
                onMouseLeave={() => {
                  // Small delay before closing to allow moving between options
                  menuCloseTimeoutRef.current = setTimeout(() => {
                    setShowModeMenu(false);
                    menuCloseTimeoutRef.current = null;
                  }, 150);
                }}
                data-mode-menu
              >
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => handleModeSelect('expanded')}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                      mode === 'expanded'
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-text-primary hover:text-accent-primary'
                    )}
                  >
                    <span>Expanded</span>
                    {mode === 'expanded' && <Check className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSelect('collapsed')}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                      mode === 'collapsed'
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-text-primary hover:text-accent-primary'
                    )}
                  >
                    <span>Collapsed</span>
                    {mode === 'collapsed' && <Check className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSelect('hover')}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                      mode === 'hover'
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-text-primary hover:text-accent-primary'
                    )}
                  >
                    <span>Expand on hover</span>
                    {mode === 'hover' && <Check className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

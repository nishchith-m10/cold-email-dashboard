/**
 * MobileDrawer - Slide-out navigation drawer for mobile
 * 
 * Phase 38: Mobile Sovereignty - Secondary Navigation
 * 
 * Features:
 * - Slides from left side
 * - Contains workspace switcher, user profile, theme toggle
 * - Backdrop closes on tap
 * - Sign-out with transition animation
 * - Only visible on mobile (md:hidden)
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, UserCircle, Shield, ChevronRight } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace-context';
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher';
import { RoleBadge } from '@/components/ui/role-badge';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Simple NavLink for drawer
function NavLink({ 
  href, 
  label, 
  onClose, 
  highlight = false 
}: { 
  href: string; 
  label: string; 
  onClose: () => void;
  highlight?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href.split('?')[0]));
  
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        'flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
        isActive 
          ? 'bg-accent-primary/10 text-accent-primary' 
          : 'text-text-primary hover:bg-surface-elevated',
        highlight && 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 opacity-50" />
    </Link>
  );
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { user } = useUser();
  const { userRole, isSuperAdmin } = useWorkspace();

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 300,
              }}
              className={cn(
                'fixed inset-y-0 left-0 z-50 md:hidden',
                'w-[80vw] max-w-[320px]',
                'bg-surface border-r border-border',
                'flex flex-col',
                'shadow-2xl'
              )}
              style={{
                paddingTop: 'var(--safe-area-top, 0px)',
                paddingBottom: 'var(--safe-area-bottom, 0px)',
              }}
            >
              {/* Header with close button - FIXED */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
                <span className="text-lg font-semibold text-text-primary">Menu</span>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-lg hover:bg-surface-elevated transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-text-secondary" />
                </button>
              </div>

              {/* SCROLLABLE CONTENT AREA */}
              <div className="flex-1 overflow-y-auto">
                {/* User Profile Section */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-accent-primary/30 flex-shrink-0">
                      {user?.imageUrl ? (
                        <Image
                          src={user.imageUrl}
                          alt={user.fullName || 'Profile'}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          <UserCircle className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {user?.fullName || 'User'}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {user?.primaryEmailAddress?.emailAddress || ''}
                      </p>
                      {userRole && (
                        <div className="mt-1">
                          <RoleBadge role={userRole} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isSuperAdmin && (
                    <div className="mt-3 flex items-center gap-2 px-2 py-1.5 bg-yellow-500/10 rounded-lg text-xs text-yellow-400">
                      <Shield className="h-3.5 w-3.5" />
                      Super Admin Access
                    </div>
                  )}
                </div>

                {/* Workspace Switcher */}
                <div className="p-4 border-b border-border">
                  <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
                    Workspace
                  </p>
                  <WorkspaceSwitcher className="w-full" />
                </div>

                {/* Sandbox Link */}
                <div className="p-4 border-b border-border">
                  <NavLink 
                    href="/sandbox" 
                    label="Sandbox" 
                    onClose={onClose} 
                  />
                </div>

                {/* Admin Panel Link - Only for super admins */}
                {isSuperAdmin && (
                  <div className="p-4 border-b border-border">
                    <NavLink 
                      href="/admin" 
                      label="Admin Panel" 
                      onClose={onClose} 
                      highlight
                    />
                  </div>
                )}

              </div>

            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}



'use client';

/**
 * Top Navbar (Compact, Horizontal)
 * Part of hybrid navigation approach - PRESERVES CENTER NAVIGATION TABS
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useClerk } from '@clerk/nextjs';
import { useWorkspace } from '@/lib/workspace-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher';
import { SignOutTransition } from '@/components/ui/sign-out-transition';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  UserPlus,
  Bell,
  User as UserIcon,
  LogOut,
  UserCircle,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNotificationIcon, getNotificationColor, formatTimeAgo } from '@/lib/notification-utils';

interface TopNavbarProps {
  onCommandOpen?: () => void;
  onShareOpen?: () => void;
}

export function TopNavbar({ onCommandOpen, onShareOpen }: TopNavbarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { workspace } = useWorkspace();
  const { notifications, unreadCount, markAsRead, dismiss } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = () => {
    setShowUserMenu(false);
    setIsSigningOut(true);
    setTimeout(() => {
      signOut({ redirectUrl: '/sign-in' });
    }, 500);
  };

  const query = workspace?.slug ? `?workspace=${workspace.slug}` : '';
  const isOnboarding = pathname === '/onboarding';

  // Don't show on auth pages or join page
  if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up') || pathname === '/join') {
    return null;
  }

  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 w-full h-12 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="flex items-center h-full px-4 gap-3">
        {/* LEFT: Logo + Branding + Workspace */}
        <div className="flex items-center gap-3">
          <Link href={`/${query}`} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded-lg overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="w-full h-full object-cover" />
            </div>
            <span 
              className="text-sm font-semibold hidden lg:block"
              style={{
                backgroundImage: 'var(--logo-gradient)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Cold Email Analytics
            </span>
          </Link>

          {/* Workspace Switcher with border */}
          <div className="hidden lg:block border-l border-border pl-3 ml-2">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Spacer - navigation is in sidebar */}
        <div className="flex-1" />

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2">
          {/* Search - Hidden on onboarding */}
          {!isOnboarding && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCommandOpen}
              title="Search (Cmd+K)"
            >
              <Search className="h-5 w-5 text-text-secondary hover:text-text-primary transition-colors" />
            </Button>
          )}

          {/* Share - Using UserPlus like original */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShareOpen?.()}
            title="Invite Team Members"
          >
            <UserPlus className="h-5 w-5 text-text-secondary hover:text-text-primary transition-colors" />
          </Button>

          {/* Notifications - Hidden on onboarding */}
          {!isOnboarding && (
            <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5 text-text-secondary hover:text-text-primary transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-accent-danger rounded-full animate-pulse" />
              )}
            </Button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
                      <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="h-8 w-8 mx-auto text-text-secondary mb-2 opacity-50" />
                          <p className="text-sm text-text-secondary">No notifications</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => {
                          const Icon = getNotificationIcon(notif.type);
                          const color = getNotificationColor(notif.type);

                          return (
                            <div
                              key={notif.id}
                              className={cn(
                                'px-4 py-3 border-b border-border last:border-0 hover:bg-surface-elevated/50 transition-colors cursor-pointer',
                                !notif.read_at && 'bg-accent-primary/5'
                              )}
                              onClick={() => {
                                if (!notif.read_at) {
                                  markAsRead([notif.id]);
                                }
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', color)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                                  <p className="text-xs text-text-secondary mt-0.5">{notif.message}</p>
                                  <p className="text-xs text-text-secondary mt-1">
                                    {formatTimeAgo(notif.created_at)}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismiss(notif.id);
                                  }}
                                  className="flex-shrink-0 p-1 hover:bg-surface-elevated rounded transition-colors"
                                >
                                  <X className="h-3.5 w-3.5 text-text-secondary" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            </div>
          )}

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="flex items-center justify-center"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <UserIcon className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </Button>

            {/* User Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-surface-elevated border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user?.fullName || user?.primaryEmailAddress?.emailAddress}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-surface transition-colors w-full text-left"
                      >
                        {theme === 'dark' ? (
                          <>
                            <Sun className="h-4 w-4" />
                            <span className="text-sm">Light Mode</span>
                          </>
                        ) : (
                          <>
                            <Moon className="h-4 w-4" />
                            <span className="text-sm">Dark Mode</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          openUserProfile();
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-surface transition-colors w-full text-left"
                      >
                        <UserCircle className="h-4 w-4" />
                        <span className="text-sm">Manage Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition-colors w-full text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm">Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
    <SignOutTransition isVisible={isSigningOut} />
    </>
  );
}

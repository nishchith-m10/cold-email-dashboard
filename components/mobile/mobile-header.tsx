/**
 * MobileHeader - Minimal top header for mobile screens
 *
 * Features:
 * - Menu hamburger (left) - opens drawer
 * - Logo (center) - links to home
 * - Notification bell + Profile avatar (right)
 * - Only visible on mobile (md:hidden)
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Bell, X } from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useNotifications } from '@/hooks/use-notifications';
import { getNotificationIcon, getNotificationColor, formatTimeAgo } from '@/lib/notification-utils';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  onMenuOpen: () => void;
  className?: string;
}

export function MobileHeader({
  onMenuOpen,
  className,
}: MobileHeaderProps) {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const { notifications, unreadCount, markAsRead, dismiss } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length > 0) markAsRead(unreadIds);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 md:hidden',
        'bg-background/90 backdrop-blur-lg',
        'border-b border-border',
        className
      )}
      style={{ paddingTop: 'var(--safe-area-top, 0px)' }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Menu Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMenuOpen}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-surface-elevated transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-text-primary" />
        </motion.button>

        {/* Logo - Links to home like desktop */}
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg overflow-hidden shadow-lg">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <div className="text-sm font-semibold text-text-primary group-hover:text-slate-400 transition-colors">
            <p className="leading-tight">Cold Email</p>
            <p className="text-[8px] uppercase tracking-wider font-medium text-slate-400 opacity-70">Analytics</p>
          </div>
        </Link>

        {/* Right actions: bell + profile */}
        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNotifications(v => !v)}
              className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-surface-elevated transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-text-secondary" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 bg-accent-danger rounded-full animate-pulse" />
              )}
            </motion.button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-2xl overflow-hidden z-50"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
                      <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          className="text-text-secondary hover:text-text-primary transition-colors"
                          aria-label="Close notifications"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto">
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
                                if (!notif.read_at) markAsRead([notif.id]);
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', color)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-primary truncate">{notif.title}</p>
                                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notif.message}</p>
                                  <p className="text-xs text-text-secondary mt-1">{formatTimeAgo(notif.created_at)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                                  className="flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors mt-0.5"
                                  aria-label="Dismiss"
                                >
                                  <X className="h-3.5 w-3.5" />
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

          {/* Profile Avatar - Opens Clerk Profile */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => openUserProfile()}
            className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-accent-primary/30 transition-all"
            aria-label="Profile settings"
          >
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName || 'Profile'}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {user?.firstName?.[0] || 'U'}
                </span>
              </div>
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
}



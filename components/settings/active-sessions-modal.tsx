'use client';

/**
 * Active Sessions Modal Component
 * 
 * Modal to display and manage all active sessions using Clerk's session management
 * Shows device, browser, location, and last active time for each session
 * Allows revoking individual sessions or all other sessions
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionList, useSession } from '@clerk/nextjs';
import {
  X,
  Monitor,
  Smartphone,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ActiveSessionsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ActiveSessionsModal({ open, onClose }: ActiveSessionsModalProps) {
  const { sessions: clerkSessions, isLoaded } = useSessionList();
  const { session: currentSession } = useSession();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessions = clerkSessions || [];

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    setError(null);

    try {
      const sessionToRevoke = sessions.find((s) => s.id === sessionId);
      
      if (sessionToRevoke && 'revoke' in sessionToRevoke && typeof (sessionToRevoke as any).revoke === 'function') {
        await (sessionToRevoke as any).revoke();
      }
    } catch (err: any) {
      console.error('Failed to revoke session:', err);
      setError(err.message || 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    setRevokingId('all');
    setError(null);
    
    try {
      const otherSessions = sessions.filter(
        (s) => s.id !== currentSession?.id
      );
      
      await Promise.all(otherSessions.map((s) => (s as any).revoke()));
    } catch (err: any) {
      console.error('Failed to revoke sessions:', err);
      setError(err.message || 'Failed to revoke sessions. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    if (deviceType === 'mobile') return Smartphone;
    if (deviceType === 'desktop') return Monitor;
    return Globe;
  };

  // ESC key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-[51] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                    <Shield className="h-5 w-5 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      Active Sessions
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      View and manage devices where you&apos;re currently signed in
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                  disabled={revokingId !== null}
                >
                  <X className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-500 flex-shrink-0">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                  <button onClick={() => setError(null)} className="ml-auto">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Content - Scrollable */}
              <div className="p-6 overflow-y-auto flex-1">
                {!isLoaded ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Monitor className="h-12 w-12 mx-auto mb-3 text-[var(--text-secondary)] opacity-50" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      No active sessions found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Sessions List */}
                    <div className="space-y-3">
                      {sessions.map((session: any) => {
                        const DeviceIcon = getDeviceIcon(session.latestActivity?.deviceType);
                        const location = [
                          session.latestActivity?.city,
                          session.latestActivity?.country,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Unknown location';
                        
                        const isCurrent = session.id === currentSession?.id;

                        return (
                          <Card key={session.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
                                  <DeviceIcon className="h-5 w-5 text-[var(--accent-primary)]" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                      {session.latestActivity?.browserName || 'Unknown Browser'}
                                      {session.latestActivity?.deviceType &&
                                        ` on ${session.latestActivity.deviceType}`}
                                    </p>
                                    {isCurrent && (
                                      <Badge variant="success" className="text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Current
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-[var(--text-secondary)]">
                                    {location}
                                  </p>
                                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    Last active:{' '}
                                    {formatDistanceToNow(new Date(session.lastActiveAt), {
                                      addSuffix: true,
                                    })}
                                  </p>
                                </div>

                                {!isCurrent && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeSession(session.id)}
                                    disabled={revokingId === session.id || revokingId === 'all'}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                  >
                                    {revokingId === session.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      'Revoke'
                                    )}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Revoke All Others Button */}
                    {sessions.filter((s: any) => s.id !== currentSession?.id).length > 0 && (
                      <div className="pt-4 border-t border-[var(--border)]">
                        <Button
                          variant="danger"
                          onClick={handleRevokeAllOther}
                          disabled={revokingId !== null}
                          className="w-full"
                        >
                          {revokingId === 'all' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Revoking...
                            </>
                          ) : (
                            'Revoke All Other Sessions'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

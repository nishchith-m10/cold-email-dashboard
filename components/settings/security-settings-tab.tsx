'use client';

/**
 * Security Settings Tab
 * 
 * Account security, password management, 2FA, session management,
 * and security activity log.
 */

import { useState, useCallback, useEffect } from 'react';
import { useUser, useSessionList, useSession } from '@clerk/nextjs';
import { usePermission } from '@/components/ui/permission-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Lock,
  Mail,
  Monitor,
  Eye,
  EyeOff,
  Loader2,
  Activity,
  Globe,
  Clock,
  Key,
} from 'lucide-react';
import { TwoFactorModal } from './two-factor-modal';
import { ActiveSessionsModal } from './active-sessions-modal';
import { formatDistanceToNow } from 'date-fns';
import { useWorkspace } from '@/lib/workspace-context';

interface StoredCredential {
  id: string;
  type: string;
  label: string;
  status: string;
  validatedAt: string | null;
  createdAt: string;
  maskedHint?: string;
}

export function SecuritySettingsTab() {
  const { user } = useUser();
  const { sessions } = useSessionList();
  const { session: currentSession } = useSession();
  const { workspace } = useWorkspace();
  const canManage = usePermission('manage');
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Credential vault state
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // Security activity state
  const [auditActivity, setAuditActivity] = useState<
    Array<{ id: string; timestamp: string; event: string; ipAddress?: string; country?: string; city?: string; success: boolean }>
  >([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Fetch audit activity on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/security/activity?limit=10');
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.data) {
            setAuditActivity(json.data);
          }
        }
      } catch {
        // Silently degrade — activity section will show Clerk sessions only
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch stored credentials
  useEffect(() => {
    if (!workspace?.id) {
      setCredentialsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/security/credentials?workspace_id=${workspace.id}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.data) {
            setCredentials(json.data);
          }
        }
      } catch {
        // Silently degrade
      } finally {
        if (!cancelled) setCredentialsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workspace?.id]);

  // Reveal a credential value
  const handleReveal = useCallback(async (credentialId: string) => {
    if (revealedValues[credentialId]) {
      // Toggle hide
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[credentialId];
        return next;
      });
      return;
    }

    if (!workspace?.id) return;
    setRevealingId(credentialId);

    try {
      const res = await fetch('/api/security/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, credential_id: credentialId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.value) {
          setRevealedValues((prev) => ({ ...prev, [credentialId]: json.value }));
          // Auto-hide after 30 seconds
          setTimeout(() => {
            setRevealedValues((prev) => {
              const next = { ...prev };
              delete next[credentialId];
              return next;
            });
          }, 30_000);
        }
      }
    } catch {
      // Silently degrade
    } finally {
      setRevealingId(null);
    }
  }, [workspace?.id, revealedValues]);

  // Derived state
  const has2FAEnabled = user?.twoFactorEnabled || false;
  const activeSessionCount = sessions?.length || 0;
  const primaryEmail = user?.emailAddresses?.find(
    (e) => e.id === user.primaryEmailAddressId
  );
  const emailVerified = primaryEmail?.verification?.status === 'verified';
  const hasPassword = user?.passwordEnabled || false;

  const handlePasswordChange = useCallback(async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setPwLoading(true);
    setPwMessage(null);

    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });
      setPwMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.message || 'Failed to update password';
      setPwMessage({ type: 'error', text: msg });
    } finally {
      setPwLoading(false);
    }
  }, [user, currentPassword, newPassword, confirmPassword]);

  return (
    <div className="space-y-6">
      {/* Single unified card — matches General Settings pattern */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="space-y-5">

          {/* Email Verification */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-text-secondary shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Email Address
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {primaryEmail?.emailAddress || 'No email found'}
                </p>
              </div>
            </div>
            {emailVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-success/10 text-accent-success">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-warning/10 text-accent-warning">
                <XCircle className="h-3 w-3" />
                Unverified
              </span>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Password Management */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-text-secondary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Password
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {hasPassword
                      ? 'Manage your account password'
                      : 'No password set — using social login'}
                  </p>
                </div>
              </div>
              {hasPassword && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm);
                    setPwMessage(null);
                  }}
                >
                  {showPasswordForm ? 'Cancel' : 'Change'}
                </Button>
              )}
            </div>

            {showPasswordForm && (
              <div className="mt-3 ml-7 space-y-3 max-w-sm">
                <div className="relative">
                  <Input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {pwMessage && (
                  <p className={`text-xs ${pwMessage.type === 'success' ? 'text-accent-success' : 'text-accent-danger'}`}>
                    {pwMessage.text}
                  </p>
                )}
                <Button
                  size="sm"
                  onClick={handlePasswordChange}
                  disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="gap-2"
                >
                  {pwLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Update Password
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-text-secondary shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Two-Factor Authentication
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {has2FAEnabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-success/10 text-accent-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Enabled
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShow2FAModal(true)}
              >
                {has2FAEnabled ? 'Manage' : 'Enable'}
              </Button>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Active Sessions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-4 w-4 text-text-secondary shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Active Sessions
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  View and manage active login sessions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSessionCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-primary/10 text-accent-primary">
                  {activeSessionCount} {activeSessionCount === 1 ? 'session' : 'sessions'}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSessionsModal(true)}
              >
                Manage
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Security Activity Log */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
        </div>

        {activityLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            {/* Audit log events (from genesis.audit_log) */}
            {auditActivity.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${entry.success ? 'bg-accent-success' : 'bg-accent-danger'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary capitalize truncate">
                      {entry.event}
                    </p>
                    {(entry.city || entry.country || entry.ipAddress) && (
                      <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                        <Globe className="h-3 w-3 shrink-0" />
                        {[entry.city, entry.country].filter(Boolean).join(', ') || entry.ipAddress}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-text-secondary shrink-0 ml-3 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </span>
              </div>
            ))}

            {/* Clerk active sessions as activity entries */}
            {(sessions || []).map((s: any) => {
              const isCurrent = s.id === currentSession?.id;
              const location = [s.latestActivity?.city, s.latestActivity?.country]
                .filter(Boolean)
                .join(', ');

              return (
                <div key={`session-${s.id}`} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isCurrent ? 'bg-accent-primary' : 'bg-accent-success'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {isCurrent ? 'Current session' : 'Active session'}
                        {s.latestActivity?.browserName && ` — ${s.latestActivity.browserName}`}
                      </p>
                      {location && (
                        <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                          <Globe className="h-3 w-3 shrink-0" />
                          {location}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-text-secondary shrink-0 ml-3 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {s.lastActiveAt
                      ? formatDistanceToNow(new Date(s.lastActiveAt), { addSuffix: true })
                      : 'just now'}
                  </span>
                </div>
              );
            })}

            {auditActivity.length === 0 && (!sessions || sessions.length === 0) && (
              <p className="text-xs text-text-secondary py-4 text-center">
                No recent activity
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stored Credentials */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-4 w-4 text-text-secondary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Stored Credentials</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Encrypted credentials entered during onboarding
            </p>
          </div>
        </div>

        {credentialsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
          </div>
        ) : credentials.length === 0 ? (
          <p className="text-xs text-text-secondary py-4 text-center">
            No stored credentials found
          </p>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            {credentials.map((cred) => {
              const isRevealed = !!revealedValues[cred.id];
              const isRevealing = revealingId === cred.id;

              return (
                <div key={cred.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-text-primary">{cred.label}</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        cred.status === 'valid'
                          ? 'bg-accent-success/10 text-accent-success'
                          : cred.status === 'expired'
                            ? 'bg-accent-warning/10 text-accent-warning'
                            : 'bg-text-secondary/10 text-text-secondary'
                      }`}>
                        {cred.status === 'valid' ? 'Active' : cred.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5 font-mono">
                      {isRevealed
                        ? revealedValues[cred.id]
                        : cred.maskedHint || '••••••••••••'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReveal(cred.id)}
                    disabled={isRevealing}
                    className="p-1.5 rounded hover:bg-surface-elevated transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50 shrink-0 ml-3"
                    title={isRevealed ? 'Hide value' : 'Reveal value'}
                  >
                    {isRevealing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isRevealed ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permission Message */}
      {!canManage && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            You don&apos;t have permission to manage security settings. Only workspace owners and
            admins can access these features.
          </p>
        </div>
      )}

      {/* Modals */}
      <TwoFactorModal open={show2FAModal} onClose={() => setShow2FAModal(false)} />
      <ActiveSessionsModal open={showSessionsModal} onClose={() => setShowSessionsModal(false)} />
    </div>
  );
}

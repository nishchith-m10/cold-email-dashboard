'use client';

/**
 * Security Settings Tab
 * 
 * Account security, password management, 2FA, and session management.
 * Matches the clean single-card design of General Settings.
 */

import { useState, useCallback } from 'react';
import { useUser, useSessionList } from '@clerk/nextjs';
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
} from 'lucide-react';
import { TwoFactorModal } from './two-factor-modal';
import { ActiveSessionsModal } from './active-sessions-modal';

export function SecuritySettingsTab() {
  const { user } = useUser();
  const { sessions } = useSessionList();
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

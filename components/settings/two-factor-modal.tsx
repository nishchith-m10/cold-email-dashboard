'use client';

/**
 * Two-Factor Authentication Modal Component
 * 
 * Modal to enable/disable 2FA using Clerk's TOTP API
 * Shows QR code for setup, verification input, and backup codes
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import {
  X,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLoadingSpinner } from '@/components/ui/loading-states';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TwoFactorModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'initial' | 'setup' | 'verify' | 'success' | 'disable-confirm';

export function TwoFactorModal({ open, onClose }: TwoFactorModalProps) {
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState<Step>('initial');
  const [qrCode, setQrCode] = useState<string>('');
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const has2FAEnabled = user?.twoFactorEnabled || false;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(has2FAEnabled ? 'initial' : 'setup');
      setError(null);
      setVerificationCode('');
      setQrCode('');
      setTotpSecret('');
      setBackupCodes([]);
    }
  }, [open, has2FAEnabled]);

  // Generate QR code when entering setup step
  useEffect(() => {
    if (step === 'setup' && isLoaded && user && !qrCode) {
      generateTOTP();
    }
  }, [step, isLoaded, user, qrCode]);

  const generateTOTP = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const totp = await user.createTOTP();

      if (totp?.uri) {
        setQrCode(totp.uri);
        setTotpSecret(totp.secret || '');
        // Capture backup codes if Clerk includes them in the TOTP response
        if ((totp as any).backupCodes?.length) {
          setBackupCodes((totp as any).backupCodes);
        }
        // Stay on 'setup' so the user can scan the QR code / copy the secret.
        // The "Continue" button navigates to 'verify'.
      } else {
        setError('Failed to generate TOTP. Please try again.');
      }
    } catch (err) {
      console.error('Error creating TOTP:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate TOTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTOTP = async () => {
    if (!user || !verificationCode.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clerk's verifyTOTP throws on failure; a clean return means success.
      await user.verifyTOTP({ code: verificationCode.trim() });
      setStep('success');
    } catch (err) {
      console.error('Error verifying TOTP:', err);
      setError(err instanceof Error ? err.message : 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      await user.disableTOTP();
      setStep('initial');
      onClose();
      // Refresh the page to update the UI
      window.location.reload();
    } catch (err) {
      console.error('Error disabling TOTP:', err);
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyAllBackupCodes = async () => {
    const codesText = backupCodes.join('\n');
    await navigator.clipboard.writeText(codesText);
    setCopiedCode('all');
    setTimeout(() => setCopiedCode(null), 2000);
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
              className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
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
                      Two-Factor Authentication
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {has2FAEnabled ? 'Manage your 2FA settings' : 'Add an extra layer of security'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                  disabled={isLoading}
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
                {step === 'initial' && has2FAEnabled && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Two-Factor Authentication is Enabled
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Your account is protected with an additional security layer
                        </p>
                      </div>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Security Information</CardTitle>
                        <CardDescription>
                          Two-factor authentication adds an extra layer of security to your account
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm text-[var(--text-secondary)]">
                            When 2FA is enabled, you&apos;ll need to enter a code from your
                            authenticator app in addition to your password when signing in.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3">
                      <Button
                        variant="danger"
                        onClick={() => setStep('disable-confirm')}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        Disable 2FA
                      </Button>
                      <Button variant="secondary" onClick={onClose} className="flex-1">
                        Close
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'disable-confirm' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Disable Two-Factor Authentication?
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          This will remove the extra security layer from your account
                        </p>
                      </div>
                    </div>

                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-[var(--text-secondary)]">
                          Are you sure you want to disable two-factor authentication? Your account
                          will be less secure without this additional protection.
                        </p>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3">
                      <Button
                        variant="danger"
                        onClick={disableTOTP}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Disabling...
                          </>
                        ) : (
                          'Yes, Disable 2FA'
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setStep('initial')}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'setup' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Set Up Two-Factor Authentication</CardTitle>
                        <CardDescription>
                          Scan the QR code with your authenticator app to get started
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <AppLoadingSpinner />
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-center">
                              {qrCode ? (
                                <div className="p-4 bg-white rounded-lg border-2 border-[var(--border)]">
                                  {/* Render the otpauth:// URI as a QR code via a free image API */}
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(qrCode)}`}
                                    alt="Scan this QR code with your authenticator app"
                                    width={192}
                                    height={192}
                                    className="rounded"
                                  />
                                </div>
                              ) : (
                                <div className="w-48 h-48 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border)] flex items-center justify-center">
                                  <AppLoadingSpinner />
                                </div>
                              )}
                            </div>

                            {totpSecret && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-[var(--text-secondary)]">
                                  Can&apos;t scan? Enter this code manually:
                                </p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-mono text-[var(--text-primary)] break-all">
                                    {totpSecret}
                                  </code>
                                  <button
                                    onClick={() => handleCopyCode(totpSecret)}
                                    className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                                    title="Copy secret"
                                  >
                                    {copiedCode === totpSecret ? (
                                      <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4 text-[var(--text-secondary)]" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex gap-3">
                      <Button
                        variant="default"
                        onClick={() => setStep('verify')}
                        disabled={!qrCode || isLoading}
                        className="flex-1"
                      >
                        Continue
                      </Button>
                      <Button variant="secondary" onClick={onClose} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'verify' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Verify Setup</CardTitle>
                        <CardDescription>
                          Enter the 6-digit code from your authenticator app
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--text-primary)]">
                            Verification Code
                          </label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setVerificationCode(value);
                              setError(null);
                            }}
                            className="text-center text-2xl font-mono tracking-widest"
                            autoFocus
                          />
                          <p className="text-xs text-[var(--text-secondary)]">
                            Enter the 6-digit code from your authenticator app
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3">
                      <Button
                        variant="default"
                        onClick={verifyTOTP}
                        disabled={verificationCode.length !== 6 || isLoading}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Verifying...
                          </>
                        ) : (
                          'Verify & Enable'
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setStep('setup');
                          setVerificationCode('');
                        }}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'success' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Two-Factor Authentication Enabled!
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Your account is now protected with an additional security layer
                        </p>
                      </div>
                    </div>

                    {backupCodes.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <KeyRound className="h-4 w-4" />
                            Backup Codes
                          </CardTitle>
                          <CardDescription>
                            Save these codes in a safe place. You can use them to access your
                            account if you lose your authenticator device.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            {backupCodes.map((code, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]"
                              >
                                <code className="flex-1 text-xs font-mono text-[var(--text-primary)]">
                                  {code}
                                </code>
                                <button
                                  onClick={() => handleCopyCode(code)}
                                  className="p-1 rounded hover:bg-[var(--surface)] transition-colors"
                                  title="Copy code"
                                >
                                  {copiedCode === code ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-[var(--text-secondary)]" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopyAllBackupCodes}
                            className="w-full"
                          >
                            {copiedCode === 'all' ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Copied All Codes
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy All Codes
                              </>
                            )}
                          </Button>
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-xs text-[var(--text-secondary)]">
                              <strong className="text-[var(--text-primary)]">Important:</strong>{' '}
                              These codes can only be viewed once. Make sure to save them securely.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Button variant="default" onClick={onClose} className="w-full">
                      Done
                    </Button>
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

'use client';

/**
 * Security Settings Tab
 * 
 * API keys, webhooks, and security configuration
 */

import { useState } from 'react';
import { useUser, useSessionList } from '@clerk/nextjs';
import { usePermission } from '@/components/ui/permission-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Plus, Copy, Trash2, Key, Webhook, Shield, Check, CheckCircle2 } from 'lucide-react';
import { TwoFactorModal } from './two-factor-modal';
import { ActiveSessionsModal } from './active-sessions-modal';

export function SecuritySettingsTab() {
  const { user } = useUser();
  const { sessions } = useSessionList();
  const canManage = usePermission('manage');
  const [copied, setCopied] = useState<string | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  
  // Check if user has 2FA enabled
  const has2FAEnabled = user?.twoFactorEnabled || false;
  
  // Get active session count
  const activeSessionCount = sessions?.length || 0;

  // Mock API keys data (in real implementation, this would come from API)
  const [apiKeys] = useState([
    {
      id: '1',
      name: 'Production API Key',
      masked: 'sk_live_••••••••••••1234',
      full: 'sk_live_example_key_not_real_placeholder_1234567890',
      created_at: '2024-01-15',
    },
  ]);

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* API Keys Card */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <Key className="h-5 w-5 text-accent-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">API Keys</h3>
              <p className="text-sm text-text-secondary">Manage API keys for programmatic access</p>
            </div>
          </div>
          {canManage && (
            <Button variant="default" size="sm" className="gap-2" disabled>
              <Plus className="h-4 w-4" />
              Generate New Key
            </Button>
          )}
        </div>

        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No API keys generated yet</p>
            <p className="text-xs mt-1">Generate a key to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                    API Key
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                    Created
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-surface-elevated">
                    <td className="px-4 py-3 text-sm text-text-primary font-medium">
                      {key.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-text-secondary bg-surface-elevated px-2 py-1 rounded">
                          {key.masked}
                        </code>
                        <button
                          onClick={() => handleCopy(key.full, key.id)}
                          className="p-1 hover:bg-surface-elevated rounded transition-colors"
                          title="Copy full key"
                        >
                          {copied === key.id ? (
                            <Check className="h-4 w-4 text-accent-success" />
                          ) : (
                            <Copy className="h-4 w-4 text-text-secondary" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {key.created_at}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-accent-danger hover:text-accent-danger hover:bg-accent-danger/10"
                          disabled
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
          <p className="text-xs text-text-secondary">
            <strong className="text-text-primary">Note:</strong> API key generation and
            management is currently in development. This is a preview of the UI.
          </p>
        </div>
      </div>

      {/* Webhooks Card */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-accent-purple/10 flex items-center justify-center">
            <Webhook className="h-5 w-5 text-accent-purple" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Webhooks</h3>
            <p className="text-sm text-text-secondary">Configure webhooks to receive real-time event notifications</p>
          </div>
        </div>

        <div className="space-y-4">
          <FormField
            label="Webhook URL"
            description="HTTPS endpoint to receive webhook events"
          >
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/webhook"
                disabled={!canManage}
              />
              <Button variant="ghost" disabled>
                Test
              </Button>
            </div>
          </FormField>

          <FormField
            label="Event Types"
            description="Select which events trigger webhooks"
          >
            <div className="space-y-2">
              {['Campaign Created', 'Email Sent', 'Reply Received', 'Opt-Out'].map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canManage}
                    className="rounded border-border text-accent-primary focus:ring-accent-primary disabled:opacity-50"
                  />
                  <span className="text-text-primary">{event}</span>
                </label>
              ))}
            </div>
          </FormField>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
          <p className="text-xs text-text-secondary">
            <strong className="text-text-primary">Coming Soon:</strong> Webhook
            functionality will be available in a future update.
          </p>
        </div>
      </div>

      {/* Security Options Card */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-accent-success/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-accent-success" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Security Options</h3>
            <p className="text-sm text-text-secondary">Additional security features and session management</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface-elevated">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary">
                  Two-Factor Authentication
                </p>
                {has2FAEnabled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-success/10 text-accent-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Enabled
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShow2FAModal(true)}
            >
              {has2FAEnabled ? 'Manage' : 'Enable'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-surface-elevated">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary">
                  Active Sessions
                </p>
                {activeSessionCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-primary/10 text-accent-primary">
                    {activeSessionCount} {activeSessionCount === 1 ? 'session' : 'sessions'}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                View and manage active login sessions
              </p>
            </div>
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

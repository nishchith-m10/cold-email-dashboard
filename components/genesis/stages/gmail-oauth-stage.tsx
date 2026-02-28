/**
 * PHASE 64: Gmail OAuth Stage
 * 
 * Stage 3: Connect Gmail via OAuth (Genesis-operated OAuth app).
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

export function GmailOAuthStage({ workspaceId, onComplete }: StageComponentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if Gmail already connected
  useEffect(() => {
    async function checkConnection() {
      try {
        const res = await fetch(`/api/onboarding/credentials?type=gmail_oauth&workspace_id=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setIsConnected(true);
            setConnectedEmail(data.email);
          }
        }
      } catch (err) {
        console.error('Failed to check Gmail connection:', err);
      }
    }

    checkConnection();
  }, [workspaceId]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get OAuth URL
      const res = await fetch('/api/oauth/gmail/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate OAuth URL');
      }

      const data = await res.json();

      // Redirect to Google OAuth
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Gmail');
      setIsConnecting(false);
    }
  };

  const handleContinue = () => {
    if (isConnected) {
      onComplete();
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {isConnected ? (
        <div className="p-4 bg-accent-success/10 border border-accent-success/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-success/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-accent-success" />
            </div>
            
            <div className="flex-1">
              <div className="font-semibold text-accent-success mb-1">
                Gmail Connected
              </div>
              <div className="text-sm text-text-secondary">
                {connectedEmail}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-surface-elevated border border-border rounded-lg">
          <p className="text-sm text-text-secondary">
            You&apos;ll be securely redirected to Google to grant access. Genesis handles the OAuth flow for you.
          </p>
        </div>
      )}

      {/* What We Access */}
      <div className="bg-surface-elevated border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-text-primary mb-3">
          What Genesis can access:
        </h4>
        
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-text-secondary">
            <Check className="h-4 w-4 text-accent-success flex-shrink-0 mt-0.5" />
            Send emails on your behalf
          </li>
          <li className="flex items-start gap-2 text-sm text-text-secondary">
            <Check className="h-4 w-4 text-accent-success flex-shrink-0 mt-0.5" />
            Read email metadata (for tracking)
          </li>
          <li className="flex items-start gap-2 text-sm text-text-secondary">
            <Check className="h-4 w-4 text-accent-success flex-shrink-0 mt-0.5" />
            Your email address (for verification)
          </li>
        </ul>
      </div>

      {/* Security Note */}
      <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-accent-purple flex-shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">Secure:</span> Tokens are encrypted and stored only in your dedicated droplet. Genesis never sees your email content.
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm">
          {error}
        </div>
      )}

      {/* Action Button */}
      {isConnected ? (
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Continue →
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 h-12 bg-white text-slate-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 shadow-lg"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect with Google
            </>
          )}
        </button>
      )}
    </div>
  );
}

'use client';

/**
 * Backup Codes Display Component
 * Displays backup codes with copy and download functionality
 * Used within TwoFactorModal after successful 2FA setup
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Download, AlertCircle } from 'lucide-react';

interface BackupCodesDisplayProps {
  codes: string[];
  onComplete?: () => void;
}

export function BackupCodesDisplay({ codes, onComplete }: BackupCodesDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCopyAllCodes = async () => {
    try {
      const allCodes = codes.join('\n');
      await navigator.clipboard.writeText(allCodes);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy all codes:', err);
    }
  };

  const handleDownloadCodes = () => {
    try {
      const content = `Backup Codes\n\nSave these codes securely. Each code can be used once if you lose access to your authenticator app.\n\n${codes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download codes:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Save Your Backup Codes</CardTitle>
        <CardDescription>
          Store these codes safely. Each can be used once if you lose access to your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Save these codes now. They won't be shown again. Store them in a secure location like a password manager or encrypted file.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">Backup Codes</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAllCodes}
                className="h-8"
              >
                {copiedAll ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy All
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCodes}
                className="h-8"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {codes.map((code, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-surface-elevated border border-border rounded-lg px-3 py-2 hover:bg-surface-elevated/80 transition-colors"
              >
                <code className="flex-1 text-sm font-mono text-text-primary select-all">
                  {code}
                </code>
                <button
                  onClick={() => handleCopyCode(code, index)}
                  className="p-1.5 hover:bg-surface rounded transition-colors"
                  title="Copy code"
                  aria-label={`Copy code ${index + 1}`}
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-text-secondary" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {onComplete && (
          <div className="pt-4 border-t border-border">
            <Button onClick={onComplete} className="w-full">
              <Check className="mr-2 h-4 w-4" />
              I've Saved My Codes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

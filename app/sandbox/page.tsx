'use client';
export const dynamic = 'force-dynamic';

import { motion } from 'framer-motion';
import { useWorkspace } from '@/lib/workspace-context';
import { SandboxPanel } from '@/components/sandbox/sandbox-panel';
import { SquareTerminal, AlertCircle } from 'lucide-react';

export default function SandboxPage() {
  const { workspaceId } = useWorkspace();

  return (
    <div className="min-h-screen bg-surface-base pb-20 md:pb-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-base border-b border-border-primary px-4 md:px-6 py-4 md:py-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <SquareTerminal className="w-5 h-5 md:w-6 md:h-6 text-accent-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary">Sandbox</h1>
            <p className="text-text-secondary text-xs md:text-sm hidden sm:block">
              Test campaigns with mock data before going live
            </p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-4xl mx-auto px-4 md:px-6 py-6"
      >
        {workspaceId ? (
          <SandboxPanel workspaceId={workspaceId} />
        ) : (
          <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>Select a workspace to use the sandbox.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

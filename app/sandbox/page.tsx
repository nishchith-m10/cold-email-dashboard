'use client';
export const dynamic = 'force-dynamic';

/**
 * Sandbox Page — Redesigned flow-based workflow visualizer.
 *
 * Layout:
 *   Top — Campaign selector + WorkflowSelector tabs
 *   Center — WorkflowCanvas (full-width reactive graph)
 *   Right — NodeDetailDrawer (slide-in on node click)
 *   Bottom — ExecutionTimeline + ExecutionHistory tabs
 *
 * @module app/sandbox/page
 */

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '@/lib/workspace-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useWorkflowGraph } from '@/hooks/use-workflow-graph';
import { useWorkflowMutation } from '@/hooks/use-workflow-mutation';
import { useExecutionOverlay } from '@/hooks/use-execution-overlay';
import { useNodeMetrics } from '@/hooks/use-node-metrics';
import {
  WorkflowSelector,
  WorkflowCanvas,
  NodeDetailDrawer,
  NodeEditForm,
  ExecutionTimeline,
  ExecutionHistory,
} from '@/components/sandbox/flow';
import type { WorkflowTemplateType, GraphNode } from '@/lib/workflow-graph/types';
import type { Node } from '@xyflow/react';
import type { CustomNodeData } from '@/components/sandbox/flow/nodes/types';
import {
  SquareTerminal,
  AlertCircle,
  ChevronDown,
  Clock,
  History,
  BarChart3,
} from 'lucide-react';

/* ---------- Sub-components ---------- */

/** Simple campaign dropdown selector with dark mode support */
function CampaignSelector({
  campaigns,
  selectedId,
  onSelect,
  isLoading,
}: {
  campaigns: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (isLoading) {
    return (
      <div className="h-9 w-48 bg-muted animate-pulse rounded-md" />
    );
  }

  if (campaigns.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No campaigns</span>
    );
  }

  const selectedName = campaigns.find((c) => c.id === selectedId)?.name ?? 'Select campaign';

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="
          appearance-none h-9 pl-3 pr-8
          bg-surface text-text-primary
          border border-border rounded-md
          text-sm
          focus:outline-none focus:ring-2 focus:ring-accent-primary
          cursor-pointer
        "
        style={{ background: '#141416', color: '#fafafa', borderColor: '#27272a' }}
      >
        {campaigns.map((c) => (
          <option key={c.id} value={c.id} style={{ background: '#141416', color: '#fafafa' }}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />

      {/* Custom tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-1 right-0 z-50 px-2.5 py-1.5 text-xs rounded-md shadow-md border whitespace-nowrap pointer-events-none" style={{ background: '#1c1c1f', color: '#fafafa', borderColor: '#27272a' }}>
          Campaign: {selectedName}
        </div>
      )}
    </div>
  );
}

/* ---------- Bottom panel tab type ---------- */

type BottomTab = 'timeline' | 'history' | 'metrics';

/* ---------- Main page ---------- */

export default function SandboxPage() {
  const { workspaceId } = useWorkspace();
  const { canWrite } = usePermissions();

  // Campaign management
  const { campaigns, isLoading: campaignsLoading } = useCampaigns({
    workspaceId: workspaceId ?? undefined,
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Auto-select first campaign
  const activeCampaignId = selectedCampaignId ?? campaigns[0]?.id ?? null;

  // Workflow type selection
  const [workflowType, setWorkflowType] = useState<WorkflowTemplateType>('email_preparation');

  // Workflow graph data
  const {
    flowNodes,
    flowEdges,
    graphNodes,
    source,
    isLoading: graphLoading,
  } = useWorkflowGraph({
    campaignId: activeCampaignId,
    workflowType,
    workspaceId,
  });

  // Execution overlay
  const [executionId, setExecutionId] = useState<string | null>(null);
  const {
    nodeStatusMap,
    events: executionEvents,
    isRunning,
    reset: resetOverlay,
  } = useExecutionOverlay({
    executionId,
    graphNodes,
  });

  // Node metrics
  const { metricsMap } = useNodeMetrics({
    campaignId: activeCampaignId,
    workflowType,
    workspaceId,
  });

  // Mutation
  const { mutateNode, isMutating } = useWorkflowMutation({
    campaignId: activeCampaignId,
    workflowType,
    workspaceId,
  });

  // Node detail drawer
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const handleNodeClick = useCallback(
    (flowNode: Node<CustomNodeData>) => {
      const graphNode = graphNodes.find((n) => n.id === flowNode.id) ?? null;
      setSelectedNode(graphNode);
    },
    [graphNodes],
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSaveParam = useCallback(
    async (nodeId: string, changes: Record<string, unknown>) => {
      await mutateNode(nodeId, changes);
    },
    [mutateNode],
  );

  // Workflow type change
  const handleWorkflowChange = useCallback(
    (type: WorkflowTemplateType) => {
      setWorkflowType(type);
      setSelectedNode(null);
      resetOverlay();
    },
    [resetOverlay],
  );

  // Execution history replay
  const handleSelectExecution = useCallback(
    (execId: string) => {
      resetOverlay();
      setExecutionId(execId);
    },
    [resetOverlay],
  );

  // Focus node on canvas (from timeline)
  const handleFocusNode = useCallback((_nodeId: string) => {
    // In a full implementation this would call reactFlowInstance.fitView
    // for the specific node. Placeholder for now.
  }, []);

  // Bottom panel tab
  const [bottomTab, setBottomTab] = useState<BottomTab>('timeline');

  // Active status for workflow selector
  const activeStatus = useMemo(() => {
    const status: Partial<Record<WorkflowTemplateType, boolean>> = {};
    status[workflowType] = true;
    return status;
  }, [workflowType]);

  /* ---- No workspace guard ---- */
  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-600 dark:text-yellow-400 max-w-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Select a workspace to use the sandbox.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ─── Top Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 border-b border-border bg-background z-10"
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <SquareTerminal className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Sandbox</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Campaign workflow sequences &amp; test runner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Source badge */}
            {source && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                source === 'live'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {source === 'live' ? 'Live' : 'Template'}
              </span>
            )}

            {/* Campaign selector */}
            <CampaignSelector
              campaigns={campaigns}
              selectedId={activeCampaignId}
              onSelect={setSelectedCampaignId}
              isLoading={campaignsLoading}
            />
          </div>
        </div>

        {/* Workflow sequence tabs */}
        <div className="flex items-center gap-2 px-4 pb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Sequences
          </span>
          <div className="h-px flex-1 bg-border/50" />
        </div>
        <WorkflowSelector
          selected={workflowType}
          onSelect={handleWorkflowChange}
          activeStatus={activeStatus}
        />
      </motion.div>

      {/* ─── Center: Canvas ─── */}
      <div className="flex-1 relative min-h-0">
        <WorkflowCanvas
          nodes={flowNodes}
          edges={flowEdges}
          onNodeClick={handleNodeClick}
          isLoading={graphLoading}
          nodeStatusMap={nodeStatusMap}
        />
      </div>

      {/* ─── Bottom Panel ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex-shrink-0 border-t border-border bg-background h-[200px] flex flex-col"
      >
        {/* Bottom tabs */}
        <div className="flex border-b border-border px-2">
          <button
            onClick={() => setBottomTab('timeline')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              bottomTab === 'timeline'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3 w-3" />
            Timeline
            {executionEvents.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-muted rounded-full">
                {executionEvents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setBottomTab('history')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              bottomTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3 w-3" />
            History
          </button>
          <button
            onClick={() => setBottomTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              bottomTab === 'metrics'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-3 w-3" />
            Metrics
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {bottomTab === 'timeline' && (
            <ExecutionTimeline
              events={executionEvents}
              isRunning={isRunning}
              onFocusNode={handleFocusNode}
            />
          )}
          {bottomTab === 'history' && (
            <ExecutionHistory
              campaignId={activeCampaignId}
              workflowType={workflowType}
              workspaceId={workspaceId}
              activeExecutionId={executionId}
              onSelectExecution={handleSelectExecution}
            />
          )}
          {bottomTab === 'metrics' && (
            <div className="p-3 overflow-y-auto h-full">
              {metricsMap.size === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No performance metrics yet
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Array.from(metricsMap.values()).map((m) => (
                    <div
                      key={m.nodeId}
                      className="p-2 bg-muted/50 rounded-md border border-border/50"
                    >
                      <p className="text-xs font-medium truncate">{m.nodeName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          Avg: {m.avgDurationMs}ms
                        </span>
                        <span className={`text-[10px] ${
                          m.errorRate > 0.1 ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          Err: {(m.errorRate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {m.executionCount} runs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Right: Node Detail Drawer ─── */}
      <NodeDetailDrawer
        node={selectedNode}
        onClose={handleCloseDrawer}
        canEdit={canWrite}
      >
        {selectedNode && selectedNode.editableParams.length > 0 && (
          <NodeEditForm
            nodeId={selectedNode.id}
            editableParams={selectedNode.editableParams}
            currentValues={selectedNode.parameters}
            onSave={handleSaveParam}
            isSaving={isMutating}
          />
        )}
      </NodeDetailDrawer>
    </div>
  );
}

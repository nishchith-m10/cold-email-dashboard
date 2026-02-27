'use client';

/**
 * useExecutionOverlay — Maps SSE execution events to graph node
 * status overlays for the workflow canvas.
 *
 * Connects to the existing EventSource SSE stream from
 * connectExecutionStream and maps events to nodeId => status.
 *
 * @module hooks/use-execution-overlay
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { connectExecutionStream } from '@/hooks/use-sandbox';
import type { ExecutionEvent } from '@/lib/genesis/phase45/types';
import type { NodeExecutionOverlayStatus } from '@/lib/workflow-graph/types';
import type { GraphNode } from '@/lib/workflow-graph/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NodeStatusMap = Map<string, NodeExecutionOverlayStatus>;

interface UseExecutionOverlayOptions {
  /** Active execution ID to connect to, or null */
  executionId: string | null;
  /** Graph nodes — used for mapping node names to IDs */
  graphNodes: GraphNode[];
}

interface UseExecutionOverlayReturn {
  /**  Map of nodeId → execution status for overlaying on canvas */
  nodeStatusMap: NodeStatusMap;
  /** List of events received in order */
  events: ExecutionEvent[];
  /** Whether the execution is still running */
  isRunning: boolean;
  /** Any connection error */
  error: string | null;
  /** Reset all status back to idle */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExecutionOverlay({
  executionId,
  graphNodes,
}: UseExecutionOverlayOptions): UseExecutionOverlayReturn {
  const [nodeStatusMap, setNodeStatusMap] = useState<NodeStatusMap>(new Map());
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a name → id lookup from graphNodes
  const nameToIdRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const map = new Map<string, string>();
    for (const node of graphNodes) {
      map.set(node.name, node.id);
    }
    nameToIdRef.current = map;
  }, [graphNodes]);

  // Map execution status to overlay status
  const mapStatus = useCallback(
    (status: string): NodeExecutionOverlayStatus => {
      switch (status) {
        case 'started':
        case 'running':
          return 'running';
        case 'success':
        case 'completed':
          return 'success';
        case 'error':
        case 'failed':
          return 'error';
        default:
          return 'idle';
      }
    },
    [],
  );

  // Connect to SSE stream when executionId changes
  useEffect(() => {
    if (!executionId) return;

    setIsRunning(true);
    setError(null);

    const cleanup = connectExecutionStream(executionId, {
      onNodeEvent: (event: ExecutionEvent) => {
        setEvents((prev) => [...prev, event]);

        // Map event to node status
        const nodeId =
          nameToIdRef.current.get(event.nodeName) || event.nodeId;

        if (nodeId) {
          setNodeStatusMap((prev) => {
            const next = new Map(prev);
            next.set(nodeId, mapStatus(event.status));
            return next;
          });
        }
      },
      onComplete: () => {
        setIsRunning(false);
      },
      onError: (msg: string) => {
        setError(msg);
        setIsRunning(false);
      },
    });

    return cleanup;
  }, [executionId, mapStatus]);

  const reset = useCallback(() => {
    setNodeStatusMap(new Map());
    setEvents([]);
    setIsRunning(false);
    setError(null);
  }, []);

  return {
    nodeStatusMap,
    events,
    isRunning,
    error,
    reset,
  };
}

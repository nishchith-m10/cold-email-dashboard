/**
 * PHASE 73: Control Plane Health Hook
 *
 * React hook for fetching the Control Plane /health endpoint
 * from the admin dashboard. Used in the existing admin page.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.5
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ControlPlaneHealth } from '@/lib/genesis/phase73-control-plane/types';

interface UseControlPlaneHealthReturn {
  health: ControlPlaneHealth | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch Control Plane health status.
 * Falls back gracefully if the Control Plane is not deployed yet (Stage 1).
 */
export function useControlPlaneHealth(): UseControlPlaneHealthReturn {
  const [health, setHealth] = useState<ControlPlaneHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/control-plane-health');

      if (!response.ok) {
        if (response.status === 503) {
          setError('Control Plane not deployed (Stage 1 — Vercel-only mode)');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as ControlPlaneHealth;
      setHealth(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch Control Plane health'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, loading, error, refresh: fetchHealth };
}

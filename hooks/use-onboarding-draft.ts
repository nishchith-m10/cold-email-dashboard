/**
 * useOnboardingDraft — Auto-save / restore partial form data during onboarding.
 *
 * Usage:
 *   const { draft, isLoading, save } = useOnboardingDraft(workspaceId, 'brand_info');
 *
 * - `draft` is the previously-saved partial data (or null).
 * - `save(data)` debounces writes at 500ms.
 * - The draft for a stage is cleared server-side when that stage is completed.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseOnboardingDraftReturn {
  /** Previously-saved draft data for this stage, or null */
  draft: Record<string, unknown> | null;
  /** True while the initial draft is being loaded */
  isLoading: boolean;
  /** Debounced save function — call on every field change */
  save: (data: Record<string, unknown>) => void;
}

export function useOnboardingDraft(
  workspaceId: string | undefined,
  stage: string,
): UseOnboardingDraftReturn {
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<Record<string, unknown> | null>(null);

  // Load draft on mount
  useEffect(() => {
    if (!workspaceId || !stage) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/onboarding/draft?workspace_id=${encodeURIComponent(workspaceId!)}&stage=${encodeURIComponent(stage)}`,
        );
        if (res.ok && !cancelled) {
          const json = await res.json();
          setDraft(json.draft ?? null);
        }
      } catch (err) {
        console.error('Failed to load onboarding draft:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, stage]);

  // Debounced save
  const save = useCallback(
    (data: Record<string, unknown>) => {
      if (!workspaceId || !stage) return;

      latestDataRef.current = data;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const payload = latestDataRef.current;
        if (!payload) return;

        try {
          await fetch('/api/onboarding/draft', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspace_id: workspaceId,
              stage,
              data: payload,
            }),
          });
        } catch (err) {
          console.error('Failed to save onboarding draft:', err);
        }
      }, 500);
    },
    [workspaceId, stage],
  );

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Fire a final save synchronously if there's pending data
        const pending = latestDataRef.current;
        if (pending && workspaceId && stage) {
          // Use sendBeacon for reliability on unload, fallback to fetch
          try {
            const payload = JSON.stringify({
              workspace_id: workspaceId,
              stage,
              data: pending,
            });
            if (typeof navigator?.sendBeacon === 'function') {
              navigator.sendBeacon(
                '/api/onboarding/draft',
                new Blob([payload], { type: 'application/json' }),
              );
            }
          } catch {
            // Best effort — draft may be lost on sudden close
          }
        }
      }
    };
  }, [workspaceId, stage]);

  return { draft, isLoading, save };
}

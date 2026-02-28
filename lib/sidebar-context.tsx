'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

/**
 * Sidebar Context
 * 
 * Manages sidebar display mode with server-side persistence
 * Modes: 'expanded' | 'collapsed' | 'hover'
 */

export type SidebarMode = 'expanded' | 'collapsed' | 'hover';

interface SidebarContextValue {
  mode: SidebarMode;
  setMode: (mode: SidebarMode) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
  isExpanded: boolean; // Computed based on mode and hover
  effectiveWidth: number; // Width in pixels
  mounted: boolean; // True after sidebar mode has been loaded from storage/server
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

const EXPANDED_WIDTH = 200;
const COLLAPSED_WIDTH = 48;

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [mode, setModeState] = useState<SidebarMode>(() => {
    if (typeof window === 'undefined') return 'expanded'; // SSR default
    const saved = localStorage.getItem('sidebar_mode');
    return (saved === 'collapsed' || saved === 'hover') ? saved : 'expanded';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load mode from server settings or localStorage on mount
  useEffect(() => {
    const loadSidebarMode = async () => {
      try {
        // Try to load from server
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.sidebar_mode && ['expanded', 'collapsed', 'hover'].includes(data.sidebar_mode)) {
            setModeState(data.sidebar_mode);
            setMounted(true);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load sidebar mode from server:', error);
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('sidebar_mode');
      if (saved && ['expanded', 'collapsed', 'hover'].includes(saved)) {
        setModeState(saved as SidebarMode);
      }
      setMounted(true);
    };

    loadSidebarMode();
  }, []);

  const setMode = useCallback(async (newMode: SidebarMode) => {
    setModeState(newMode);
    localStorage.setItem('sidebar_mode', newMode);

    // Persist to server
    try {
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sidebar_mode: newMode }),
      });
    } catch (error) {
      console.error('Failed to save sidebar mode to server:', error);
    }
  }, []);

  // Compute expanded state
  const isExpanded = 
    mode === 'expanded' || 
    (mode === 'hover' && isHovered);

  const effectiveWidth = isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  return (
    <SidebarContext.Provider 
      value={{ 
        mode,
        setMode,
        isHovered, 
        setIsHovered,
        isExpanded,
        effectiveWidth,
        mounted
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

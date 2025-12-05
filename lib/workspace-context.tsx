'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { DEFAULT_WORKSPACE_ID } from './supabase';

// ============================================
// WORKSPACE TYPES
// ============================================

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  settings?: Record<string, unknown>;
  role?: WorkspaceRole;
  canRead?: boolean;
  canWrite?: boolean;
  canManage?: boolean;
}

export interface WorkspaceContextValue {
  // Current workspace
  workspace: Workspace;
  workspaceId: string;
  
  // Available workspaces (for multi-workspace users)
  workspaces: Workspace[];
  
  // Actions
  setWorkspace: (workspace: Workspace) => void;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<{ success: boolean; error?: string }>;
  
  // Loading state
  isLoading: boolean;
  
  // User info
  isSuperAdmin: boolean;
  userRole: WorkspaceRole | null;
  
  // Convenience
  isDefaultWorkspace: boolean;
  canWrite: boolean;
  canManage: boolean;
}

// ============================================
// DEFAULT WORKSPACE
// ============================================

const defaultWorkspace: Workspace = {
  id: DEFAULT_WORKSPACE_ID,
  name: 'Default Workspace',
  slug: 'default',
  plan: 'free',
  role: 'owner',
  canRead: true,
  canWrite: true,
  canManage: true,
};

// ============================================
// CONTEXT
// ============================================

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface WorkspaceProviderProps {
  children: React.ReactNode;
  initialWorkspace?: Workspace;
}

export function WorkspaceProvider({ 
  children, 
  initialWorkspace = defaultWorkspace 
}: WorkspaceProviderProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [workspace, setWorkspaceState] = useState<Workspace>(initialWorkspace);
  const [workspaces, setWorkspacesState] = useState<Workspace[]>([initialWorkspace]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Fetch workspaces from API
  const fetchWorkspaces = useCallback(async () => {
    if (!isUserLoaded) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/workspaces');
      if (!response.ok) throw new Error('Failed to fetch workspaces');
      
      const data = await response.json();
      
      if (data.workspaces && data.workspaces.length > 0) {
        setWorkspacesState(data.workspaces);
        localStorage.setItem('user_workspaces', JSON.stringify(data.workspaces));
        
        // Restore saved workspace or use first one
        const savedWorkspaceId = localStorage.getItem('current_workspace_id');
        const savedWorkspace = savedWorkspaceId 
          ? data.workspaces.find((w: Workspace) => w.id === savedWorkspaceId)
          : null;
        
        if (savedWorkspace) {
          setWorkspaceState(savedWorkspace);
        } else if (data.current) {
          setWorkspaceState(data.current);
          localStorage.setItem('current_workspace_id', data.current.id);
        } else {
          setWorkspaceState(data.workspaces[0]);
          localStorage.setItem('current_workspace_id', data.workspaces[0].id);
        }
        
        setIsSuperAdmin(data.isSuperAdmin || false);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      // Fallback to localStorage
      const savedWorkspaces = localStorage.getItem('user_workspaces');
      if (savedWorkspaces) {
        try {
          const parsed = JSON.parse(savedWorkspaces);
          setWorkspacesState(parsed);
        } catch {
          // Use default
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isUserLoaded]);

  // Load workspaces when user changes
  useEffect(() => {
    if (isUserLoaded) {
      fetchWorkspaces();
    }
  }, [isUserLoaded, user?.id, fetchWorkspaces]);

  // Set current workspace
  const setWorkspace = useCallback((ws: Workspace) => {
    setWorkspaceState(ws);
    localStorage.setItem('current_workspace_id', ws.id);
  }, []);

  // Switch workspace by ID
  const switchWorkspace = useCallback((wsId: string) => {
    const found = workspaces.find(w => w.id === wsId);
    if (found) {
      setWorkspace(found);
    }
  }, [workspaces, setWorkspace]);

  // Refresh workspaces list
  const refreshWorkspaces = useCallback(async () => {
    await fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Create new workspace
  const createWorkspace = useCallback(async (name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create workspace' };
      }

      // Refresh workspaces list
      await fetchWorkspaces();

      // Switch to new workspace
      if (data.workspace) {
        setWorkspace(data.workspace);
      }

      return { success: true };
    } catch (error) {
      console.error('Create workspace error:', error);
      return { success: false, error: 'Failed to create workspace' };
    }
  }, [fetchWorkspaces, setWorkspace]);

  // Memoized context value
  const value = useMemo<WorkspaceContextValue>(() => ({
    workspace,
    workspaceId: workspace.id,
    workspaces,
    setWorkspace,
    switchWorkspace,
    refreshWorkspaces,
    createWorkspace,
    isLoading,
    isSuperAdmin,
    userRole: workspace.role || null,
    isDefaultWorkspace: workspace.id === DEFAULT_WORKSPACE_ID,
    canWrite: workspace.canWrite ?? true,
    canManage: workspace.canManage ?? false,
  }), [
    workspace, 
    workspaces, 
    setWorkspace, 
    switchWorkspace, 
    refreshWorkspaces, 
    createWorkspace, 
    isLoading, 
    isSuperAdmin
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  
  return context;
}

// ============================================
// OPTIONAL HOOK (doesn't throw if outside provider)
// ============================================

export function useOptionalWorkspace(): WorkspaceContextValue | undefined {
  return useContext(WorkspaceContext);
}

// Export default workspace for use in server components
export { defaultWorkspace, DEFAULT_WORKSPACE_ID };


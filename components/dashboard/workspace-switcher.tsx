'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Building2, Plus, Shield, Crown, Users, Eye, Pencil, X } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { useWorkspace, type Workspace, type WorkspaceRole } from '@/lib/workspace-context';
import { Input } from '@/components/ui/input';

interface WorkspaceSwitcherProps {
  className?: string;
  showAddButton?: boolean;
  onAddWorkspace?: () => void;
}

// Role badge colors and icons
const ROLE_CONFIG: Record<WorkspaceRole, { icon: typeof Shield; color: string; label: string }> = {
  owner: { icon: Crown, color: 'text-yellow-500', label: 'Owner' },
  admin: { icon: Shield, color: 'text-blue-500', label: 'Admin' },
  member: { icon: Users, color: 'text-green-500', label: 'Member' },
  viewer: { icon: Eye, color: 'text-gray-500', label: 'Viewer' },
};

function RoleBadge({ role }: { role?: WorkspaceRole }) {
  if (!role) return null;
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;
  
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function WorkspaceSwitcher({
  className,
  showAddButton = false,
  onAddWorkspace,
}: WorkspaceSwitcherProps) {
  const { workspace, workspaces, switchWorkspace, renameWorkspace, isLoading, isSuperAdmin, canManage } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === workspace.name) {
      setIsEditing(false);
      setIsHovered(false); // Reset hover state when exiting edit mode
      return;
    }

    try {
      setIsSaving(true);
      if (workspace.id) {
        const result = await renameWorkspace(workspace.id, trimmed);
        if (result.success) {
          // Successfully saved
          setIsEditing(false);
          setIsHovered(false);
        } else {
          // Show error and keep editing
          console.error('Failed to save workspace name:', result.error);
          // Optionally show toast notification here
        }
      }
    } catch (err) {
      console.error('Failed to save workspace name:', err);
      // Keep editing mode on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsHovered(false); // Reset hover state when canceling
    setEditValue(workspace.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleValueChange = (workspaceId: string) => {
    if (workspaceId === '__add__') {
      onAddWorkspace?.();
      return;
    }
    switchWorkspace(workspaceId);
  };
  
  // If only one workspace, just show the name with role (and allow edit)
  if (workspaces.length <= 1 && !showAddButton) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary',
        className
      )}>
        <Building2 className="h-4 w-4 text-text-secondary flex-shrink-0" />
        {isEditing ? (
          <div className="flex items-center gap-1 min-w-[100px] max-w-[280px]">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              disabled={isSaving}
              className="h-7 py-0.5 px-2 text-sm flex-1 min-w-0"
            />
            <button
              onClick={handleCancel}
              className="p-0.5 hover:bg-surface-elevated rounded flex-shrink-0"
              title="Cancel"
            >
              <X className="h-3 w-3 text-text-secondary" />
            </button>
          </div>
        ) : (
          <div
            className={cn(
              "group inline-flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer hover:bg-surface-elevated/50 transition-colors",
              (canManage || isSuperAdmin) && "cursor-pointer"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
              if (canManage || isSuperAdmin) {
                setEditValue(workspace.name);
                setIsEditing(true);
              }
            }}
          >
            <span className="truncate max-w-[280px]">{workspace.name}</span>
            {(canManage || isSuperAdmin) && isHovered && (
              <Pencil className="h-3 w-3 text-text-secondary flex-shrink-0" />
            )}
          </div>
        )}
        {isSuperAdmin && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
            Admin
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center', className)}>
      <Building2 className="h-4 w-4 text-text-secondary flex-shrink-0" />
      {isEditing ? (
        <div className="flex items-center gap-1 px-2 py-1.5 min-w-[100px] max-w-[280px]">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            disabled={isSaving}
            className="h-7 py-0.5 px-2 text-sm flex-1 min-w-0"
          />
          <button
            onClick={handleCancel}
            className="p-0.5 hover:bg-surface-elevated rounded flex-shrink-0"
            title="Cancel"
          >
            <X className="h-3 w-3 text-text-secondary" />
          </button>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "group inline-flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-surface-elevated/50 transition-colors",
              (canManage || isSuperAdmin) && "cursor-pointer"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
              if (canManage || isSuperAdmin) {
                setEditValue(workspace.name);
                setIsEditing(true);
              }
            }}
          >
            <span className="text-sm font-medium text-text-primary truncate max-w-[280px]">{workspace.name}</span>
            {(canManage || isSuperAdmin) && isHovered && (
              <Pencil className="h-3 w-3 text-text-secondary flex-shrink-0" />
            )}
          </div>
          <Select.Root
            value={workspace.id}
            onValueChange={handleValueChange}
            open={isOpen}
            onOpenChange={setIsOpen}
          >
            <Select.Trigger
              className={cn(
                'px-1 py-1.5 rounded-lg transition-colors hover:bg-surface-elevated/50',
                'outline-none focus:ring-2 focus:ring-accent-primary'
              )}
              aria-label="Switch workspace"
              disabled={isLoading}
            >
              <ChevronDown className={cn(
                'h-4 w-4 text-text-secondary transition-transform flex-shrink-0',
                isOpen && 'rotate-180'
              )} />
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className={cn(
                  'z-50 min-w-[220px] overflow-hidden rounded-xl',
                  'bg-surface border border-border shadow-2xl',
                  'animate-slide-down'
                )}
                position="popper"
                sideOffset={8}
              >
                <Select.Viewport className="p-1">
                  {isSuperAdmin && (
                    <div className="px-3 py-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg mb-1">
                      <Shield className="h-3 w-3 inline mr-1" />
                      Super Admin - All Workspaces
                    </div>
                  )}
                  
                  {workspaces.map(ws => (
                    <Select.Item
                      key={ws.id}
                      value={ws.id}
                      className={cn(
                        'relative flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg',
                        'text-text-primary cursor-pointer outline-none',
                        'data-[highlighted]:bg-surface-elevated',
                        'data-[state=checked]:text-accent-primary'
                      )}
                    >
                      <Select.ItemIndicator className="absolute left-3">
                        <Check className="h-4 w-4" />
                      </Select.ItemIndicator>
                      <div className="pl-6 flex flex-col gap-0.5 w-full">
                        <span className="font-medium truncate">{ws.name}</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-text-secondary capitalize">
                            {ws.plan || 'free'} plan
                          </span>
                          <RoleBadge role={ws.role} />
                        </div>
                      </div>
                    </Select.Item>
                  ))}

                  {(showAddButton || canManage || isSuperAdmin) && (
                    <>
                      <Select.Separator className="h-px bg-border my-1" />
                      <Select.Item
                        value="__add__"
                        className={cn(
                          'relative flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg',
                          'text-accent-primary cursor-pointer outline-none',
                          'data-[highlighted]:bg-surface-elevated'
                        )}
                      >
                        <Plus className="h-4 w-4 ml-6" />
                        <span>Create workspace</span>
                      </Select.Item>
                    </>
                  )}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </>
      )}
    </div>
  );
}


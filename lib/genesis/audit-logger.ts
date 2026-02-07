/**
 * AUDIT LOGGER: Phase 67 - Comprehensive Audit Logging
 * 
 * Provides TypeScript functions to log audit events for compliance.
 * All significant system actions should be logged using these functions.
 * 
 * Source: GENESIS_SINGULARITY_PLAN_V35.md Section 67
 * 
 * @module genesis-phase67/lib/audit-logger
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

/**
 * Actor types for audit events
 */
export type ActorType = 'user' | 'system' | 'support' | 'sidecar' | 'admin';

/**
 * Action categories for audit events
 */
export type ActionCategory = 
  | 'provisioning'
  | 'credentials'
  | 'workflows'
  | 'droplet'
  | 'security'
  | 'support'
  | 'billing'
  | 'data';

/**
 * Audit event data structure
 */
export interface AuditEvent {
  actorType: ActorType;
  actorId: string;
  action: string;
  actionCategory: ActionCategory;
  targetType?: string;
  targetId?: string;
  workspaceId?: string;
  ipAddress?: string;
  userAgent?: string;
  region?: string;
  details?: Record<string, any>;
  actorEmail?: string;
}

/**
 * Result of audit log operation
 */
export interface AuditLogResult {
  success: boolean;
  auditId: string | null;
  error: string | null;
}

/**
 * Logs an audit event to the database
 * 
 * @param supabaseClient - Authenticated Supabase client
 * @param event - Audit event data
 * @returns Result of audit log operation
 * 
 * @example
 * ```typescript
 * import { logAuditEvent } from '@/lib/genesis/audit-logger';
 * 
 * await logAuditEvent(supabase, {
 *   actorType: 'user',
 *   actorId: userId,
 *   action: 'IGNITION_STARTED',
 *   actionCategory: 'provisioning',
 *   targetType: 'workspace',
 *   targetId: workspaceId,
 *   workspaceId: workspaceId,
 *   ipAddress: req.headers['x-forwarded-for'],
 *   details: { droplet_size: 'basic-2vcpu-4gb', region: 'nyc1' }
 * });
 * ```
 */
export async function logAuditEvent(
  supabaseClient: SupabaseClient<Database>,
  event: AuditEvent
): Promise<AuditLogResult> {
  try {
    const { data, error } = await supabaseClient.schema('genesis').rpc(
      'fn_log_audit_event',
      {
        p_actor_type: event.actorType,
        p_actor_id: event.actorId,
        p_action: event.action,
        p_action_category: event.actionCategory,
        p_target_type: event.targetType || null,
        p_target_id: event.targetId || null,
        p_workspace_id: event.workspaceId || null,
        p_ip_address: event.ipAddress || null,
        p_user_agent: event.userAgent || null,
        p_region: event.region || null,
        p_details: event.details || {},
        p_actor_email: event.actorEmail || null,
      }
    );

    if (error) {
      console.error('[Audit Logger] Failed to log event:', error);
      return {
        success: false,
        auditId: null,
        error: error.message,
      };
    }

    return {
      success: true,
      auditId: data as string,
      error: null,
    };
  } catch (err) {
    console.error('[Audit Logger] Exception:', err);
    return {
      success: false,
      auditId: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Pre-defined audit event helpers for common actions
 */
export const AuditEvents = {
  // Provisioning events
  ignitionStarted: (
    workspaceId: string,
    userId: string,
    details: Record<string, any>
  ): AuditEvent => ({
    actorType: 'user',
    actorId: userId,
    action: 'IGNITION_STARTED',
    actionCategory: 'provisioning',
    targetType: 'workspace',
    targetId: workspaceId,
    workspaceId,
    details,
  }),

  ignitionCompleted: (
    workspaceId: string,
    details: Record<string, any>
  ): AuditEvent => ({
    actorType: 'system',
    actorId: 'ignition-orchestrator',
    action: 'IGNITION_COMPLETED',
    actionCategory: 'provisioning',
    targetType: 'workspace',
    targetId: workspaceId,
    workspaceId,
    details,
  }),

  ignitionFailed: (
    workspaceId: string,
    error: string,
    details: Record<string, any>
  ): AuditEvent => ({
    actorType: 'system',
    actorId: 'ignition-orchestrator',
    action: 'IGNITION_FAILED',
    actionCategory: 'provisioning',
    targetType: 'workspace',
    targetId: workspaceId,
    workspaceId,
    details: { ...details, error },
  }),

  // Security events
  loginSuccess: (
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string
  ): AuditEvent => ({
    actorType: 'user',
    actorId: userId,
    actorEmail: email,
    action: 'LOGIN_SUCCESS',
    actionCategory: 'security',
    ipAddress,
    userAgent,
  }),

  loginFailed: (
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string
  ): AuditEvent => ({
    actorType: 'user',
    actorId: email,
    actorEmail: email,
    action: 'LOGIN_FAILED',
    actionCategory: 'security',
    ipAddress,
    userAgent,
    details: { reason },
  }),

  permissionDenied: (
    userId: string,
    resource: string,
    action: string
  ): AuditEvent => ({
    actorType: 'user',
    actorId: userId,
    action: 'PERMISSION_DENIED',
    actionCategory: 'security',
    details: { resource, attempted_action: action },
  }),

  // Droplet events
  dropletCreated: (
    workspaceId: string,
    dropletId: string,
    details: Record<string, any>
  ): AuditEvent => ({
    actorType: 'system',
    actorId: 'ignition-orchestrator',
    action: 'DROPLET_CREATED',
    actionCategory: 'droplet',
    targetType: 'droplet',
    targetId: dropletId,
    workspaceId,
    details,
  }),

  dropletTerminated: (
    workspaceId: string,
    dropletId: string,
    reason: string
  ): AuditEvent => ({
    actorType: 'system',
    actorId: 'ignition-orchestrator',
    action: 'DROPLET_TERMINATED',
    actionCategory: 'droplet',
    targetType: 'droplet',
    targetId: dropletId,
    workspaceId,
    details: { reason },
  }),

  // Data events
  dataExported: (
    workspaceId: string,
    userId: string,
    recordCounts: Record<string, number>
  ): AuditEvent => ({
    actorType: 'user',
    actorId: userId,
    action: 'DATA_EXPORTED',
    actionCategory: 'data',
    targetType: 'workspace',
    targetId: workspaceId,
    workspaceId,
    details: { record_counts: recordCounts },
  }),

  dataDeleted: (
    workspaceId: string,
    userId: string,
    recordCounts: Record<string, number>
  ): AuditEvent => ({
    actorType: 'user',
    actorId: userId,
    action: 'DATA_DELETED',
    actionCategory: 'data',
    targetType: 'workspace',
    targetId: workspaceId,
    workspaceId,
    details: { record_counts: recordCounts },
  }),

  // Support events
  supportAccessGranted: (
    workspaceId: string,
    agentId: string,
    agentEmail: string,
    accessLevel: string,
    ticketId: string
  ): AuditEvent => ({
    actorType: 'support',
    actorId: agentId,
    actorEmail: agentEmail,
    action: 'SUPPORT_ACCESS_GRANTED',
    actionCategory: 'support',
    targetType: 'workspace',
    targetId: workspaceId,
    workspaceId,
    details: { access_level: accessLevel, ticket_id: ticketId },
  }),

  supportAccessRevoked: (
    workspaceId: string,
    agentId: string,
    agentEmail: string,
    ticketId: string
  ): AuditEvent => ({
    actorType: 'support',
    actorId: agentId,
    actorEmail: agentEmail,
    action: 'SUPPORT_ACCESS_REVOKED',
    actionCategory: 'support',
    targetType: 'workspace',
    targetId: workspaceId,
    workspaceId,
    details: { ticket_id: ticketId },
  }),

  // Workflow events
  workflowDeployed: (
    workspaceId: string,
    workflowName: string,
    workflowId: string
  ): AuditEvent => ({
    actorType: 'sidecar',
    actorId: 'workflow-deployer',
    action: 'WORKFLOW_DEPLOYED',
    actionCategory: 'workflows',
    targetType: 'workflow',
    targetId: workflowId,
    workspaceId,
    details: { workflow_name: workflowName },
  }),

  workflowActivated: (
    workspaceId: string,
    workflowName: string,
    workflowId: string
  ): AuditEvent => ({
    actorType: 'user',
    actorId: 'system',
    action: 'WORKFLOW_ACTIVATED',
    actionCategory: 'workflows',
    targetType: 'workflow',
    targetId: workflowId,
    workspaceId,
    details: { workflow_name: workflowName },
  }),
};

/**
 * Retrieves audit logs for a workspace
 * 
 * @param supabaseClient - Authenticated Supabase client
 * @param workspaceId - Workspace ID to fetch logs for
 * @param options - Query options (limit, offset, action filter)
 * @returns Array of audit log entries
 */
export async function getAuditLogs(
  supabaseClient: SupabaseClient<Database>,
  workspaceId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    actionCategory?: ActionCategory;
    startDate?: Date;
    endDate?: Date;
  }
) {
  try {
    let query = (supabaseClient
      .schema('genesis')
      .from('audit_log')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    if (options?.action) {
      query = query.eq('action', options.action);
    }

    if (options?.actionCategory) {
      query = query.eq('action_category', options.actionCategory);
    }

    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Audit Logger] Failed to fetch logs:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[Audit Logger] Exception fetching logs:', err);
    return [];
  }
}

/**
 * GDPR SERVICE: Phase 66 - Data Residency & GDPR Protocol
 * 
 * Provides TypeScript functions for GDPR compliance:
 * - Right to Access (data export)
 * - Right to Erasure (data deletion)
 * - Compliance reporting
 * 
 * Source: GENESIS_SINGULARITY_PLAN_V35.md Section 66
 * 
 * @module genesis-phase66/lib/gdpr-service
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

/**
 * Workspace data export result
 */
export interface WorkspaceDataExport {
  exportId: string;
  workspaceInfo: {
    workspace_id: string;
    workspace_name: string;
    created_at: string;
    region: string | null;
    droplet_size: string | null;
  };
  leadsData: Array<any>;
  eventsData: Array<any>;
  campaignsData: Array<any>;
  metadata: {
    export_id: string;
    export_timestamp: string;
    export_format_version: string;
    total_leads: number;
    total_events: number;
    total_campaigns: number;
    gdpr_compliant: boolean;
  };
}

/**
 * Data deletion result
 */
export interface DataDeletionResult {
  success: boolean;
  operation: 'deleted' | 'not_found' | 'invalid_confirmation' | 'failed';
  deletedCounts: {
    leads: number;
    events: number;
    campaigns: number;
    audit_logs: number;
    workspace: number;
  } | null;
  error: string | null;
}

/**
 * GDPR compliance report
 */
export interface GDPRComplianceReport {
  workspaceId: string;
  workspaceName: string;
  dataRegion: string | null;
  gdprCompliant: boolean;
  dataResidencyCompliant: boolean;
  personalDataLocations: {
    database: {
      provider: string;
      region: string | null;
      tables: string[];
    };
    droplet: {
      provider: string;
      region: string | null;
      purpose: string;
    };
  };
  subProcessors: Array<{
    name: string;
    purpose: string;
    data_location: string | null;
    dpa_signed: boolean;
  }>;
  auditTrailRetentionDays: number;
  lastExportDate: string | null;
  complianceChecks: {
    data_in_region: boolean;
    droplet_in_region: boolean;
    audit_logging_enabled: boolean;
    encryption_at_rest: boolean;
    encryption_in_transit: boolean;
    rls_enabled: boolean;
  };
}

/**
 * Exports all workspace data (GDPR Right to Access)
 * 
 * This function retrieves all personal data associated with a workspace
 * in a structured format suitable for GDPR compliance.
 * 
 * @param supabaseClient - Admin Supabase client
 * @param workspaceId - Workspace ID to export
 * @returns Workspace data export or null on error
 * 
 * @example
 * ```typescript
 * import { exportWorkspaceData } from '@/lib/genesis/gdpr-service';
 * import { supabaseAdmin } from '@/lib/supabase';
 * 
 * const exportData = await exportWorkspaceData(
 *   supabaseAdmin!,
 *   '123e4567-e89b-12d3-a456-426614174000'
 * );
 * 
 * if (exportData) {
 *   // Download as JSON file
 *   const blob = new Blob([JSON.stringify(exportData, null, 2)], {
 *     type: 'application/json'
 *   });
 *   // ... trigger download
 * }
 * ```
 */
export async function exportWorkspaceData(
  supabaseClient: SupabaseClient<Database>,
  workspaceId: string
): Promise<WorkspaceDataExport | null> {
  try {
    const { data, error } = await (supabaseClient.schema('genesis') as any).rpc(
      'fn_export_workspace_data',
      {
        p_workspace_id: workspaceId,
      }
    );

    if (error) {
      console.error('[GDPR Service] Export failed:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error('[GDPR Service] No export data returned');
      return null;
    }

    const result = data[0];

    return {
      exportId: result.export_id,
      workspaceInfo: result.workspace_info,
      leadsData: result.leads_data,
      eventsData: result.events_data,
      campaignsData: result.campaigns_data,
      metadata: result.metadata,
    };
  } catch (err) {
    console.error('[GDPR Service] Exception during export:', err);
    return null;
  }
}

/**
 * Generates the confirmation code required for data deletion
 * 
 * Format: "DELETE-{first 8 chars of workspace_id}"
 * 
 * @param workspaceId - Workspace ID
 * @returns Confirmation code
 * 
 * @example
 * ```typescript
 * const code = generateDeletionConfirmationCode(workspaceId);
 * // Returns: "DELETE-123e4567"
 * ```
 */
export function generateDeletionConfirmationCode(workspaceId: string): string {
  return `DELETE-${workspaceId.substring(0, 8)}`;
}

/**
 * Deletes all workspace data (GDPR Right to Erasure)
 * 
 * This is a DESTRUCTIVE operation that permanently deletes:
 * - All leads
 * - All events
 * - All campaigns
 * - Workspace infrastructure records
 * - The workspace itself
 * 
 * Note: Audit log entries are retained per GDPR guidance
 * (retention of deletion evidence is compliant).
 * 
 * @param supabaseClient - Admin Supabase client
 * @param workspaceId - Workspace ID to delete
 * @param confirmationCode - Confirmation code (use generateDeletionConfirmationCode)
 * @param userId - Optional user ID who requested deletion
 * @returns Deletion result
 * 
 * @example
 * ```typescript
 * import { deleteWorkspaceData, generateDeletionConfirmationCode } from '@/lib/genesis/gdpr-service';
 * 
 * const confirmationCode = generateDeletionConfirmationCode(workspaceId);
 * 
 * // Show confirmation UI to user with the code
 * const userConfirmedCode = await getUserInput();
 * 
 * if (userConfirmedCode === confirmationCode) {
 *   const result = await deleteWorkspaceData(
 *     supabaseAdmin!,
 *     workspaceId,
 *     confirmationCode,
 *     userId
 *   );
 * 
 *   if (result.success) {
 *     console.log('Deleted:', result.deletedCounts);
 *   }
 * }
 * ```
 */
export async function deleteWorkspaceData(
  supabaseClient: SupabaseClient<Database>,
  workspaceId: string,
  confirmationCode: string,
  userId?: string
): Promise<DataDeletionResult> {
  try {
    const { data, error } = await (supabaseClient.schema('genesis') as any).rpc(
      'fn_delete_workspace_data',
      {
        p_workspace_id: workspaceId,
        p_confirmation_code: confirmationCode,
        p_user_id: userId || null,
      }
    );

    if (error) {
      return {
        success: false,
        operation: 'failed',
        deletedCounts: null,
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        operation: 'failed',
        deletedCounts: null,
        error: 'No data returned from deletion function',
      };
    }

    const result = data[0];

    return {
      success: result.success,
      operation: result.operation,
      deletedCounts: result.deleted_counts,
      error: result.error_message,
    };
  } catch (err) {
    return {
      success: false,
      operation: 'failed',
      deletedCounts: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Retrieves a GDPR compliance report for a workspace
 * 
 * This report documents:
 * - Data locations and regions
 * - Sub-processors (Supabase, DigitalOcean)
 * - Compliance checks
 * - Audit trail retention policy
 * 
 * @param supabaseClient - Supabase client
 * @param workspaceId - Workspace ID
 * @returns GDPR compliance report or null on error
 * 
 * @example
 * ```typescript
 * import { getGDPRComplianceReport } from '@/lib/genesis/gdpr-service';
 * 
 * const report = await getGDPRComplianceReport(supabase, workspaceId);
 * 
 * if (report) {
 *   console.log('GDPR Compliant:', report.gdprCompliant);
 *   console.log('Data Region:', report.dataRegion);
 *   console.log('Sub-processors:', report.subProcessors);
 * }
 * ```
 */
export async function getGDPRComplianceReport(
  supabaseClient: SupabaseClient<Database>,
  workspaceId: string
): Promise<GDPRComplianceReport | null> {
  try {
    const { data, error } = await (supabaseClient.schema('genesis') as any).rpc(
      'fn_get_gdpr_compliance_report',
      {
        p_workspace_id: workspaceId,
      }
    );

    if (error) {
      console.error('[GDPR Service] Compliance report failed:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error('[GDPR Service] No compliance report returned');
      return null;
    }

    const result = data[0];

    return {
      workspaceId: result.workspace_id,
      workspaceName: result.workspace_name,
      dataRegion: result.data_region,
      gdprCompliant: result.gdpr_compliant,
      dataResidencyCompliant: result.data_residency_compliant,
      personalDataLocations: result.personal_data_locations,
      subProcessors: result.sub_processors,
      auditTrailRetentionDays: result.audit_trail_retention_days,
      lastExportDate: result.last_export_date,
      complianceChecks: result.compliance_checks,
    };
  } catch (err) {
    console.error('[GDPR Service] Exception fetching compliance report:', err);
    return null;
  }
}

/**
 * Formats a workspace data export as downloadable JSON file
 * 
 * @param exportData - Workspace data export
 * @param filename - Optional custom filename
 * @returns Blob suitable for download
 */
export function formatExportAsDownload(
  exportData: WorkspaceDataExport,
  filename?: string
): { blob: Blob; filename: string } {
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  const defaultFilename = `workspace-export-${exportData.workspaceInfo.workspace_id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;

  return {
    blob,
    filename: filename || defaultFilename,
  };
}

/**
 * Triggers a browser download of workspace export data
 * 
 * @param exportData - Workspace data export
 * @param filename - Optional custom filename
 */
export function downloadWorkspaceExport(
  exportData: WorkspaceDataExport,
  filename?: string
): void {
  const { blob, filename: finalFilename } = formatExportAsDownload(
    exportData,
    filename
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

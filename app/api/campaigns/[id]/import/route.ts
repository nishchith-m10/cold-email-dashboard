/**
 * Campaign CSV Lead Import API
 *
 * POST /api/campaigns/[id]/import
 * Content-Type: multipart/form-data
 * Query: workspace_id
 *
 * Body (FormData):
 *   file: CSV file with leads (required)
 *
 * Uses the Phase 61.B CSV import library (lib/genesis/phase61b/)
 * to parse, validate, and insert leads into the workspace leads table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { getLeadsTableName } from '@/lib/workspace-db-config';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import { CsvImporter } from '@/lib/genesis/phase61b/csv-importer';
import { CsvParser } from '@/lib/genesis/phase61b/csv-parser';
import { CsvValidator } from '@/lib/genesis/phase61b/csv-validator';
import type { ValidatedLead } from '@/lib/genesis/phase61b/csv-import-types';
import { MAX_CSV_FILE_SIZE_BYTES } from '@/lib/genesis/phase61b/csv-import-types';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Map a ValidatedLead (Phase 61.B schema) to a row compatible with the
 * workspace leads table (leads_ohio / genesis.leads).
 *
 * Column notes:
 *  - full_name: concatenated from first_name + last_name
 *  - organization_website: aliased from website_url (leads_ohio convention)
 *  - campaign_name: tagged from the campaign record
 */
function toLeadRow(
  lead: ValidatedLead,
  workspaceId: string,
  campaignName: string
): Record<string, unknown> {
  const fullName =
    [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || null;

  return {
    workspace_id: workspaceId,
    email_address: lead.email_address.trim().toLowerCase(),
    full_name: fullName,
    organization_name: lead.organization_name?.trim() || null,
    linkedin_url: lead.linkedin_url?.trim() || null,
    organization_website: lead.website_url?.trim() || null,
    position: lead.position?.trim() || null,
    industry: lead.industry?.trim() || null,
    campaign_name: campaignName,
    // default flags — n8n controls the sequence
    email_1_sent: false,
    email_2_sent: false,
    email_3_sent: false,
    replied: false,
    opted_out: false,
  };
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return jsonResponse({ success: false, error: 'Database not configured' }, 503);
  }

  const { id: campaignId } = await params;

  // ── Auth + workspace guard ──
  const { searchParams } = new URL(req.url);
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  const workspaceId = extractWorkspaceId(req, searchParams) || DEFAULT_WORKSPACE_ID;

  // ── Verify campaign belongs to workspace ──
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status')
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
    .single();

  if (campaignError || !campaign) {
    return jsonResponse({ success: false, error: 'Campaign not found' }, 404);
  }

  // ── Parse multipart form data ──
  let fileContent: string;
  let fileName: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return jsonResponse(
        { success: false, error: 'A CSV file is required (field name: file)' },
        400
      );
    }

    // File size check before reading
    if (file.size > MAX_CSV_FILE_SIZE_BYTES) {
      return jsonResponse(
        {
          success: false,
          error: `File too large. Maximum size is ${MAX_CSV_FILE_SIZE_BYTES / 1024 / 1024}MB`,
        },
        400
      );
    }

    fileName = file.name;
    fileContent = await file.text();
  } catch {
    return jsonResponse({ success: false, error: 'Failed to read uploaded file' }, 400);
  }

  // ── Validate headers + parse rows ──
  const headers = CsvParser.extractHeaders(fileContent);
  const headerValidation = CsvValidator.validateHeaders(headers);
  if (!headerValidation.valid) {
    return jsonResponse({
      success: false,
      error: 'Invalid CSV headers',
      details: headerValidation.errors,
      hint: 'Required column: email_address',
    }, 422);
  }

  const { rows, errors: parseErrors } = CsvParser.parse(fileContent, {
    max_rows: 5000,
    skip_empty_lines: true,
    trim_values: true,
  });

  if (rows.length === 0) {
    return jsonResponse({ success: false, error: 'No data rows found in CSV' }, 422);
  }

  // ── Validate rows → get valid leads ──
  const rowValidation = CsvValidator.validateRows(rows);
  const validLeads = rowValidation.valid_leads;

  if (validLeads.length === 0) {
    return jsonResponse({
      success: false,
      error: 'No valid leads found in CSV',
      imported: 0,
      duplicates_skipped: rowValidation.duplicate_count,
      invalid_rows: rowValidation.invalid_count,
      total_rows_processed: rows.length,
      parse_errors: parseErrors.length,
      errors: rowValidation.errors,
      warnings: rowValidation.warnings,
    }, 422);
  }

  // ── Build insert payloads ──
  const campaignName: string = campaign.name;
  const leadsTable = (await getLeadsTableName(workspaceId)) as 'leads_ohio';

  const insertRows = validLeads.map(lead =>
    toLeadRow(lead, workspaceId, campaignName)
  );

  // ── Batch upsert — skip existing emails (workspace-scoped) ──
  const BATCH_SIZE = 500;
  let dbInserted = 0;
  let dbDuplicates = 0;

  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    const batch = insertRows.slice(i, i + BATCH_SIZE);

    const { error: upsertError, data: upserted } = await supabaseAdmin
      .from(leadsTable)
      .upsert(batch, {
        onConflict: 'workspace_id,email_address',
        ignoreDuplicates: true,
      })
      .select('id');

    if (upsertError) {
      console.error('[CSV Import] Upsert error:', upsertError);
      return jsonResponse({
        success: false,
        error: 'Database insert failed',
        details: upsertError.message,
        imported: dbInserted,
      }, 500);
    }

    const insertedCount = upserted?.length ?? 0;
    dbInserted += insertedCount;
    dbDuplicates += batch.length - insertedCount;
  }

  // ── Build response using CsvImporter summary ──
  const totalDuplicates = rowValidation.duplicate_count + dbDuplicates;
  const summary = CsvImporter.generateSummary({
    success: dbInserted > 0,
    imported: dbInserted,
    duplicates_skipped: totalDuplicates,
    invalid_rows: rowValidation.invalid_count,
    total_rows_processed: rows.length,
    campaign_id: campaignId,
    campaign_name: campaignName,
    errors: [...parseErrors, ...rowValidation.errors],
    warnings: rowValidation.warnings,
  });

  return jsonResponse({
    success: true,
    summary,
    campaign_id: campaignId,
    campaign_name: campaignName,
    file_name: fileName,
    imported: dbInserted,
    duplicates_skipped: totalDuplicates,
    invalid_rows: rowValidation.invalid_count,
    total_rows_processed: rows.length,
    warnings: rowValidation.warnings,
    errors: [...parseErrors, ...rowValidation.errors].slice(0, 20), // cap error list
  });
}

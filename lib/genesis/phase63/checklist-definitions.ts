/**
 * GENESIS PART VI - PHASE 63: ADMIN ONBOARDING QUEUE & TRACKING
 * Checklist Item Definitions
 */

import type { ChecklistItemDef } from './checklist-types';

export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  // Infrastructure (4 items)
  { id: 'infra_droplet_provisioned', category: 'infrastructure', label: 'Droplet provisioned', detection: 'auto', order: 1 },
  { id: 'infra_sidecar_handshake', category: 'infrastructure', label: 'Sidecar handshake complete', detection: 'auto', order: 2 },
  { id: 'infra_n8n_accessible', category: 'infrastructure', label: 'n8n accessible via sslip.io URL', detection: 'auto', order: 3 },
  { id: 'infra_ssl_certificate', category: 'infrastructure', label: 'SSL certificate active', detection: 'auto', order: 4 },
  // Workflow Import (7 items, per-campaign)
  { id: 'workflow_email_prep', category: 'workflow_import', label: 'Email Preparation workflow imported', detection: 'auto', order: 1, per_campaign: true },
  { id: 'workflow_research_report', category: 'workflow_import', label: 'Research Report workflow imported', detection: 'auto', order: 2, per_campaign: true },
  { id: 'workflow_email_1', category: 'workflow_import', label: 'Email 1 workflow imported', detection: 'auto', order: 3, per_campaign: true },
  { id: 'workflow_email_2', category: 'workflow_import', label: 'Email 2 workflow imported', detection: 'auto', order: 4, per_campaign: true },
  { id: 'workflow_email_3', category: 'workflow_import', label: 'Email 3 workflow imported', detection: 'auto', order: 5, per_campaign: true },
  { id: 'workflow_reply_tracker', category: 'workflow_import', label: 'Reply Tracker workflow imported', detection: 'auto', order: 6, per_campaign: true },
  { id: 'workflow_opt_out', category: 'workflow_import', label: 'Opt-Out workflow imported', detection: 'auto', order: 7, per_campaign: true },
  // Credentials (6 items)
  { id: 'cred_supabase', category: 'credentials', label: 'Supabase credentials created in n8n', detection: 'auto', order: 1 },
  { id: 'cred_openai', category: 'credentials', label: 'OpenAI API key configured', detection: 'auto', order: 2 },
  { id: 'cred_claude', category: 'credentials', label: 'Claude API key configured', detection: 'auto', order: 3 },
  { id: 'cred_gmail', category: 'credentials', label: 'Gmail OAuth connected', detection: 'auto', order: 4 },
  { id: 'cred_google_cse', category: 'credentials', label: 'Google CSE credentials', detection: 'auto', order: 5 },
  { id: 'cred_apify', category: 'credentials', label: 'Apify credentials', detection: 'auto', order: 6 },
  // Prompts (8 items, per-campaign, manual)
  { id: 'prompt_research_company', category: 'prompts', label: 'Research Report: Company research prompt updated', detection: 'manual', order: 1, per_campaign: true },
  { id: 'prompt_research_lead', category: 'prompts', label: 'Research Report: Lead research prompt updated', detection: 'manual', order: 2, per_campaign: true },
  { id: 'prompt_email_prep_subject', category: 'prompts', label: 'Email Prep: Subject line generation prompt updated', detection: 'manual', order: 3, per_campaign: true },
  { id: 'prompt_email_prep_body', category: 'prompts', label: 'Email Prep: Email body prompt updated', detection: 'manual', order: 4, per_campaign: true },
  { id: 'prompt_email_prep_cta', category: 'prompts', label: 'Email Prep: CTA prompt updated', detection: 'manual', order: 5, per_campaign: true },
  { id: 'prompt_email_1', category: 'prompts', label: 'Email 1: Personalization prompt updated', detection: 'manual', order: 6, per_campaign: true },
  { id: 'prompt_email_2', category: 'prompts', label: 'Email 2: Follow-up prompt updated', detection: 'manual', order: 7, per_campaign: true },
  { id: 'prompt_email_3', category: 'prompts', label: 'Email 3: Final follow-up prompt updated', detection: 'manual', order: 8, per_campaign: true },
  // Schedules (5 items, per-campaign)
  { id: 'schedule_email_prep', category: 'schedules', label: 'Email Prep schedule set', detection: 'auto', order: 1, per_campaign: true },
  { id: 'schedule_research_report', category: 'schedules', label: 'Research Report schedule set', detection: 'auto', order: 2, per_campaign: true },
  { id: 'schedule_email_1', category: 'schedules', label: 'Email 1 schedule set', detection: 'auto', order: 3, per_campaign: true },
  { id: 'schedule_email_2', category: 'schedules', label: 'Email 2 schedule set', detection: 'auto', order: 4, per_campaign: true },
  { id: 'schedule_email_3', category: 'schedules', label: 'Email 3 schedule set', detection: 'auto', order: 5, per_campaign: true },
  // Leads (4 items)
  { id: 'leads_csv_received', category: 'leads', label: 'Lead CSV received from client', detection: 'manual', order: 1 },
  { id: 'leads_csv_uploaded', category: 'leads', label: 'Lead CSV uploaded to dashboard', detection: 'auto', order: 2 },
  { id: 'leads_visible_in_db', category: 'leads', label: 'Leads visible in genesis.leads table', detection: 'auto', order: 3 },
  { id: 'leads_count_matches', category: 'leads', label: 'Lead count matches expected', detection: 'manual', order: 4 },
  // Testing (7 items, manual)
  { id: 'test_lead_added', category: 'testing', label: 'Test lead added', detection: 'manual', order: 1 },
  { id: 'test_research_executed', category: 'testing', label: 'Research Report executed successfully', detection: 'manual', order: 2 },
  { id: 'test_email_prep_executed', category: 'testing', label: 'Email Prep executed successfully', detection: 'manual', order: 3 },
  { id: 'test_email_1_sent', category: 'testing', label: 'Email 1 sent to test lead', detection: 'manual', order: 4 },
  { id: 'test_email_received', category: 'testing', label: 'Email received and looks correct', detection: 'manual', order: 5 },
  { id: 'test_reply_tracking', category: 'testing', label: 'Reply tracking verified', detection: 'manual', order: 6 },
  { id: 'test_opt_out_link', category: 'testing', label: 'Opt-out link verified', detection: 'manual', order: 7 },
  // Activation (3 items)
  { id: 'activation_workflows_active', category: 'activation', label: 'All workflows activated', detection: 'auto', order: 1 },
  { id: 'activation_client_notified', category: 'activation', label: 'Client notified in dashboard', detection: 'auto', order: 2 },
  { id: 'activation_first_run_confirmed', category: 'activation', label: 'First scheduled run confirmed', detection: 'auto', order: 3 },
];

export function getItemsByCategory(category: string): ChecklistItemDef[] {
  return CHECKLIST_ITEMS.filter(item => item.category === category);
}

export function getItemsByDetection(method: 'auto' | 'manual'): ChecklistItemDef[] {
  return CHECKLIST_ITEMS.filter(item => item.detection === method);
}

export function getPerCampaignItems(): ChecklistItemDef[] {
  return CHECKLIST_ITEMS.filter(item => item.per_campaign === true);
}

export function getTotalItemCount(): number {
  return CHECKLIST_ITEMS.length;
}

export function getItemById(id: string): ChecklistItemDef | undefined {
  return CHECKLIST_ITEMS.find(item => item.id === id);
}

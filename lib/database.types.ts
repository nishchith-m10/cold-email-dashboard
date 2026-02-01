export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ask_api_keys: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          provider: string;
          key_ciphertext: string;
          created_at: string;
          updated_at: string;
        }
        Insert: Omit<Database['public']['Tables']['ask_api_keys']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['ask_api_keys']['Insert']>
      }
      campaigns: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          n8n_workflow_id: string | null;
          n8n_status: string | null;
          last_sync_at: string | null;
          version: number | null;
          provision_id: string | null;
          template_id: string | null;
          webhook_url: string | null;
        }
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
      }
      daily_stats: {
        Row: {
          id: string;
          workspace_id: string | null;
          campaign_name: string | null;
          day: string;
          sends: number | null;
          replies: number | null;
          opt_outs: number | null;
          bounces: number | null;
        }
        Insert: Omit<Database['public']['Tables']['daily_stats']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['daily_stats']['Insert']>
      }
      email_events: {
        Row: {
          id: string;
          workspace_id: string | null;
          contact_id: string | null;
          contact_email: string;
          campaign_name: string | null;
          step: number | null;
          event_type: string;
          event_ts: string;
          provider: string | null;
          provider_message_id: string | null;
          metadata: Json | null;
          event_key: string | null;
          created_at: string | null;
          idempotency_key: string | null;
          n8n_execution_id: string | null;
          email_number: number | null;
        }
        Insert: Omit<Database['public']['Tables']['email_events']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['email_events']['Insert']>
      }
      governance_audit_log: {
        Row: {
          id: string;
          workspace_id: string | null;
          workspace_name: string | null;
          actor_id: string;
          actor_email: string | null;
          action: string;
          reason: string | null;
          metadata: Json | null;
          created_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['governance_audit_log']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['governance_audit_log']['Insert']>
      }
      leads_ohio: {
        Row: {
          first_name: string | null;
          last_name: string | null;
          email_address: string | null;
          linkedin_url: string | null;
          state: string | null;
          industry: string | null;
          position: string | null;
          city: string | null;
          country: string | null;
          full_name: string | null;
          organization_city: string | null;
          organization_country: string | null;
          organization_description: string | null;
          founded_year: number | null;
          organization_linkedin_url: string | null;
          organization_name: string | null;
          organization_size: string | null;
          organization_specialities: string | null;
          organization_state: string | null;
          organization_website: string | null;
          analyze: boolean | null;
          research_report: string | null;
          email_1_subject: string | null;
          email_1_body: string | null;
          email_2_body: string | null;
          email_3_subject: string | null;
          email_3_body: string | null;
          sender_email: string | null;
          email_1_sent: boolean | null;
          email_2_sent: boolean | null;
          email_3_sent: boolean | null;
          replied: boolean | null;
          opted_out: boolean | null;
          message_id: string | null;
          token: number | null;
          email_prep: boolean | null;
          report_sent: boolean | null;
          created_at: string | null;
          email_norm: string | null;
          updated_at: string | null;
          id: number;
          workspace_id: string | null;
        }
        Insert: Omit<Database['public']['Tables']['leads_ohio']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['leads_ohio']['Insert']>
      }
      llm_usage: {
        Row: {
          id: string;
          workspace_id: string | null;
          campaign_name: string | null;
          contact_email: string | null;
          provider: string;
          model: string;
          tokens_in: number | null;
          tokens_out: number | null;
          cost_usd: number | null;
          purpose: string | null;
          metadata: Json | null;
          created_at: string | null;
          idempotency_key: string | null;
          n8n_execution_id: string | null;
        }
        Insert: Omit<Database['public']['Tables']['llm_usage']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['llm_usage']['Insert']>
      }
      notifications: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string | null;
          type: string;
          title: string;
          message: string;
          related_email_event_id: string | null;
          related_campaign: string | null;
          read_at: string | null;
          dismissed_at: string | null;
          payload: Json | null;
          created_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      provisioning_status: {
        Row: {
          id: string;
          provision_id: string;
          campaign_id: string;
          step: string;
          status: string;
          error: string | null;
          created_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['provisioning_status']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['provisioning_status']['Insert']>
      }
      research_logs: {
        Row: {
          id: string;
          workspace_id: string;
          contact_email: string;
          campaign_name: string | null;
          search_query: string | null;
          raw_results: Json | null;
          summary: string | null;
          quality_score: number | null;
          sources_count: number | null;
          email_event_id: string | null;
          lead_id: number | null;
          workflow_run_id: string | null;
          created_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['research_logs']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['research_logs']['Insert']>
      }
      role_audit_log: {
        Row: {
          id: string;
          workspace_id: string;
          changed_by: string;
          target_user: string;
          old_role: string;
          new_role: string;
          created_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['role_audit_log']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['role_audit_log']['Insert']>
      }
      safe_workspace_data: {
        Row: {
          id: string | null;
          name: string | null;
          slug: string | null;
          plan: string | null;
          settings: Json | null;
          created_at: string | null;
          updated_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['safe_workspace_data']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['safe_workspace_data']['Insert']>
      }
      sync_status: {
        Row: {
          id: string;
          workspace_id: string;
          workflow_id: string;
          status: string;
          last_heartbeat: string;
          version: number;
          error_message: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        }
        Insert: Omit<Database['public']['Tables']['sync_status']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['sync_status']['Insert']>
      }
      user_workspaces: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          role: string;
          created_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['user_workspaces']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['user_workspaces']['Insert']>
      }
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      webhook_failures: {
        Row: {
          id: string | null;
          idempotency_key: string | null;
          event_type: string | null;
          event_source: string | null;
          error_message: string | null;
          retry_count: number | null;
          received_at: string | null;
          processed_at: string | null;
          raw_payload: Json | null;
        }
        Insert: Omit<Database['public']['Tables']['webhook_failures']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['webhook_failures']['Insert']>
      }
      webhook_queue: {
        Row: {
          id: string;
          idempotency_key: string;
          event_source: string;
          event_type: string;
          raw_payload: Json;
          status: string;
          processed_at: string | null;
          error_message: string | null;
          retry_count: number | null;
          received_at: string | null;
          created_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['webhook_queue']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['webhook_queue']['Insert']>
      }
      webhook_queue_health: {
        Row: {
          status: string | null;
          count: number | null;
          oldest_event: string | null;
          newest_event: string | null;
          avg_processing_seconds: number | null;
        }
        Insert: Omit<Database['public']['Tables']['webhook_queue_health']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['webhook_queue_health']['Insert']>
      }
      workflow_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          n8n_template_id: string;
          category: string | null;
          icon: string | null;
          is_active: boolean | null;
          created_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['workflow_templates']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['workflow_templates']['Insert']>
      }
      workspace_config: {
        Row: {
          id: string;
          workspace_id: string;
          config_key: string;
          config_value: string;
          value_type: string;
          description: string | null;
          is_sensitive: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['workspace_config']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['workspace_config']['Insert']>
      }
      workspace_invites: {
        Row: {
          id: string;
          workspace_id: string;
          code: string;
          created_by: string;
          role: string;
          uses_remaining: number | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        }
        Insert: Omit<Database['public']['Tables']['workspace_invites']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['workspace_invites']['Insert']>
      }
      workspace_keys: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          provider: string;
          key_ciphertext: string;
          key_fingerprint: string;
          encryption_version: number;
          created_at: string;
          updated_at: string;
          rotated_at: string | null;
        }
        Insert: Omit<Database['public']['Tables']['workspace_keys']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['workspace_keys']['Insert']>
      }
      workspace_keys_audit: {
        Row: {
          id: string;
          workspace_key_id: string | null;
          workspace_id: string;
          actor_id: string;
          action: string;
          provider: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json | null;
          created_at: string;
        }
        Insert: Omit<Database['public']['Tables']['workspace_keys_audit']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['workspace_keys_audit']['Insert']>
      }
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json | null;
          created_at: string | null;
          updated_at: string | null;
          plan: string | null;
          email: string | null;
          settings_version: number | null;
          status: string | null;
          frozen_at: string | null;
          frozen_by: string | null;
          freeze_reason: string | null;
        }
        Insert: Omit<Database['public']['Tables']['workspaces']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>
      }
    }
    Functions: {
      app_clerk_user_id: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_halfvec: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_halfvec: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_halfvec: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_halfvec: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_sparsevec: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_sparsevec: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_sparsevec: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_sparsevec: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_vector: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_vector: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_vector: {
        Args: Record<string, never>;
        Returns: any;
      }
      array_to_vector: {
        Args: Record<string, never>;
        Returns: any;
      }
      avg: {
        Args: Record<string, never>;
        Returns: any;
      }
      avg: {
        Args: Record<string, never>;
        Returns: any;
      }
      binary_quantize: {
        Args: Record<string, never>;
        Returns: any;
      }
      binary_quantize: {
        Args: Record<string, never>;
        Returns: any;
      }
      bump_daily_stats: {
        Args: Record<string, never>;
        Returns: any;
      }
      clerk_user_id: {
        Args: Record<string, never>;
        Returns: any;
      }
      cosine_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      cosine_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      cosine_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      generate_invite_code: {
        Args: Record<string, never>;
        Returns: any;
      }
      get_user_workspace_role: {
        Args: Record<string, never>;
        Returns: any;
      }
      get_user_workspaces: {
        Args: Record<string, never>;
        Returns: any;
      }
      get_view_freshness: {
        Args: Record<string, never>;
        Returns: any;
      }
      gin_extract_query_trgm: {
        Args: Record<string, never>;
        Returns: any;
      }
      gin_extract_value_trgm: {
        Args: Record<string, never>;
        Returns: any;
      }
      gin_trgm_consistent: {
        Args: Record<string, never>;
        Returns: any;
      }
      gin_trgm_triconsistent: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_compress: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_consistent: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_decompress: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_in: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_options: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_out: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_penalty: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_picksplit: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_same: {
        Args: Record<string, never>;
        Returns: any;
      }
      gtrgm_union: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_accum: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_add: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_avg: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_cmp: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_combine: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_concat: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_eq: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_ge: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_gt: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_in: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_l2_squared_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_le: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_lt: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_mul: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_ne: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_negative_inner_product: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_out: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_recv: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_send: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_spherical_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_sub: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_to_float4: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_to_sparsevec: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_to_vector: {
        Args: Record<string, never>;
        Returns: any;
      }
      halfvec_typmod_in: {
        Args: Record<string, never>;
        Returns: any;
      }
      hamming_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      hnsw_bit_support: {
        Args: Record<string, never>;
        Returns: any;
      }
      hnsw_halfvec_support: {
        Args: Record<string, never>;
        Returns: any;
      }
      hnsw_sparsevec_support: {
        Args: Record<string, never>;
        Returns: any;
      }
      hnswhandler: {
        Args: Record<string, never>;
        Returns: any;
      }
      inner_product: {
        Args: Record<string, never>;
        Returns: any;
      }
      inner_product: {
        Args: Record<string, never>;
        Returns: any;
      }
      inner_product: {
        Args: Record<string, never>;
        Returns: any;
      }
      ivfflat_bit_support: {
        Args: Record<string, never>;
        Returns: any;
      }
      ivfflat_halfvec_support: {
        Args: Record<string, never>;
        Returns: any;
      }
      ivfflathandler: {
        Args: Record<string, never>;
        Returns: any;
      }
      jaccard_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      l1_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      l1_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      l1_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      l2_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      l2_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      l2_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      l2_norm: {
        Args: Record<string, never>;
        Returns: any;
      }
      l2_norm: {
        Args: Record<string, never>;
        Returns: any;
      }
      l2_normalize: {
        Args: Record<string, never>;
        Returns: any;
      }
      l2_normalize: {
        Args: Record<string, never>;
        Returns: any;
      }
      l2_normalize: {
        Args: Record<string, never>;
        Returns: any;
      }
      log_vault_access: {
        Args: Record<string, never>;
        Returns: any;
      }
      notify_on_opt_out: {
        Args: Record<string, never>;
        Returns: any;
      }
      notify_on_reply: {
        Args: Record<string, never>;
        Returns: any;
      }
      process_webhook_queue: {
        Args: Record<string, never>;
        Returns: any;
      }
      refresh_dashboard_views: {
        Args: Record<string, never>;
        Returns: any;
      }
      seed_workspace_config: {
        Args: Record<string, never>;
        Returns: any;
      }
      set_limit: {
        Args: Record<string, never>;
        Returns: any;
      }
      set_updated_at: {
        Args: Record<string, never>;
        Returns: any;
      }
      show_limit: {
        Args: Record<string, never>;
        Returns: any;
      }
      show_trgm: {
        Args: Record<string, never>;
        Returns: any;
      }
      similarity: {
        Args: Record<string, never>;
        Returns: any;
      }
      similarity_dist: {
        Args: Record<string, never>;
        Returns: any;
      }
      similarity_op: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_cmp: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_eq: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_ge: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_gt: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_in: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_l2_squared_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_le: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_lt: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_ne: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_negative_inner_product: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_out: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_recv: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_send: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_to_halfvec: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_to_vector: {
        Args: Record<string, never>;
        Returns: any;
      }
      sparsevec_typmod_in: {
        Args: Record<string, never>;
        Returns: any;
      }
      strict_word_similarity: {
        Args: Record<string, never>;
        Returns: any;
      }
      strict_word_similarity_commutator_op: {
        Args: Record<string, never>;
        Returns: any;
      }
      strict_word_similarity_dist_commutator_op: {
        Args: Record<string, never>;
        Returns: any;
      }
      strict_word_similarity_dist_op: {
        Args: Record<string, never>;
        Returns: any;
      }
      strict_word_similarity_op: {
        Args: Record<string, never>;
        Returns: any;
      }
      subvector: {
        Args: Record<string, never>;
        Returns: any;
      }
      subvector: {
        Args: Record<string, never>;
        Returns: any;
      }
      sum: {
        Args: Record<string, never>;
        Returns: any;
      }
      sum: {
        Args: Record<string, never>;
        Returns: any;
      }
      touch_updated_at: {
        Args: Record<string, never>;
        Returns: any;
      }
      update_sync_status_timestamp: {
        Args: Record<string, never>;
        Returns: any;
      }
      update_updated_at_column: {
        Args: Record<string, never>;
        Returns: any;
      }
      update_workspace_config_timestamp: {
        Args: Record<string, never>;
        Returns: any;
      }
      user_has_workspace_access: {
        Args: Record<string, never>;
        Returns: any;
      }
      validate_owner_transfer: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_accum: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_add: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_avg: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_cmp: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_combine: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_concat: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_dims: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_dims: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_eq: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_ge: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_gt: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_in: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_l2_squared_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_le: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_lt: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_mul: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_ne: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_negative_inner_product: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_norm: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_out: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_recv: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_send: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_spherical_distance: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_sub: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_to_float4: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_to_halfvec: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_to_sparsevec: {
        Args: Record<string, never>;
        Returns: any;
      }
      vector_typmod_in: {
        Args: Record<string, never>;
        Returns: any;
      }
      word_similarity: {
        Args: Record<string, never>;
        Returns: any;
      }
      word_similarity_commutator_op: {
        Args: Record<string, never>;
        Returns: any;
      }
      word_similarity_dist_commutator_op: {
        Args: Record<string, never>;
        Returns: any;
      }
      word_similarity_dist_op: {
        Args: Record<string, never>;
        Returns: any;
      }
      word_similarity_op: {
        Args: Record<string, never>;
        Returns: any;
      }
    }
    Views: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  genesis: {
    Tables: {
      account_pool_health: {
        Row: {
          account_id: string | null;
          region: string | null;
          status: string | null;
          current_droplets: number | null;
          max_droplets: number | null;
          utilization_pct: number | null;
          available_capacity: number | null;
          last_provisioned_at: string | null;
          billing_email: string | null;
          notes: string | null;
        }
        Insert: Omit<Database['genesis']['Tables']['account_pool_health']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['account_pool_health']['Insert']>
      }
      do_accounts: {
        Row: {
          account_id: string;
          api_token_encrypted: string;
          region: string;
          max_droplets: number;
          current_droplets: number;
          status: string;
          created_at: string;
          last_provisioned_at: string | null;
          billing_email: string | null;
          support_ticket_id: string | null;
          notes: string | null;
        }
        Insert: Omit<Database['genesis']['Tables']['do_accounts']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['do_accounts']['Insert']>
      }
      droplet_lifecycle_log: {
        Row: {
          id: string;
          droplet_id: number;
          workspace_id: string;
          from_state: string | null;
          to_state: string;
          transition_reason: string | null;
          triggered_by: string | null;
          metadata: Json | null;
          created_at: string;
        }
        Insert: Omit<Database['genesis']['Tables']['droplet_lifecycle_log']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['droplet_lifecycle_log']['Insert']>
      }
      fleet_health_summary: {
        Row: {
          status: string | null;
          count: number | null;
          healthy_count: number | null;
          oldest: string | null;
          newest: string | null;
        }
        Insert: Omit<Database['genesis']['Tables']['fleet_health_summary']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['fleet_health_summary']['Insert']>
      }
      fleet_status: {
        Row: {
          droplet_id: number;
          workspace_id: string;
          account_id: string;
          region: string;
          size_slug: string;
          ip_address: string | null;
          status: string;
          last_heartbeat_at: string | null;
          created_at: string;
          initialized_at: string | null;
          handshake_at: string | null;
          activated_at: string | null;
          terminated_at: string | null;
          sslip_domain: string | null;
          custom_domain: string | null;
          provisioning_token: string | null;
          n8n_encryption_key: string | null;
          postgres_password: string | null;
          docker_compose_version: string | null;
          n8n_version: string | null;
          failed_heartbeats: number | null;
          last_error: string | null;
        }
        Insert: Omit<Database['genesis']['Tables']['fleet_status']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['fleet_status']['Insert']>
      }
      jwt_keypairs: {
        Row: {
          id: string;
          key_id: string;
          algorithm: string;
          public_key: string;
          private_key_encrypted: string;
          created_at: string;
          activated_at: string | null;
          rotated_at: string | null;
          status: string;
          jwt_issued_count: number;
          last_used_at: string | null;
          metadata: Json | null;
        }
        Insert: Omit<Database['genesis']['Tables']['jwt_keypairs']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['jwt_keypairs']['Insert']>
      }
      leads: {
        Row: {
          id: string;
          workspace_id: string;
          email_address: string;
          linkedin_url: string | null;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          organization_name: string | null;
          job_title: string | null;
          position: string | null;
          phone: string | null;
          company_phone_number: string | null;
          location: string | null;
          industry: string | null;
          company_size: string | null;
          website_url: string | null;
          organization_website: string | null;
          status: string | null;
          campaign_name: string | null;
          email_1_subject: string | null;
          email_1_body: string | null;
          email_2_body: string | null;
          email_3_subject: string | null;
          email_3_body: string | null;
          email_1_sent: boolean | null;
          email_2_sent: boolean | null;
          email_3_sent: boolean | null;
          email_1_sent_at: string | null;
          email_2_sent_at: string | null;
          email_3_sent_at: string | null;
          replied: boolean | null;
          opted_out: boolean | null;
          analyze: boolean | null;
          email_prep: boolean | null;
          report_sent: boolean | null;
          message_id: string | null;
          research_data: Json | null;
          relevance_ai_output: Json | null;
          created_at: string | null;
          updated_at: string | null;
        }
        Insert: Omit<Database['genesis']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['leads']['Insert']>
      }
      leads_default: {
        Row: {
          id: string;
          workspace_id: string;
          email_address: string;
          linkedin_url: string | null;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          organization_name: string | null;
          job_title: string | null;
          position: string | null;
          phone: string | null;
          company_phone_number: string | null;
          location: string | null;
          industry: string | null;
          company_size: string | null;
          website_url: string | null;
          organization_website: string | null;
          status: string | null;
          campaign_name: string | null;
          email_1_subject: string | null;
          email_1_body: string | null;
          email_2_body: string | null;
          email_3_subject: string | null;
          email_3_body: string | null;
          email_1_sent: boolean | null;
          email_2_sent: boolean | null;
          email_3_sent: boolean | null;
          email_1_sent_at: string | null;
          email_2_sent_at: string | null;
          email_3_sent_at: string | null;
          replied: boolean | null;
          opted_out: boolean | null;
          analyze: boolean | null;
          email_prep: boolean | null;
          report_sent: boolean | null;
          message_id: string | null;
          research_data: Json | null;
          relevance_ai_output: Json | null;
          created_at: string | null;
          updated_at: string | null;
        }
        Insert: Omit<Database['genesis']['Tables']['leads_default']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['leads_default']['Insert']>
      }
      partition_registry: {
        Row: {
          workspace_id: string;
          partition_name: string;
          status: string | null;
          row_count: number | null;
          size_bytes: number | null;
          created_at: string | null;
          updated_at: string | null;
          workspace_slug: string | null;
          notes: string | null;
        }
        Insert: Omit<Database['genesis']['Tables']['partition_registry']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['partition_registry']['Insert']>
      }
      sidecar_commands: {
        Row: {
          id: string;
          jti: string;
          workspace_id: string;
          droplet_id: string;
          action: string;
          payload: Json | null;
          jwt_hash: string;
          jwt_issued_at: string;
          jwt_expires_at: string;
          status: string;
          created_at: string;
          processed_at: string | null;
          result: Json | null;
          error: string | null;
          execution_time_ms: number | null;
          retry_count: number;
          max_retries: number;
          created_by: string | null;
          metadata: Json | null;
        }
        Insert: Omit<Database['genesis']['Tables']['sidecar_commands']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['sidecar_commands']['Insert']>
      }
      sidecar_health: {
        Row: {
          id: string;
          workspace_id: string;
          droplet_id: string;
          reported_at: string;
          n8n_status: string;
          n8n_version: string | null;
          container_status: string | null;
          container_health: string | null;
          cpu_percent: number | null;
          memory_usage_mb: number | null;
          memory_limit_mb: number | null;
          disk_usage_percent: number | null;
          executions_running: number | null;
          executions_waiting: number | null;
          uptime_seconds: number | null;
          network_rx_mb: number | null;
          network_tx_mb: number | null;
          metadata: Json | null;
        }
        Insert: Omit<Database['genesis']['Tables']['sidecar_health']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['sidecar_health']['Insert']>
      }
      sidecar_metrics: {
        Row: {
          id: string;
          workspace_id: string;
          droplet_id: string;
          collected_at: string;
          window_start: string;
          window_end: string;
          executions_total: number;
          executions_success: number;
          executions_failed: number;
          executions_canceled: number;
          avg_duration_ms: number | null;
          min_duration_ms: number | null;
          max_duration_ms: number | null;
          p50_duration_ms: number | null;
          p95_duration_ms: number | null;
          p99_duration_ms: number | null;
          top_workflows: Json | null;
          top_errors: Json | null;
          metadata: Json | null;
        }
        Insert: Omit<Database['genesis']['Tables']['sidecar_metrics']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['sidecar_metrics']['Insert']>
      }
      sidecar_tokens: {
        Row: {
          id: string;
          workspace_id: string;
          droplet_id: string;
          token_hash: string;
          token_prefix: string;
          issued_at: string;
          expires_at: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          revoke_reason: string | null;
          last_used_at: string | null;
          use_count: number;
          metadata: Json | null;
        }
        Insert: Omit<Database['genesis']['Tables']['sidecar_tokens']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: Partial<Database['genesis']['Tables']['sidecar_tokens']['Insert']>
      }
    }
    Functions: {
      cleanup_expired_commands: {
        Args: Record<string, never>;
        Returns: any;
      }
      cleanup_old_health_reports: {
        Args: Record<string, never>;
        Returns: any;
      }
      decrement_droplet_count: {
        Args: Record<string, never>;
        Returns: any;
      }
      decrypt_do_token: {
        Args: Record<string, never>;
        Returns: any;
      }
      detect_zombie_droplets: {
        Args: Record<string, never>;
        Returns: any;
      }
      encrypt_do_token: {
        Args: Record<string, never>;
        Returns: any;
      }
      fn_drop_workspace_partition: {
        Args: Record<string, never>;
        Returns: any;
      }
      fn_ignite_workspace_partition: {
        Args: Record<string, never>;
        Returns: any;
      }
      get_fleet_health_summary: {
        Args: Record<string, never>;
        Returns: any;
      }
      get_latest_droplet_health: {
        Args: Record<string, never>;
        Returns: any;
      }
      get_workspace_context: {
        Args: Record<string, never>;
        Returns: any;
      }
      increment_droplet_count: {
        Args: Record<string, never>;
        Returns: any;
      }
      record_heartbeat: {
        Args: Record<string, never>;
        Returns: any;
      }
      sanitize_partition_slug: {
        Args: Record<string, never>;
        Returns: any;
      }
      select_account_for_provisioning: {
        Args: Record<string, never>;
        Returns: any;
      }
      set_workspace_context: {
        Args: Record<string, never>;
        Returns: any;
      }
      transition_droplet_state: {
        Args: Record<string, never>;
        Returns: any;
      }
      update_all_partition_stats: {
        Args: Record<string, never>;
        Returns: any;
      }
      update_partition_stats: {
        Args: Record<string, never>;
        Returns: any;
      }
      update_timestamp: {
        Args: Record<string, never>;
        Returns: any;
      }
      verify_rls_active: {
        Args: Record<string, never>;
        Returns: any;
      }
    }
    Views: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

-- ============================================
-- Knowledge Base Schema (pgvector)
-- Migration: 20260101_create_knowledge_base.sql
-- ============================================
CREATE SCHEMA IF NOT EXISTS extensions;
SET search_path = public,
    extensions;
-- Enable pgvector extension
DROP EXTENSION IF EXISTS vector;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
-- Create dedicated schema for knowledge base
CREATE SCHEMA IF NOT EXISTS kb_schema;
-- ============================================
-- MAIN VECTORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kb_schema.kb_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Content
    content TEXT NOT NULL,
    embedding vector(1536),
    -- OpenAI ada-002 dimension
    -- Source tracking
    source_path TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (
        source_type IN ('code', 'schema', 'markdown', 'pdf', 'json')
    ),
    chunk_index INTEGER DEFAULT 0,
    -- Trust hierarchy (L1-L4)
    trust_level TEXT NOT NULL CHECK (trust_level IN ('high', 'medium', 'low')) DEFAULT 'low',
    trust_weight DECIMAL(3, 2) NOT NULL DEFAULT 0.5,
    deprecated BOOLEAN NOT NULL DEFAULT false,
    -- Safety metadata
    contains_redacted BOOLEAN DEFAULT false,
    redaction_count INTEGER DEFAULT 0,
    -- Ingestion tracking
    ingestion_batch TEXT,
    source_modified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Conflict detection hints
    topics TEXT [],
    technology_refs TEXT []
);
-- ============================================
-- INDEXES
-- ============================================
-- Standard indexes
CREATE INDEX IF NOT EXISTS kb_vectors_workspace_idx ON kb_schema.kb_vectors(workspace_id);
CREATE INDEX IF NOT EXISTS kb_vectors_deprecated_idx ON kb_schema.kb_vectors(deprecated);
CREATE INDEX IF NOT EXISTS kb_vectors_trust_idx ON kb_schema.kb_vectors(trust_level);
CREATE INDEX IF NOT EXISTS kb_vectors_source_path_idx ON kb_schema.kb_vectors(source_path);
-- IVFFlat index for vector similarity search
-- Note: Requires at least some data to be present before creating
-- Run this after initial data load:
-- CREATE INDEX kb_vectors_embedding_idx ON kb_schema.kb_vectors 
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kb_schema.kb_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (
        action IN (
            'rejected',
            'redacted',
            'ingested',
            'deleted',
            'queried'
        )
    ),
    file_path TEXT,
    reason TEXT,
    -- Security tracking
    secrets_found JSONB,
    -- { type, severity, preview }[]
    -- Query tracking (for 'queried' action)
    query_text TEXT,
    results_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kb_audit_log_workspace_idx ON kb_schema.kb_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS kb_audit_log_action_idx ON kb_schema.kb_audit_log(action);
CREATE INDEX IF NOT EXISTS kb_audit_log_created_idx ON kb_schema.kb_audit_log(created_at);
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Enable RLS on vectors table
ALTER TABLE kb_schema.kb_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY kb_vectors_workspace_isolation ON kb_schema.kb_vectors USING (
    workspace_id = (current_setting('app.workspace_id', true))::uuid
    OR current_setting('app.workspace_id', true) IS NULL
) WITH CHECK (
    workspace_id = (current_setting('app.workspace_id', true))::uuid
    OR current_setting('app.workspace_id', true) IS NULL
);
-- Enable RLS on audit log
ALTER TABLE kb_schema.kb_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY kb_audit_log_workspace_isolation ON kb_schema.kb_audit_log USING (
    workspace_id = (current_setting('app.workspace_id', true))::uuid
    OR current_setting('app.workspace_id', true) IS NULL
);
-- ============================================
-- SEARCH FUNCTION WITH TRUST WEIGHTING
-- ============================================
CREATE OR REPLACE FUNCTION kb_schema.search_knowledge(
        p_workspace_id UUID,
        p_query_embedding vector(1536),
        p_limit INTEGER DEFAULT 5,
        p_include_deprecated BOOLEAN DEFAULT true,
        p_min_trust_level TEXT DEFAULT 'low'
    ) RETURNS TABLE (
        id UUID,
        content TEXT,
        source_path TEXT,
        source_type TEXT,
        trust_level TEXT,
        deprecated BOOLEAN,
        raw_score FLOAT,
        adjusted_score FLOAT,
        topics TEXT [],
        technology_refs TEXT []
    ) AS $$ BEGIN RETURN QUERY
SELECT kv.id,
    kv.content,
    kv.source_path,
    kv.source_type,
    kv.trust_level,
    kv.deprecated,
    (1 - (kv.embedding <=> p_query_embedding))::FLOAT AS raw_score,
    (
        (1 - (kv.embedding <=> p_query_embedding)) * kv.trust_weight * CASE
            WHEN kv.deprecated THEN 0.5
            ELSE 1.0
        END
    )::FLOAT AS adjusted_score,
    kv.topics,
    kv.technology_refs
FROM kb_schema.kb_vectors kv
WHERE kv.workspace_id = p_workspace_id
    AND (
        p_include_deprecated
        OR NOT kv.deprecated
    )
    AND (
        (p_min_trust_level = 'low')
        OR (
            p_min_trust_level = 'medium'
            AND kv.trust_level IN ('medium', 'high')
        )
        OR (
            p_min_trust_level = 'high'
            AND kv.trust_level = 'high'
        )
    )
ORDER BY adjusted_score DESC
LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    extensions;
-- ============================================
-- HELPER: Update timestamp trigger
-- ============================================
CREATE OR REPLACE FUNCTION kb_schema.update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER kb_vectors_updated_at BEFORE
UPDATE ON kb_schema.kb_vectors FOR EACH ROW EXECUTE FUNCTION kb_schema.update_updated_at();
-- ============================================
-- GRANT PERMISSIONS (for service role)
-- ============================================
GRANT USAGE ON SCHEMA kb_schema TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA kb_schema TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA kb_schema TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA kb_schema TO service_role;
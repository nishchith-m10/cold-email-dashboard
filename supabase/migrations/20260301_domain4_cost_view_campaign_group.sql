-- Domain 4 Task 4.3.8: Rebuild v_llm_cost_secure to include campaign_group_id
--
-- The llm_usage table already has a campaign_group_id UUID column (was always NULL).
-- Now that the ingestion API populates it, the secure view must include it
-- so the dashboard can break down costs by campaign group.

DROP VIEW IF EXISTS v_llm_cost_secure;

CREATE VIEW v_llm_cost_secure AS
SELECT
  workspace_id,
  campaign_name,
  campaign_group_id,
  provider,
  model,
  DATE(created_at) AS day,
  SUM(tokens_in)  AS tokens_in,
  SUM(tokens_out) AS tokens_out,
  SUM(cost_usd)   AS cost_usd,
  COUNT(*)         AS call_count
FROM llm_usage
GROUP BY workspace_id, campaign_name, campaign_group_id, provider, model, DATE(created_at);

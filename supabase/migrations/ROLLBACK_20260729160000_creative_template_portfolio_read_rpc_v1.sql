-- Rollback for 20260729160000_creative_template_portfolio_read_rpc_v1.sql.
-- Drops both new functions; no table/column/index was created by the forward
-- migration, so nothing else needs to be undone.
DROP FUNCTION IF EXISTS public.get_creative_template_portfolio_summary(text);
DROP FUNCTION IF EXISTS public.get_creative_template_portfolio(text);

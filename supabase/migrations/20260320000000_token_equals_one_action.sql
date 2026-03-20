-- Migration: 1 TOKEN = 1 PESQUISA = 10 RESULTADOS
-- weekly_limit and monthly_limit now represent TOKENS (actions), not raw results.
-- 1 search = 1 token consumed. 1 "Ver Mais" click = 1 token consumed.
-- Each token delivers 10 results to the user.
--
-- The full consume_search_token rewrite and handle_new_user update with
-- plan-aware reset logic are applied in: 20260320000001.
--
-- Backfill existing free users to the new 1-token lifetime quota.
-- New free users are handled automatically by handle_new_user (see 20260320000001).
UPDATE public.search_quotas
SET weekly_limit = 1, monthly_limit = 0
WHERE plan_type = 'free';

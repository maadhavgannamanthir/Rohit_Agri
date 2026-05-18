-- ============================================================================
-- Migration 005: Analytics Views
-- ============================================================================
-- Optional read-only views used by the dashboard / reports screens.
--   • v_animals_with_latest_weight — animals joined with their most recent
--                                    weight_logs row
--   • v_monthly_expenses           — expenses rolled up by user / month /
--                                    category
--
-- Depends on: 001_init.sql
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================================

CREATE OR REPLACE VIEW public.v_animals_with_latest_weight AS
SELECT
    a.*,
    wl.weight_kg AS latest_weight_kg,
    wl.log_date  AS latest_weight_date
FROM public.animals a
LEFT JOIN LATERAL (
    SELECT weight_kg, log_date
    FROM public.weight_logs
    WHERE animal_id = a.id
    ORDER BY log_date DESC
    LIMIT 1
) wl ON true;

CREATE OR REPLACE VIEW public.v_monthly_expenses AS
SELECT
    user_id,
    DATE_TRUNC('month', expense_date)::DATE AS month,
    category,
    COUNT(*)    AS expense_count,
    SUM(amount) AS total_amount
FROM public.expenses
GROUP BY user_id, DATE_TRUNC('month', expense_date), category;

-- ============================================================================
-- END Migration 005
-- ============================================================================

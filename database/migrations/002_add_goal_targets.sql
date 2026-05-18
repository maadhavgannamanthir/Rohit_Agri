-- ============================================================================
-- Migration 002: Add Goal Target Columns to animals
-- ============================================================================
-- Adds optional weight-goal tracking columns used by the AddAnimalModal /
-- EditAnimalModal in the UI:
--   • target_weight_kg  — desired finishing weight in kg
--   • target_date       — target date by which the animal should reach it
--
-- These columns are nullable. Existing rows are unaffected.
-- Safe to re-run.
-- ============================================================================

ALTER TABLE public.animals
    ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(8,2);

ALTER TABLE public.animals
    ADD COLUMN IF NOT EXISTS target_date DATE;

-- Helpful index for upcoming-goal dashboards
CREATE INDEX IF NOT EXISTS idx_animals_target_date
    ON public.animals(target_date)
    WHERE target_date IS NOT NULL;

-- ============================================================================
-- END Migration 002
-- ============================================================================

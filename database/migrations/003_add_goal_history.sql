-- ============================================================================
-- Migration 003: Goal History Table
-- ============================================================================
-- Tracks every change a user makes to an animal's target_weight_kg /
-- target_date so that the Goal History view in the UI can show an audit
-- trail of who set what, when, and why.
--
-- Depends on: 001_init.sql, 002_add_goal_targets.sql
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.goal_history (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id                   TEXT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    target_weight_kg            NUMERIC(8,2),
    target_date                 DATE,
    previous_target_weight_kg   NUMERIC(8,2),
    previous_target_date        DATE,
    set_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    set_by                      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    set_by_email                TEXT,
    set_by_name                 TEXT,
    reason                      TEXT,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goal_history_animal_id ON public.goal_history(animal_id);
CREATE INDEX IF NOT EXISTS idx_goal_history_user_id   ON public.goal_history(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_history_set_at    ON public.goal_history(set_at DESC);

-- Row Level Security
ALTER TABLE public.goal_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goal_history_select_own" ON public.goal_history;
DROP POLICY IF EXISTS "goal_history_insert_own" ON public.goal_history;
DROP POLICY IF EXISTS "goal_history_delete_own" ON public.goal_history;

CREATE POLICY "goal_history_select_own" ON public.goal_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goal_history_insert_own" ON public.goal_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goal_history_delete_own" ON public.goal_history
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- END Migration 003
-- ============================================================================

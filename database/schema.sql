-- ============================================================================
-- ROHIT AGRO FARM MANAGEMENT SYSTEM
-- Complete Database Schema for PostgreSQL / Supabase
-- ============================================================================
-- This script creates the full database structure including:
--   • Tables with constraints
--   • Indexes for query performance
--   • Row Level Security (RLS) policies
--   • Triggers for audit logging
--   • Helper functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ANIMALS (Livestock) Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.animals (
    id                  TEXT PRIMARY KEY,
    tag_id              TEXT NOT NULL,
    name                TEXT NOT NULL,
    species             TEXT NOT NULL,
    breed               TEXT,
    sex                 TEXT NOT NULL CHECK (sex IN ('Male','Female')),
    birth_date          DATE,
    acquisition_date    DATE NOT NULL,
    acquisition_cost    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (acquisition_cost >= 0),
    status              TEXT NOT NULL DEFAULT 'Active'
                          CHECK (status IN ('Active','Sold','Deceased','Transferred')),
    photo_url           TEXT,
    photos              JSONB DEFAULT '[]'::jsonb,
    health_notes        TEXT,
    vaccinated          BOOLEAN DEFAULT false,
    allocated_expenses  NUMERIC(12,2) DEFAULT 0,
    sale_price          NUMERIC(12,2),
    sale_date           DATE,
    buyer               TEXT,
    target_weight_kg    NUMERIC(8,2),
    target_date         DATE,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_animals_user_id        ON public.animals(user_id);
CREATE INDEX IF NOT EXISTS idx_animals_status         ON public.animals(status);
CREATE INDEX IF NOT EXISTS idx_animals_species        ON public.animals(species);
CREATE INDEX IF NOT EXISTS idx_animals_tag_id         ON public.animals(tag_id);
CREATE INDEX IF NOT EXISTS idx_animals_acquisition    ON public.animals(acquisition_date DESC);
CREATE INDEX IF NOT EXISTS idx_animals_created_at     ON public.animals(created_at DESC);

-- ============================================================================
-- 2. WEIGHT LOGS Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weight_logs (
    id          BIGSERIAL PRIMARY KEY,
    animal_id   TEXT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    log_date    DATE NOT NULL,
    weight_kg   NUMERIC(8,2) NOT NULL CHECK (weight_kg > 0),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_animal_id  ON public.weight_logs(animal_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id    ON public.weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date       ON public.weight_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_logs_animal_date ON public.weight_logs(animal_id, log_date DESC);

-- ============================================================================
-- 3. EXPENSES Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id            TEXT PRIMARY KEY,
    expense_date  DATE NOT NULL,
    category      TEXT NOT NULL,
    description   TEXT NOT NULL,
    amount        NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    scope         TEXT NOT NULL CHECK (scope IN ('Farm-wide','Per-Animal')),
    animal_id     TEXT REFERENCES public.animals(id) ON DELETE SET NULL,
    recurring     BOOLEAN DEFAULT false,
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id      ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_animal_id    ON public.expenses(animal_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category     ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date         ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_scope        ON public.expenses(scope);

-- ============================================================================
-- 4. PARTNERS Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.partners (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    contact     TEXT,
    investment  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (investment >= 0),
    join_date   DATE NOT NULL,
    share_pct   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (share_pct >= 0 AND share_pct <= 100),
    avatar      TEXT,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_user_id   ON public.partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_join_date ON public.partners(join_date DESC);

-- ============================================================================
-- 5. SALES Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id          BIGSERIAL PRIMARY KEY,
    animal_id   TEXT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    sale_date   DATE NOT NULL,
    sale_price  NUMERIC(12,2) NOT NULL CHECK (sale_price >= 0),
    buyer       TEXT NOT NULL,
    notes       TEXT,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_user_id   ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_animal_id ON public.sales(animal_id);
CREATE INDEX IF NOT EXISTS idx_sales_date      ON public.sales(sale_date DESC);

-- ============================================================================
-- 6. GOAL HISTORY Table (tracks target weight/date changes)
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

-- ============================================================================
-- 7. AUDIT LOGS Table (tracks all user actions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email    TEXT,
    user_name     TEXT,
    action        TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT')),
    entity_type   TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    entity_label  TEXT,
    changes       JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity      ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs(action);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE public.animals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs    ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- ANIMALS policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "animals_select_own"  ON public.animals;
DROP POLICY IF EXISTS "animals_insert_own"  ON public.animals;
DROP POLICY IF EXISTS "animals_update_own"  ON public.animals;
DROP POLICY IF EXISTS "animals_delete_own"  ON public.animals;

CREATE POLICY "animals_select_own" ON public.animals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "animals_insert_own" ON public.animals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "animals_update_own" ON public.animals
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "animals_delete_own" ON public.animals
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- WEIGHT_LOGS policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "weight_logs_select_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_insert_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_update_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_delete_own" ON public.weight_logs;

CREATE POLICY "weight_logs_select_own" ON public.weight_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_logs_insert_own" ON public.weight_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_logs_update_own" ON public.weight_logs
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_logs_delete_own" ON public.weight_logs
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- EXPENSES policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_own" ON public.expenses;

CREATE POLICY "expenses_select_own" ON public.expenses
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert_own" ON public.expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update_own" ON public.expenses
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_delete_own" ON public.expenses
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- PARTNERS policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "partners_select_own" ON public.partners;
DROP POLICY IF EXISTS "partners_insert_own" ON public.partners;
DROP POLICY IF EXISTS "partners_update_own" ON public.partners;
DROP POLICY IF EXISTS "partners_delete_own" ON public.partners;

CREATE POLICY "partners_select_own" ON public.partners
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "partners_insert_own" ON public.partners
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "partners_update_own" ON public.partners
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "partners_delete_own" ON public.partners
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- SALES policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "sales_select_own" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_own" ON public.sales;
DROP POLICY IF EXISTS "sales_update_own" ON public.sales;
DROP POLICY IF EXISTS "sales_delete_own" ON public.sales;

CREATE POLICY "sales_select_own" ON public.sales
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sales_insert_own" ON public.sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sales_update_own" ON public.sales
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sales_delete_own" ON public.sales
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- GOAL_HISTORY policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "goal_history_select_own" ON public.goal_history;
DROP POLICY IF EXISTS "goal_history_insert_own" ON public.goal_history;
DROP POLICY IF EXISTS "goal_history_delete_own" ON public.goal_history;

CREATE POLICY "goal_history_select_own" ON public.goal_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goal_history_insert_own" ON public.goal_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goal_history_delete_own" ON public.goal_history
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- AUDIT_LOGS policies (read-only history per user)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_own" ON public.audit_logs;

CREATE POLICY "audit_logs_select_own" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPFUL VIEWS (optional analytics)
-- ============================================================================

-- Active animals with latest weight
CREATE OR REPLACE VIEW public.v_animals_with_latest_weight AS
SELECT
    a.*,
    wl.weight_kg   AS latest_weight_kg,
    wl.log_date    AS latest_weight_date
FROM public.animals a
LEFT JOIN LATERAL (
    SELECT weight_kg, log_date
    FROM public.weight_logs
    WHERE animal_id = a.id
    ORDER BY log_date DESC
    LIMIT 1
) wl ON true;

-- Monthly expense summary
CREATE OR REPLACE VIEW public.v_monthly_expenses AS
SELECT
    user_id,
    DATE_TRUNC('month', expense_date)::DATE AS month,
    category,
    COUNT(*)        AS expense_count,
    SUM(amount)     AS total_amount
FROM public.expenses
GROUP BY user_id, DATE_TRUNC('month', expense_date), category;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

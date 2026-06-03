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
    wl.height_cm   AS latest_height_cm,
    wl.log_date    AS latest_weight_date
FROM public.animals a
LEFT JOIN LATERAL (
    SELECT weight_kg, height_cm, log_date
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
-- ADDITIONS FOR DAIRY ERP (006 MIGRATION)
-- ============================================================================

-- Altering animals status check
ALTER TABLE public.animals DROP CONSTRAINT IF EXISTS animals_status_check;
ALTER TABLE public.animals ADD CONSTRAINT animals_status_check CHECK (
    status IN ('Active', 'Sold', 'Deceased', 'Transferred', 'Pregnant', 'Lactating', 'Dry')
);

-- Altering weight logs
ALTER TABLE public.weight_logs ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2) DEFAULT NULL CHECK (height_cm IS NULL OR height_cm > 0);

-- Vaccinations
CREATE TABLE IF NOT EXISTS public.vaccinations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id           TEXT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    vaccination_date    DATE NOT NULL,
    vaccine_name        TEXT NOT NULL,
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Vet Visits
CREATE TABLE IF NOT EXISTS public.vet_visits (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id           TEXT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    visit_date          DATE NOT NULL,
    doctor_name         TEXT,
    diagnosis           TEXT NOT NULL,
    treatment           TEXT,
    cost                NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Milk Collections
CREATE TABLE IF NOT EXISTS public.milk_collections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id           TEXT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    collection_date     DATE NOT NULL,
    morning_qty         NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (morning_qty >= 0),
    evening_qty         NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (evening_qty >= 0),
    total_qty           NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (total_qty >= 0),
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    contact_person      TEXT,
    mobile              TEXT NOT NULL,
    alternate_mobile    TEXT,
    address             TEXT,
    city                TEXT,
    state               TEXT,
    postal_code         TEXT,
    notes               TEXT,
    active              BOOLEAN NOT NULL DEFAULT true,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Milk Deliveries
CREATE TABLE IF NOT EXISTS public.milk_deliveries (
    id                  TEXT PRIMARY KEY,
    client_id           TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    delivery_date       DATE NOT NULL,
    quantity            NUMERIC(8,2) NOT NULL CHECK (quantity > 0),
    unit_price          NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_amount        NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    notes               TEXT,
    status              TEXT NOT NULL DEFAULT 'Delivered' CHECK (status IN ('Delivered', 'Cancelled')),
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id                  TEXT PRIMARY KEY,
    invoice_number      TEXT NOT NULL,
    client_id           TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    invoice_date        DATE NOT NULL,
    due_date            DATE NOT NULL,
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_pct             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_pct >= 0),
    tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    grand_total         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
    status              TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue')),
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id          TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description         TEXT NOT NULL,
    quantity            NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    unit_rate           NUMERIC(10,2) NOT NULL CHECK (unit_rate >= 0),
    total_amount        NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id                  TEXT PRIMARY KEY,
    client_id           TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    invoice_id          TEXT REFERENCES public.invoices(id) ON DELETE SET NULL,
    payment_date        DATE NOT NULL,
    payment_method      TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other')),
    reference_number    TEXT,
    amount_received     NUMERIC(12,2) NOT NULL CHECK (amount_received > 0),
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "vaccinations_select_own" ON public.vaccinations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vaccinations_insert_own" ON public.vaccinations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vaccinations_update_own" ON public.vaccinations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vaccinations_delete_own" ON public.vaccinations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "vet_visits_select_own" ON public.vet_visits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vet_visits_insert_own" ON public.vet_visits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vet_visits_update_own" ON public.vet_visits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vet_visits_delete_own" ON public.vet_visits FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "milk_collections_select_own" ON public.milk_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "milk_collections_insert_own" ON public.milk_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milk_collections_update_own" ON public.milk_collections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milk_collections_delete_own" ON public.milk_collections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "clients_select_own" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert_own" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update_own" ON public.clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_delete_own" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "milk_deliveries_select_own" ON public.milk_deliveries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "milk_deliveries_insert_own" ON public.milk_deliveries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milk_deliveries_update_own" ON public.milk_deliveries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milk_deliveries_delete_own" ON public.milk_deliveries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "invoices_select_own" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invoices_insert_own" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_update_own" ON public.invoices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_delete_own" ON public.invoices FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "invoice_items_select_own" ON public.invoice_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = auth.uid())
);
CREATE POLICY "invoice_items_insert_own" ON public.invoice_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = auth.uid())
);
CREATE POLICY "invoice_items_update_own" ON public.invoice_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = auth.uid())
);
CREATE POLICY "invoice_items_delete_own" ON public.invoice_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = auth.uid())
);

CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_update_own" ON public.payments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_delete_own" ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal_id ON public.vaccinations(animal_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_user_id ON public.vaccinations(user_id);
CREATE INDEX IF NOT EXISTS idx_vet_visits_animal_id ON public.vet_visits(animal_id);
CREATE INDEX IF NOT EXISTS idx_vet_visits_user_id ON public.vet_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_milk_collections_animal_id ON public.milk_collections(animal_id);
CREATE INDEX IF NOT EXISTS idx_milk_collections_user_id ON public.milk_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_milk_collections_date ON public.milk_collections(collection_date DESC);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients(active);
CREATE INDEX IF NOT EXISTS idx_milk_deliveries_client_id ON public.milk_deliveries(client_id);
CREATE INDEX IF NOT EXISTS idx_milk_deliveries_user_id ON public.milk_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_milk_deliveries_date ON public.milk_deliveries(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date DESC);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

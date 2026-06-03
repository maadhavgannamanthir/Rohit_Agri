-- ============================================================================
-- 006_livestock_milking_invoicing.sql
-- Non-destructive migration extending Rohit Agro into a secure Dairy ERP
-- ============================================================================

-- 1. Extend animal statuses (Pregnant, Lactating, Dry)
ALTER TABLE public.animals DROP CONSTRAINT IF EXISTS animals_status_check;
ALTER TABLE public.animals ADD CONSTRAINT animals_status_check CHECK (
    status IN ('Active', 'Sold', 'Deceased', 'Transferred', 'Pregnant', 'Lactating', 'Dry')
);

-- 2. Add height to growth tracking
ALTER TABLE public.weight_logs ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2) DEFAULT NULL CHECK (height_cm IS NULL OR height_cm > 0);

-- 3. Create vaccinations table
CREATE TABLE IF NOT EXISTS public.vaccinations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id           TEXT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    vaccination_date    DATE NOT NULL,
    vaccine_name        TEXT NOT NULL,
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create vet visits table
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

-- 5. Create milk collections table
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

-- 6. Create clients table
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

-- 7. Create milk deliveries table
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

-- 8. Create invoices table
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

-- 9. Create invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id          TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description         TEXT NOT NULL,
    quantity            NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    unit_rate           NUMERIC(10,2) NOT NULL CHECK (unit_rate >= 0),
    total_amount        NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create payments table
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

-- 11. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS Policies

-- vaccinations
CREATE POLICY "vaccinations_select_own" ON public.vaccinations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vaccinations_insert_own" ON public.vaccinations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vaccinations_update_own" ON public.vaccinations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vaccinations_delete_own" ON public.vaccinations FOR DELETE USING (auth.uid() = user_id);

-- vet_visits
CREATE POLICY "vet_visits_select_own" ON public.vet_visits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vet_visits_insert_own" ON public.vet_visits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vet_visits_update_own" ON public.vet_visits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vet_visits_delete_own" ON public.vet_visits FOR DELETE USING (auth.uid() = user_id);

-- milk_collections
CREATE POLICY "milk_collections_select_own" ON public.milk_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "milk_collections_insert_own" ON public.milk_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milk_collections_update_own" ON public.milk_collections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milk_collections_delete_own" ON public.milk_collections FOR DELETE USING (auth.uid() = user_id);

-- clients
CREATE POLICY "clients_select_own" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert_own" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update_own" ON public.clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_delete_own" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- milk_deliveries
CREATE POLICY "milk_deliveries_select_own" ON public.milk_deliveries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "milk_deliveries_insert_own" ON public.milk_deliveries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milk_deliveries_update_own" ON public.milk_deliveries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milk_deliveries_delete_own" ON public.milk_deliveries FOR DELETE USING (auth.uid() = user_id);

-- invoices
CREATE POLICY "invoices_select_own" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invoices_insert_own" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_update_own" ON public.invoices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_delete_own" ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- invoice_items
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

-- payments
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_update_own" ON public.payments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_delete_own" ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- 13. Create Indexes

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

-- 14. Update/Recreate View with Height Support
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

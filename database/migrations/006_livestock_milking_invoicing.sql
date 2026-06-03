-- ============================================================================
-- 006_livestock_milking_invoicing.sql
-- Non-destructive migration extending Rohit Agro into a secure Dairy ERP
-- ============================================================================

-- 1. Extend animal statuses (Pregnant, Lactating, Dry) & Species Validation & Tag Uniqueness
ALTER TABLE public.animals DROP CONSTRAINT IF EXISTS animals_status_check;
ALTER TABLE public.animals ADD CONSTRAINT animals_status_check CHECK (
    status IN ('Active', 'Sold', 'Deceased', 'Transferred', 'Pregnant', 'Lactating', 'Dry')
);

ALTER TABLE public.animals DROP CONSTRAINT IF EXISTS animals_species_check;
ALTER TABLE public.animals ADD CONSTRAINT animals_species_check CHECK (
    species IN ('Cow', 'Goat', 'Sheep')
);

ALTER TABLE public.animals DROP CONSTRAINT IF EXISTS animals_tag_id_user_id_key;
ALTER TABLE public.animals ADD CONSTRAINT animals_tag_id_user_id_key UNIQUE (user_id, tag_id);

-- 2. Add height to growth tracking (Ensure weight_logs is aligned)
ALTER TABLE public.weight_logs ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2) DEFAULT NULL CHECK (height_cm IS NULL OR height_cm > 0);

-- Since we are standardizing to UUID primary keys for the system:
-- We first drop any legacy views that might reference weight_logs/animals before altering them.
DROP VIEW IF EXISTS public.v_animals_with_latest_weight;

-- If migrating an existing DB where animals.id is TEXT, we alter it to UUID. 
-- In a typical new deployment this is handled. For a migration, we cast existing columns.
-- (Normally pg requires dropping foreign key constraints before doing this, but since we are executing on a clean setup / newly set up project, we ensure it casts cleanly)
ALTER TABLE public.animals ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE public.weight_logs ALTER COLUMN animal_id TYPE UUID USING animal_id::uuid;
ALTER TABLE public.expenses ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE public.expenses ALTER COLUMN animal_id TYPE UUID USING animal_id::uuid;
ALTER TABLE public.partners ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE public.sales ALTER COLUMN animal_id TYPE UUID USING animal_id::uuid;
ALTER TABLE public.goal_history ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE public.goal_history ALTER COLUMN animal_id TYPE UUID USING animal_id::uuid;

-- Recreate view
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

-- 3. Create vaccinations table
CREATE TABLE IF NOT EXISTS public.vaccinations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id           UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    vaccination_date    DATE NOT NULL,
    vaccine_name        TEXT NOT NULL,
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create vet visits table
CREATE TABLE IF NOT EXISTS public.vet_visits (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id           UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    visit_date          DATE NOT NULL,
    doctor_name         TEXT,
    diagnosis           TEXT NOT NULL,
    treatment           TEXT,
    cost                NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create milk collections table (total_qty is a database-generated column)
CREATE TABLE IF NOT EXISTS public.milk_collections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id           UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    collection_date     DATE NOT NULL,
    morning_qty         NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (morning_qty >= 0),
    evening_qty         NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (evening_qty >= 0),
    total_qty           NUMERIC(8,2) GENERATED ALWAYS AS (morning_qty + evening_qty) STORED,
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    delivery_date       DATE NOT NULL,
    quantity            NUMERIC(8,2) NOT NULL CHECK (quantity > 0),
    unit_price          NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_amount        NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    notes               TEXT,
    status              TEXT NOT NULL DEFAULT 'Delivered' CHECK (status IN ('Delivered', 'Cancelled')),
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create invoices table (uniqueness added)
CREATE TABLE IF NOT EXISTS public.invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number      TEXT NOT NULL,
    client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    invoice_date        DATE NOT NULL,
    due_date            DATE NOT NULL,
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_pct             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_pct >= 0),
    tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    grand_total         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
    status              TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue')),
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT invoices_number_unique UNIQUE (user_id, invoice_number)
);

-- 9. Create invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id          UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description         TEXT NOT NULL,
    quantity            NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    unit_rate           NUMERIC(10,2) NOT NULL CHECK (unit_rate >= 0),
    total_amount        NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    invoice_id          UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    payment_date        DATE NOT NULL,
    payment_method      TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other')),
    reference_number    TEXT,
    amount_received     NUMERIC(12,2) NOT NULL CHECK (amount_received > 0),
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create farm settings table
CREATE TABLE IF NOT EXISTS public.farm_settings (
    user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_name           TEXT NOT NULL,
    address             TEXT,
    phone               TEXT,
    email               TEXT,
    gst_number          TEXT,
    invoice_prefix      TEXT NOT NULL DEFAULT 'INV',
    currency            TEXT NOT NULL DEFAULT 'INR',
    logo_url            TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.vaccinations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_settings  ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS Policies
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

CREATE POLICY "farm_settings_select_own" ON public.farm_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "farm_settings_insert_own" ON public.farm_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "farm_settings_update_own" ON public.farm_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 14. Create Indexes
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

-- 15. Create Dynamic SQL View for Client Balances
CREATE OR REPLACE VIEW public.v_client_balances AS
SELECT
    c.id AS client_id,
    c.user_id,
    COALESCE(d.total_delivered, 0) AS total_delivered,
    COALESCE(i.total_invoiced, 0) AS total_invoiced,
    COALESCE(p.total_paid, 0) AS total_paid,
    GREATEST(0, COALESCE(i.total_invoiced, 0) - COALESCE(p.total_paid, 0)) AS invoiced_outstanding,
    GREATEST(0, COALESCE(d.total_delivered, 0) - COALESCE(i.total_invoiced_subtotal, 0)) AS unbilled_deliveries,
    (COALESCE(d.total_delivered, 0) - COALESCE(p.total_paid, 0)) AS current_balance
FROM public.clients c
LEFT JOIN (
    SELECT client_id, SUM(total_amount) AS total_delivered
    FROM public.milk_deliveries
    WHERE status = 'Delivered'
    GROUP BY client_id
) d ON d.client_id = c.id
LEFT JOIN (
    SELECT client_id, SUM(grand_total) AS total_invoiced, SUM(subtotal) AS total_invoiced_subtotal
    FROM public.invoices
    GROUP BY client_id
) i ON i.client_id = c.id
LEFT JOIN (
    SELECT client_id, SUM(amount_received) AS total_paid
    FROM public.payments
    GROUP BY client_id
) p ON p.client_id = c.id;

-- 16. Trigger for Automated Invoice Status Update
CREATE OR REPLACE FUNCTION public.fn_update_invoice_status_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_paid NUMERIC(12,2);
    v_grand_total NUMERIC(12,2);
    v_due_date DATE;
    v_current_status TEXT;
    v_new_status TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    IF v_invoice_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT grand_total, due_date, status
    INTO v_grand_total, v_due_date, v_current_status
    FROM public.invoices
    WHERE id = v_invoice_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(amount_received), 0)
    INTO v_total_paid
    FROM public.payments
    WHERE invoice_id = v_invoice_id;

    IF v_total_paid >= v_grand_total THEN
        v_new_status := 'Paid';
    ELSIF v_total_paid > 0 THEN
        v_new_status := 'Partially Paid';
    ELSE
        IF v_due_date < CURRENT_DATE THEN
            v_new_status := 'Overdue';
        ELSE
            IF v_current_status = 'Draft' THEN
                v_new_status := 'Draft';
            ELSE
                v_new_status := 'Issued';
            END IF;
        END IF;
    END IF;

    IF v_new_status <> v_current_status THEN
        UPDATE public.invoices
        SET status = v_new_status
        WHERE id = v_invoice_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_update_invoice_status ON public.payments;
CREATE TRIGGER trg_payments_update_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.fn_update_invoice_status_on_payment();

-- ============================================================================
-- 007_chicken_and_eggs.sql
-- Extension to track Country Chicken species and in-house egg hatching cycle
-- ============================================================================

-- 1. Update animal species constraint to include Country Chicken
ALTER TABLE public.animals DROP CONSTRAINT IF EXISTS animals_species_check;
ALTER TABLE public.animals ADD CONSTRAINT animals_species_check CHECK (
    species IN ('Cow', 'Goat', 'Sheep', 'Country Chicken')
);

-- 2. Create egg_batches table to track eggs laid by chickens
CREATE TABLE IF NOT EXISTS public.egg_batches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    status              TEXT NOT NULL DEFAULT 'Incubating' CHECK (status IN ('Incubating', 'Hatched', 'Damaged')),
    hatched_count       INTEGER DEFAULT 0 CHECK (hatched_count >= 0),
    damaged_count       INTEGER DEFAULT 0 CHECK (damaged_count >= 0),
    hatch_date          DATE,
    notes               TEXT,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_counts CHECK (hatched_count + damaged_count <= quantity)
);

-- Indexes for egg_batches
CREATE INDEX IF NOT EXISTS idx_egg_batches_user_id ON public.egg_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_egg_batches_date ON public.egg_batches(collection_date DESC);

-- Enable RLS
ALTER TABLE public.egg_batches ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "egg_batches_select_own" ON public.egg_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "egg_batches_insert_own" ON public.egg_batches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "egg_batches_update_own" ON public.egg_batches FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "egg_batches_delete_own" ON public.egg_batches FOR DELETE USING (auth.uid() = user_id);

-- 3. Trigger to automatically add Hatched eggs to the animals count
CREATE OR REPLACE FUNCTION public.fn_handle_egg_hatching()
RETURNS TRIGGER AS $$
DECLARE
    v_new_chickens INTEGER := 0;
    v_i INTEGER;
    v_tag_prefix TEXT;
    v_hatch_date DATE;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- If status changed to Hatched, or hatched_count increased
        IF NEW.status = 'Hatched' THEN
            v_hatch_date := COALESCE(NEW.hatch_date, CURRENT_DATE);
            
            -- If hatched_count wasn't explicitly set, default to quantity - damaged_count
            IF NEW.hatched_count = 0 AND OLD.hatched_count = 0 THEN
                NEW.hatched_count := NEW.quantity - COALESCE(NEW.damaged_count, 0);
            END IF;
            
            v_new_chickens := NEW.hatched_count - OLD.hatched_count;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Hatched' THEN
            v_hatch_date := COALESCE(NEW.hatch_date, CURRENT_DATE);
            IF NEW.hatched_count = 0 THEN
                NEW.hatched_count := NEW.quantity - COALESCE(NEW.damaged_count, 0);
            END IF;
            v_new_chickens := NEW.hatched_count;
        END IF;
    END IF;

    IF v_new_chickens > 0 THEN
        v_tag_prefix := 'CHICK-' || TO_CHAR(v_hatch_date, 'YYMMDD') || '-';
        FOR v_i IN 1..v_new_chickens LOOP
            INSERT INTO public.animals (
                tag_id,
                name,
                species,
                breed,
                sex,
                birth_date,
                acquisition_date,
                acquisition_cost,
                status,
                user_id
            ) VALUES (
                v_tag_prefix || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4)),
                'Chic ' || TO_CHAR(v_hatch_date, 'MMDD') || '-' || v_i,
                'Country Chicken',
                'Country Chicken',
                CASE WHEN random() < 0.5 THEN 'Female'::text ELSE 'Male'::text END,
                v_hatch_date,
                v_hatch_date,
                0.00,
                'Active',
                NEW.user_id
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_egg_batches_hatching ON public.egg_batches;
CREATE TRIGGER trg_egg_batches_hatching
BEFORE INSERT OR UPDATE ON public.egg_batches
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_egg_hatching();

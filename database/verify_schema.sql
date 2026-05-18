-- ============================================================================
-- verify_schema.sql
-- ============================================================================
-- One-off diagnostic script. Run it in the Supabase SQL editor AFTER applying
-- all migrations to confirm that every column the app expects actually exists.
--
-- The first query lists every column that currently exists in the relevant
-- tables. The second query lists every column the application REQUIRES and
-- flags any that are MISSING — this is the fastest way to diagnose a
-- "Failed to add animal / 400 Bad Request" error caused by a column that
-- never got migrated.
--
-- Expected output of the "missing columns" query: 0 rows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Dump every column on every app table
-- ----------------------------------------------------------------------------
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'animals',
      'weight_logs',
      'expenses',
      'partners',
      'sales',
      'goal_history',
      'audit_logs'
  )
ORDER BY table_name, ordinal_position;

-- ----------------------------------------------------------------------------
-- 2. Find MISSING columns required by the application
-- ----------------------------------------------------------------------------
WITH required(table_name, column_name) AS (
    VALUES
        -- animals
        ('animals','id'),
        ('animals','tag_id'),
        ('animals','name'),
        ('animals','species'),
        ('animals','breed'),
        ('animals','sex'),
        ('animals','birth_date'),
        ('animals','acquisition_date'),
        ('animals','acquisition_cost'),
        ('animals','status'),
        ('animals','photo_url'),
        ('animals','photos'),
        ('animals','health_notes'),
        ('animals','vaccinated'),
        ('animals','allocated_expenses'),
        ('animals','sale_price'),
        ('animals','sale_date'),
        ('animals','buyer'),
        ('animals','target_weight_kg'),
        ('animals','target_date'),
        ('animals','user_id'),
        ('animals','created_at'),

        -- weight_logs
        ('weight_logs','id'),
        ('weight_logs','animal_id'),
        ('weight_logs','log_date'),
        ('weight_logs','weight_kg'),
        ('weight_logs','user_id'),
        ('weight_logs','created_at'),

        -- expenses
        ('expenses','id'),
        ('expenses','expense_date'),
        ('expenses','category'),
        ('expenses','description'),
        ('expenses','amount'),
        ('expenses','scope'),
        ('expenses','animal_id'),
        ('expenses','recurring'),
        ('expenses','user_id'),
        ('expenses','created_at'),

        -- partners
        ('partners','id'),
        ('partners','name'),
        ('partners','contact'),
        ('partners','investment'),
        ('partners','join_date'),
        ('partners','share_pct'),
        ('partners','avatar'),
        ('partners','user_id'),
        ('partners','created_at'),

        -- sales
        ('sales','id'),
        ('sales','animal_id'),
        ('sales','sale_date'),
        ('sales','sale_price'),
        ('sales','buyer'),
        ('sales','notes'),
        ('sales','user_id'),
        ('sales','created_at'),

        -- goal_history
        ('goal_history','id'),
        ('goal_history','animal_id'),
        ('goal_history','target_weight_kg'),
        ('goal_history','target_date'),
        ('goal_history','previous_target_weight_kg'),
        ('goal_history','previous_target_date'),
        ('goal_history','set_at'),
        ('goal_history','set_by'),
        ('goal_history','set_by_email'),
        ('goal_history','set_by_name'),
        ('goal_history','reason'),
        ('goal_history','user_id'),

        -- audit_logs
        ('audit_logs','id'),
        ('audit_logs','user_id'),
        ('audit_logs','user_email'),
        ('audit_logs','user_name'),
        ('audit_logs','action'),
        ('audit_logs','entity_type'),
        ('audit_logs','entity_id'),
        ('audit_logs','entity_label'),
        ('audit_logs','changes'),
        ('audit_logs','created_at')
)
SELECT
    r.table_name,
    r.column_name,
    'MISSING' AS status
FROM required r
LEFT JOIN information_schema.columns c
       ON c.table_schema = 'public'
      AND c.table_name   = r.table_name
      AND c.column_name  = r.column_name
WHERE c.column_name IS NULL
ORDER BY r.table_name, r.column_name;

-- ----------------------------------------------------------------------------
-- 3. Confirm RLS is enabled on every app table
-- ----------------------------------------------------------------------------
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'animals','weight_logs','expenses','partners',
      'sales','goal_history','audit_logs'
  )
ORDER BY tablename;

-- ============================================================================
-- END verify_schema.sql
-- ============================================================================

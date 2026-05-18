# Database Migrations — Rohit Agro Farm Management

This folder contains the SQL needed to set up and maintain the Postgres / Supabase database used by the application.

```
database/
├── schema.sql                # Full, consolidated schema (reference snapshot)
├── verify_schema.sql         # Diagnostic — confirms every expected column exists
├── README.md                 # ← you are here
└── migrations/
    ├── 001_init.sql              # Core tables + RLS
    ├── 002_add_goal_targets.sql  # animals.target_weight_kg, animals.target_date
    ├── 003_add_goal_history.sql  # goal_history table
    ├── 004_add_audit_logs.sql    # audit_logs table
    └── 005_add_views.sql         # Analytics views
```

> **Important:** `schema.sql` is a *snapshot* of the final state. For a new database you can either run `schema.sql` once **or** run every file in `migrations/` in numeric order. For an existing database you should only apply the migrations newer than what you have already run.

---

## Why migrations?

The app evolves over time. Columns like `animals.target_weight_kg` and `animals.target_date` were added after the initial release. If a live database was created from an older `schema.sql` and the new columns were never added, inserts from the UI will fail with `400 Bad Request` from PostgREST because the request body contains columns that don't exist.

Splitting the schema into incremental files makes it explicit which changes need to be applied and lets you fix a "drifted" database without dropping data.

---

## Applying migrations (Supabase SQL editor)

1. Open the Supabase dashboard → **SQL Editor** → **New query**.
2. Open the migration file in your editor, **copy the entire contents**, and paste it into the SQL editor.
3. Click **Run**. Each migration is idempotent — `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc. — so re-running a migration is safe.
4. Repeat for the next migration **in numeric order**. Do not skip files.

### Order (must be applied top-to-bottom)

| # | File | What it does |
|---|------|--------------|
| 1 | `migrations/001_init.sql` | Creates `animals`, `weight_logs`, `expenses`, `partners`, `sales`, indexes, and RLS policies. |
| 2 | `migrations/002_add_goal_targets.sql` | Adds `target_weight_kg` and `target_date` columns to `animals`. **Required for the "Add Animal" modal to succeed.** |
| 3 | `migrations/003_add_goal_history.sql` | Creates `goal_history` table + RLS (used by the Goal History view). |
| 4 | `migrations/004_add_audit_logs.sql` | Creates `audit_logs` table + RLS (used by Reports / activity timeline). |
| 5 | `migrations/005_add_views.sql` | Creates `v_animals_with_latest_weight` and `v_monthly_expenses` views. |

### Applying via the Supabase CLI (alternative)

If you prefer the CLI:

```bash
# from the project root
supabase db execute --file database/migrations/001_init.sql
supabase db execute --file database/migrations/002_add_goal_targets.sql
supabase db execute --file database/migrations/003_add_goal_history.sql
supabase db execute --file database/migrations/004_add_audit_logs.sql
supabase db execute --file database/migrations/005_add_views.sql
```

Or with `psql`:

```bash
psql "$DATABASE_URL" -f database/migrations/001_init.sql
psql "$DATABASE_URL" -f database/migrations/002_add_goal_targets.sql
# ...etc
```

---

## Verifying the schema

After running all migrations, paste the contents of **`database/verify_schema.sql`** into the SQL editor and run it. The script produces three result sets:

1. **All columns** on every app table — eyeball check.
2. **Missing columns** — every column the application requires that is *not* present. **This result set should be empty.** Any row here is the smoking gun for a `400` from PostgREST.
3. **RLS enabled** — confirms `rowsecurity = true` for all seven tables.

If the missing-columns query returns rows like:

```
animals | target_weight_kg | MISSING
animals | target_date      | MISSING
```

…then you have not yet applied `002_add_goal_targets.sql`. Apply it and re-run `verify_schema.sql`.

---

## Adding a new migration

When you change the schema, create a new file `migrations/00N_short_description.sql`:

* Use `IF NOT EXISTS` / `IF EXISTS` everywhere so the file is idempotent.
* Note its dependencies in a top comment.
* Update the table in this README.
* Update `schema.sql` so the consolidated reference stays accurate.
* Add any new columns/tables to `verify_schema.sql`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `POST /rest/v1/animals … 400 (Bad Request)` when saving a new animal | `target_weight_kg` / `target_date` columns missing | Run `002_add_goal_targets.sql`, then `verify_schema.sql` |
| `permission denied for table animals` | RLS enabled but user not authenticated, or `user_id` not equal to `auth.uid()` | Make sure the client is logged in and sets `user_id` to the current user's id |
| `relation "public.goal_history" does not exist` | `003_add_goal_history.sql` not applied | Run migration 003 |
| `relation "public.audit_logs" does not exist` | `004_add_audit_logs.sql` not applied | Run migration 004 |

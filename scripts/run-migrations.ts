/**
 * Database migration runner.
 *
 * Reads every `*.sql` file in `database/migrations/`, sorts them by their
 * numeric prefix (001_, 002_, ...), and applies any that have not yet been
 * recorded in the `schema_migrations` tracking table.
 *
 * For each migration the script stores:
 *   - id         (filename, e.g. "001_init.sql")
 *   - checksum   (sha256 of the file contents at the time it was applied)
 *   - applied_at (timestamptz, defaulted server-side)
 *
 * USAGE
 *   # .env must contain:
 *   #   SUPABASE_URL=https://xxxxx.supabase.co       (or DATABASE_URL / POSTGRES_URL)
 *   #   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...      (NEVER ship this to the browser)
 *   #
 *   # Optional:
 *   #   DATABASE_URL=postgres://...                  (direct connection — preferred)
 *
 *   npm run db:migrate                  # apply all pending migrations
 *   npm run db:migrate -- --dry-run     # show what WOULD run, don't execute
 *   npm run db:migrate -- --force <id>  # re-apply a specific migration even if recorded
 *
 * EXIT CODES
 *   0  success / nothing to do
 *   1  configuration error (missing env, missing folder)
 *   2  a migration failed to execute
 *   3  checksum mismatch on a previously-applied migration
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

// ---------------------------------------------------------------------------
// .env loading (no external dep — keeps the script zero-install-friendly)
// ---------------------------------------------------------------------------

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

loadDotEnv(resolve(projectRoot, '.env'));
loadDotEnv(resolve(projectRoot, '.env.local'));

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE_INDEX = args.indexOf('--force');
const FORCE_ID =
  FORCE_INDEX !== -1 && args[FORCE_INDEX + 1] ? args[FORCE_INDEX + 1] : null;

// ---------------------------------------------------------------------------
// Connection string resolution
// ---------------------------------------------------------------------------

/**
 * Build a Postgres connection string from the environment.
 *
 * Priority:
 *   1. DATABASE_URL  (or POSTGRES_URL)         — direct connection, preferred
 *   2. SUPABASE_DB_URL                         — Supabase-specific direct URL
 *   3. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *      → derives  postgres://postgres:<service-role>@db.<ref>.supabase.co:5432/postgres
 *      (works for projects on the standard Supabase hostname pattern)
 */
function resolveConnectionString(): string {
  const direct =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL;
  if (direct) return direct;

  const url = process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    console.error(
      '[migrate] ERROR: missing database credentials.\n' +
        '         Set either:\n' +
        '           DATABASE_URL=postgres://...\n' +
        '         or:\n' +
        '           SUPABASE_URL=https://<ref>.supabase.co\n' +
        '           SUPABASE_SERVICE_ROLE_KEY=eyJ...\n' +
        '         in your .env file.'
    );
    process.exit(1);
  }

  // Extract project ref from https://<ref>.supabase.co
  const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  if (!match) {
    console.error(
      `[migrate] ERROR: could not parse SUPABASE_URL ("${url}"). ` +
        'Provide DATABASE_URL directly instead.'
    );
    process.exit(1);
  }
  const ref = match[1];
  const encodedKey = encodeURIComponent(serviceKey);
  return `postgres://postgres:${encodedKey}@db.${ref}.supabase.co:5432/postgres`;
}

// ---------------------------------------------------------------------------
// Migration discovery
// ---------------------------------------------------------------------------

interface Migration {
  id: string;          // filename, e.g. "002_add_goal_targets.sql"
  order: number;       // numeric prefix, e.g. 2
  path: string;        // absolute path on disk
  sql: string;         // file contents
  checksum: string;    // sha256 hex of sql
}

function discoverMigrations(): Migration[] {
  const dir = resolve(projectRoot, 'database', 'migrations');
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(`[migrate] ERROR: migrations folder not found at ${dir}`);
    process.exit(1);
  }

  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.sql'));

  const migrations: Migration[] = files.map((file) => {
    const prefixMatch = file.match(/^(\d+)/);
    if (!prefixMatch) {
      console.error(
        `[migrate] ERROR: migration file "${file}" must start with a numeric prefix ` +
          '(e.g. 001_init.sql).'
      );
      process.exit(1);
    }
    const order = parseInt(prefixMatch[1], 10);
    const path = join(dir, file);
    const sql = readFileSync(path, 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    return { id: file, order, path, sql, checksum };
  });

  migrations.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });

  return migrations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const connectionString = resolveConnectionString();
  const migrations = discoverMigrations();

  if (migrations.length === 0) {
    console.log('[migrate] No migration files found. Nothing to do.');
    return;
  }

  console.log(`[migrate] Discovered ${migrations.length} migration file(s):`);
  for (const m of migrations) {
    console.log(`           - ${m.id}  (sha256: ${m.checksum.slice(0, 12)}…)`);
  }

  // Connect with SSL relaxed (Supabase / hosted PG typically require TLS but
  // present a chain that node-pg can't always verify out of the box).
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('[migrate] Connected to database.');

  try {
    // 1. Ensure the tracking table exists.
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        id          text        PRIMARY KEY,
        checksum    text        NOT NULL,
        applied_at  timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 2. Load already-applied migrations.
    const { rows: applied } = await client.query<{
      id: string;
      checksum: string;
      applied_at: Date;
    }>(`SELECT id, checksum, applied_at FROM public.schema_migrations`);
    const appliedById = new Map(applied.map((r) => [r.id, r]));

    // 3. Detect drift (file changed after being applied).
    let driftDetected = false;
    for (const m of migrations) {
      const prev = appliedById.get(m.id);
      if (!prev) continue;
      if (prev.checksum !== m.checksum && FORCE_ID !== m.id) {
        console.error(
          `[migrate] CHECKSUM MISMATCH for ${m.id}\n` +
            `           recorded: ${prev.checksum}\n` +
            `           on disk:  ${m.checksum}\n` +
            `           The file was edited after being applied. Create a NEW migration ` +
            `with the change, or re-apply with: npm run db:migrate -- --force ${m.id}`
        );
        driftDetected = true;
      }
    }
    if (driftDetected) {
      process.exitCode = 3;
      return;
    }

    // 4. Apply pending migrations in order.
    const pending = migrations.filter(
      (m) => !appliedById.has(m.id) || m.id === FORCE_ID
    );

    if (pending.length === 0) {
      console.log('[migrate] Database is up to date. Nothing to apply.');
      return;
    }

    console.log(
      `[migrate] ${pending.length} migration(s) to apply${DRY_RUN ? ' (DRY RUN)' : ''}:`
    );

    for (const m of pending) {
      const isForcedReapply = appliedById.has(m.id) && m.id === FORCE_ID;
      const label = isForcedReapply ? 'RE-APPLY' : 'APPLY';
      console.log(`[migrate]   ${label}  ${m.id}`);

      if (DRY_RUN) continue;

      // Each migration runs in its own transaction. If it fails, nothing
      // from that file is partially committed, and the tracking row is
      // never written.
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query(
          `INSERT INTO public.schema_migrations (id, checksum, applied_at)
           VALUES ($1, $2, now())
           ON CONFLICT (id) DO UPDATE
             SET checksum = EXCLUDED.checksum,
                 applied_at = now()`,
          [m.id, m.checksum]
        );
        await client.query('COMMIT');
        console.log(`[migrate]            ✓ ${m.id} applied`);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        const e = err as { message?: string; detail?: string; hint?: string; position?: string };
        console.error(`[migrate]            ✗ ${m.id} FAILED`);
        if (e.message) console.error(`             message:  ${e.message}`);
        if (e.detail)  console.error(`             detail:   ${e.detail}`);
        if (e.hint)    console.error(`             hint:     ${e.hint}`);
        if (e.position) console.error(`             position: ${e.position}`);
        process.exitCode = 2;
        return;
      }
    }

    console.log('[migrate] Done.');
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error('[migrate] Unexpected error:', err);
  process.exit(2);
});

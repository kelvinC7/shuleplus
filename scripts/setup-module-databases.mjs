#!/usr/bin/env node
/**
 * Create PostgreSQL databases for every ShulePlus module and apply Prisma schema.
 *
 * Usage (from ShulePlus/):
 *   node scripts/setup-module-databases.mjs
 *   node scripts/setup-module-databases.mjs --only=Academic
 *   node scripts/setup-module-databases.mjs --skip-migrate
 *
 * Requires: Docker container `shuleplus-iam-db` (Authentication docker compose postgres)
 *           or local psql with postgres:postgres@localhost:5432
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');

const EXTRA_BACKENDS = ['Authentication/Notification-Service'];

const args = process.argv.slice(2);
const onlyFilter = args.find((a) => a.startsWith('--only='))?.split('=')[1]?.toLowerCase();
const skipMigrate = args.includes('--skip-migrate');

function discoverBackends() {
  const backends = [];
  for (const name of fs.readdirSync(REPO_ROOT)) {
    const full = path.join(REPO_ROOT, name);
    if (!fs.statSync(full).isDirectory()) continue;
    const backendDir = path.join(full, 'Backend');
    if (fs.existsSync(path.join(backendDir, 'prisma', 'schema.prisma'))) {
      backends.push({ label: name, dir: backendDir });
    }
  }
  for (const rel of EXTRA_BACKENDS) {
    const dir = path.join(REPO_ROOT, rel);
    if (fs.existsSync(path.join(dir, 'prisma', 'schema.prisma'))) {
      backends.push({ label: rel.replace('/', ' · '), dir });
    }
  }
  return backends.sort((a, b) => a.label.localeCompare(b.label));
}

function ensureEnvFile(backendDir) {
  const envPath = path.join(backendDir, '.env');
  const examplePath = path.join(backendDir, '.env.example');
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log(`  Copied .env.example → .env`);
  }
}

function readDatabaseUrl(backendDir) {
  for (const envFile of ['.env', '.env.local', '.env.example']) {
    const p = path.join(backendDir, envFile);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    const match = content.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

function parsePostgresDbName(url) {
  if (!url || url.startsWith('file:')) return null;
  try {
    const normalized = url.replace(/^postgresql:\/\//, 'http://');
    const u = new URL(normalized);
    return u.pathname.replace(/^\//, '').split('?')[0] || null;
  } catch {
    return null;
  }
}

function hasMigrations(backendDir) {
  const migDir = path.join(backendDir, 'prisma', 'migrations');
  if (!fs.existsSync(migDir)) return false;
  return fs
    .readdirSync(migDir)
    .some(
      (f) =>
        f !== 'migration_lock.toml' &&
        fs.statSync(path.join(migDir, f)).isDirectory()
    );
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env, shell: true });
}

function prismaBin(backendDir) {
  const win = path.join(backendDir, 'node_modules', '.bin', 'prisma.cmd');
  const unix = path.join(backendDir, 'node_modules', '.bin', 'prisma');
  if (fs.existsSync(unix)) return `"${unix}"`;
  if (fs.existsSync(win)) return `"${win}"`;
  return null;
}

function ensureDependencies(backendDir) {
  if (fs.existsSync(path.join(backendDir, 'node_modules', 'prisma'))) return;
  if (!fs.existsSync(path.join(backendDir, 'package.json'))) return;
  console.log('  npm install (missing prisma)…');
  run('npm install', backendDir);
}

function runPrisma(subcommand, backendDir) {
  ensureDependencies(backendDir);
  const bin = prismaBin(backendDir);
  if (!bin) throw new Error('prisma CLI not found — run npm install in this backend');
  run(`${bin} ${subcommand}`, backendDir);
}

function createPostgresDatabase(dbName) {
  const quoted = dbName.replace(/"/g, '""');
  const checkSql = `SELECT 1 FROM pg_database WHERE datname = '${dbName.replace(/'/g, "''")}'`;

  try {
    const out = execSync(`docker exec shuleplus-iam-db psql -U postgres -tAc "${checkSql}"`, {
      encoding: 'utf8',
    }).trim();
    if (out === '1') {
      console.log(`  ✓ database exists: ${dbName}`);
      return;
    }
    run(`docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE \\"${quoted}\\""`, REPO_ROOT);
    console.log(`  + created database: ${dbName}`);
    return;
  } catch {
    console.log('  (docker exec failed — trying local psql…)'); 
  }

  try {
    const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'postgres' };
    const out = execSync(`psql -U postgres -h localhost -tAc "${checkSql}"`, { encoding: 'utf8', env });
    if (out.trim() === '1') {
      console.log(`  ✓ database exists: ${dbName}`);
      return;
    }
    run(`psql -U postgres -h localhost -c "CREATE DATABASE \\"${quoted}\\""`, REPO_ROOT);
    console.log(`  + created database: ${dbName}`);
  } catch (err) {
    throw new Error(`Could not create database "${dbName}". Start Postgres (docker compose up -d) and retry.`);
  }
}

function applyInitSqlFile() {
  const sqlPath = path.join(__dirname, 'init-module-databases.sql');
  if (!fs.existsSync(sqlPath)) return;
  try {
    run(`docker exec -i shuleplus-iam-db psql -U postgres -f - < "${sqlPath}"`, REPO_ROOT);
    console.log('Applied init-module-databases.sql via Docker.');
  } catch {
    try {
      const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'postgres' };
      execSync(`psql -U postgres -h localhost -f "${sqlPath}"`, { stdio: 'inherit', env, shell: true });
      console.log('Applied init-module-databases.sql via local psql.');
    } catch {
      console.warn('Could not apply init-module-databases.sql — continuing with per-db create.');
    }
  }
}

const backends = discoverBackends().filter(
  (b) => !onlyFilter || b.label.toLowerCase().includes(onlyFilter)
);

if (backends.length === 0) {
  console.error(`No backends matched --only=${onlyFilter}`);
  process.exit(1);
}

console.log(`\nShulePlus — setup ${backends.length} module database(s)\n`);

applyInitSqlFile();

const dbNames = new Set();
for (const backend of backends) {
  ensureEnvFile(backend.dir);
  const url = readDatabaseUrl(backend.dir);
  const dbName = parsePostgresDbName(url);
  if (dbName) dbNames.add(dbName);
}

console.log('\nCreating PostgreSQL databases…');
for (const dbName of [...dbNames].sort()) {
  createPostgresDatabase(dbName);
}

const schemaAppliedForUrl = new Set();
let ok = 0;
let failed = 0;

for (const backend of backends) {
  console.log(`\n── ${backend.label} ──`);
  ensureEnvFile(backend.dir);

  const url = readDatabaseUrl(backend.dir);
  if (!url) {
    console.warn('  ⚠ no DATABASE_URL — skipped');
    failed += 1;
    continue;
  }

  if (url.startsWith('file:')) {
    console.log('  SQLite — prisma db push');
    if (!skipMigrate) {
      try {
        runPrisma('db push --skip-generate', backend.dir);
      } catch {
        failed += 1;
        continue;
      }
    }
    try {
      runPrisma('generate', backend.dir);
      ok += 1;
    } catch {
      failed += 1;
    }
    continue;
  }

  const schemaKey = url.split('?')[0];
  const shouldApplySchema = !schemaAppliedForUrl.has(schemaKey);

  try {
    runPrisma('generate', backend.dir);

    if (!skipMigrate && shouldApplySchema) {
      if (hasMigrations(backend.dir)) {
        console.log('  prisma migrate deploy');
        runPrisma('migrate deploy', backend.dir);
      } else {
        console.log('  prisma db push (no migrations folder)');
        runPrisma('db push --skip-generate', backend.dir);
      }
      schemaAppliedForUrl.add(schemaKey);
    } else if (!skipMigrate) {
      console.log(`  skipped schema apply (already applied for ${schemaKey})`);
    }

    ok += 1;
  } catch (err) {
    console.error(`  ✗ failed: ${err.message ?? err}`);
    failed += 1;
  }
}

console.log(`\nDone: ${ok} ok, ${failed} failed.\n`);
process.exit(failed > 0 ? 1 : 0);

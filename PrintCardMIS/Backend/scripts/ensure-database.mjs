#!/usr/bin/env node
/**
 * Creates print_card_module_db if missing. Run before migrate/dev on Windows without psql in PATH.
 * Usage: node scripts/ensure-database.mjs
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const parsed = new URL(url.replace(/^postgresql:\/\//, 'http://'));
const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
const adminUrl = `postgresql://${parsed.username}:${parsed.password}@${parsed.hostname}:${parsed.port || 5432}/postgres`;

const client = new pg.Client({ connectionString: adminUrl });

try {
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`Created database: ${dbName}`);
  } else {
    console.log(`Database already exists: ${dbName}`);
  }
} catch (err) {
  console.error(
    'Could not connect to PostgreSQL. Start Docker: cd Authentication && docker compose up -d',
  );
  console.error(err.message ?? err);
  process.exit(1);
} finally {
  await client.end();
}

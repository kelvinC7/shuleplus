#!/usr/bin/env node
/**
 * Drops and recreates print_card_module_db (dev only).
 * Usage: node scripts/reset-database.mjs
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const parsed = new URL(url.replace(/^postgresql:\/\//, 'http://'));
const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
const adminUrl = `postgresql://${parsed.username}:${parsed.password}@${parsed.hostname}:${parsed.port || 5432}/postgres`;

const client = new pg.Client({ connectionString: adminUrl });

try {
  await client.connect();
  await client.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [dbName]
  );
  await client.query(`DROP DATABASE IF EXISTS "${dbName.replace(/"/g, '""')}"`);
  await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  console.log(`Reset database: ${dbName}`);
} catch (err) {
  console.error(err.message ?? err);
  process.exit(1);
} finally {
  await client.end();
}

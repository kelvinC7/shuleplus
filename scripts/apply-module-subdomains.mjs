#!/usr/bin/env node
/**
 * Apply shuleplus.rw subdomain URLs to IAM Module Catalog (platform_modules).
 *
 * Convention:
 *   Marketing     https://shuleplus.rw
 *   IAM app       https://app.shuleplus.rw
 *   IAM API       https://api.shuleplus.rw
 *   Module UI     https://{subdomain}.shuleplus.rw
 *   Module API    https://{subdomain}-api.shuleplus.rw
 *
 * Usage (from ShulePlus/):
 *   node scripts/apply-module-subdomains.mjs
 *   node scripts/apply-module-subdomains.mjs --dry-run
 *   node scripts/apply-module-subdomains.mjs --domain=staging.shuleplus.rw
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'config', 'subdomains.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const domainArg = args.find((a) => a.startsWith('--domain='));
const baseDomain = domainArg ? domainArg.split('=')[1] : null;

function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (baseDomain) raw.baseDomain = baseDomain;
  return raw;
}

function host(label, domain) {
  return label ? `https://${label}.${domain}` : `https://${domain}`;
}

function moduleFrontendUrl(subdomain, domain) {
  return host(subdomain, domain);
}

function moduleBackendUrl(subdomain, domain) {
  return host(`${subdomain}-api`, domain);
}

function printSummary(config) {
  const { baseDomain: domain, platform, modules } = config;
  console.log('\nShulePlus subdomain map\n');
  console.log(`  Marketing   ${host(platform.marketing, domain)}`);
  console.log(`  IAM app     ${host(platform.app, domain)}`);
  console.log(`  IAM API     ${host(platform.api, domain)}`);
  console.log(`  Notify API  ${host(platform.notificationsApi, domain)}`);
  console.log('\n  Modules:\n');
  for (const mod of modules) {
    console.log(
      `  ${mod.slug.padEnd(22)} ${moduleFrontendUrl(mod.subdomain, domain).padEnd(36)} → ${moduleBackendUrl(mod.subdomain, domain)}`
    );
  }
  console.log('');
}

async function applyToDatabase(config) {
  if (dryRun) {
    console.log('Dry run — skipping database updates.');
    return;
  }

  const authBackend = path.join(REPO_ROOT, 'Authentication', 'Backend');
  const sanitizeDatabaseUrl = (raw) => {
    if (!raw) return '';
    let v = String(raw).trim();
    for (let i = 0; i < 4; i++) {
      const next = v
        .replace(/^\\?["'`“”‘’]+/, '')
        .replace(/["'`“”‘’]+\\?$/, '')
        .trim();
      if (next === v) break;
      v = next;
    }
    return v;
  };
  const envPath = path.join(authBackend, '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const line = raw.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
    if (line) {
      const v = sanitizeDatabaseUrl(line.replace(/^\s*DATABASE_URL\s*=\s*/, ''));
      if (v.startsWith('postgres')) process.env.DATABASE_URL = v;
    }
  }
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  }
  if (!process.env.DATABASE_URL?.startsWith('postgres')) {
    console.warn('DATABASE_URL missing/invalid — skipping database update.');
    console.warn(
      'Got:',
      process.env.DATABASE_URL ? `${process.env.DATABASE_URL.slice(0, 24)}…` : '(empty)'
    );
    return;
  }

  const prismaClientPath = path.join(authBackend, 'node_modules', '@prisma', 'client');
  if (!fs.existsSync(prismaClientPath)) {
    console.warn('Authentication/Backend Prisma client not found — run npm install there first.');
    console.warn('Skipping database update (URLs printed above only).');
    return;
  }

  const { createRequire } = await import('node:module');
  const require = createRequire(path.join(authBackend, 'package.json'));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const { baseDomain: domain, modules } = config;

  try {
    for (const mod of modules) {
      const frontendUrl = moduleFrontendUrl(mod.subdomain, domain);
      const backendUrl = moduleBackendUrl(mod.subdomain, domain);
      const payload = {
        name: mod.name,
        shortName: mod.shortName,
        category: mod.category,
        frontendUrl,
        backendUrl,
        healthCheckUrl: mod.healthCheckUrl ?? '/api/health',
        isEnabled: mod.enabled === false ? false : true,
        visibleInMarketplace: mod.enabled === false || mod.aliasOf ? false : true,
        maintenanceMode: false,
      };

      await prisma.platformModule.upsert({
        where: { slug: mod.slug },
        update: payload,
        create: {
          slug: mod.slug,
          version: '1.0.0',
          description: mod.name,
          isCore: mod.slug === 'academic',
          isPremium: false,
          ...payload,
        },
      });
      console.log(`✓ ${mod.slug}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

function writeNginxSnippet(config) {
  const outPath = path.join(REPO_ROOT, 'config', 'nginx-subdomains.generated.conf');
  const { baseDomain: domain, platform, modules } = config;
  const lines = [
    '# Auto-generated — review before production deploy.',
    '# TLS: wildcard cert for *.' + domain,
    '',
    `# IAM marketing → Authentication Frontend`,
    `server {`,
    `  server_name ${domain} www.${domain};`,
    `  # proxy_pass http://127.0.0.1:3000;`,
    `}`,
    '',
    `# IAM app (login, admin)`,
    `server {`,
    `  server_name ${platform.app}.${domain};`,
    `  # proxy_pass http://127.0.0.1:3000;`,
    `}`,
    '',
    `# IAM API`,
    `server {`,
    `  server_name ${platform.api}.${domain};`,
    `  # proxy_pass http://127.0.0.1:3001;`,
    `}`,
    '',
  ];

  for (const mod of modules) {
    lines.push(
      `# ${mod.name} (${mod.slug})`,
      `server {`,
      `  server_name ${mod.subdomain}.${domain};`,
      `  # proxy_pass → module frontend`,
      `}`,
      `server {`,
      `  server_name ${mod.subdomain}-api.${domain};`,
      `  # proxy_pass → module backend`,
      `}`,
      ''
    );
  }

  if (!dryRun) {
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log(`Wrote ${outPath}`);
  }
}

const config = loadConfig();
printSummary(config);
writeNginxSnippet(config);
await applyToDatabase(config);

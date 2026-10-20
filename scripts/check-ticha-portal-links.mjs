#!/usr/bin/env node
/**
 * Verify TichaPortal BFF is up and linked modules respond.
 * Usage:
 *   node scripts/check-ticha-portal-links.mjs
 *   node scripts/check-ticha-portal-links.mjs http://localhost:4000
 *   TICHA_API_URL=https://ticha-api.shuleplus.rw node scripts/check-ticha-portal-links.mjs
 */
const base = (process.argv[2] || process.env.TICHA_API_URL || 'http://localhost:4000').replace(/\/$/, '');

const LOCAL_CHECKS = [
  { name: 'IAM', url: 'http://localhost:3001/api/v1/health' },
  { name: 'Timetable', url: 'http://localhost:3010/api/health' },
  { name: 'Academic', url: 'http://localhost:3003/api/health' },
  { name: 'Student Management', url: 'http://localhost:3052/api/health' },
  { name: 'Attendance', url: 'http://localhost:3024/health' },
  { name: 'HR', url: 'http://localhost:3005/api/health' },
  { name: 'Payroll', url: 'http://localhost:3026/api/health' },
  { name: 'Student Discipline', url: 'http://localhost:3032/api/health' },
  { name: 'Babyeyi', url: 'http://localhost:3012/api/health' },
  { name: 'KaziAvance', url: 'http://localhost:4400/health' },
];

async function probe(label, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const ok = res.ok;
    return { label, url, ok, status: res.status };
  } catch (err) {
    return { label, url, ok: false, status: 0, error: err.message || 'unreachable' };
  }
}

console.log(`TichaPortal link check — BFF ${base}\n`);

const bff = await probe('TichaPortal BFF', `${base}/api/health`);
let upstreams = {};
if (bff.ok) {
  try {
    const body = await fetch(`${base}/api/health`).then((r) => r.json());
    upstreams = body.upstreams || {};
    console.log('Configured upstreams from BFF:');
    for (const [k, v] of Object.entries(upstreams)) {
      console.log(`  ${k.padEnd(18)} ${v}`);
    }
    console.log('');
  } catch {
    /* ignore */
  }
}

console.log('PORT   STATUS      SERVICE');
console.log('-----  ----------  -------------------');
const bffLine = `${bff.ok ? 'ok' : bff.error || bff.status}`.padEnd(10);
console.log(`${base.includes('4000') ? '4000' : 'BFF '}  ${bffLine}  TichaPortal BFF`);

for (const row of LOCAL_CHECKS) {
  const r = await probe(row.name, row.url);
  const port = row.url.match(/:(\d+)/)?.[1] ?? '?';
  const status = r.ok ? 'LISTENING' : r.error || `HTTP ${r.status}`;
  console.log(`${port.padEnd(5)}  ${status.padEnd(10)}  ${row.name}`);
}

if (!bff.ok) {
  console.log('\nStart TichaPortal: bash scripts/run-ticha-portal.sh');
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Check whether students missing from the app exist on LIST 2027 / 2026-2027 class lists.
 *
 * Usage (NTENDEZI example — run on server where SchoolData lives):
 *   node scripts/check-not-found-in-list-2027.mjs \
 *     --school "ST MATTHEWS NTENDEZI" \
 *     --photo-ids 2663,2652,2547,2548,2579,2595,2606,2609,2610,2623,2624,2625,2626,2627,2628,2629
 *
 * Or compare all photo_id rows not in app (needs login):
 *   export IAM_API_URL=http://127.0.0.1:4001/api/v1
 *   export STUDENT_API_URL=http://127.0.0.1:4024/api
 *   node scripts/check-not-found-in-list-2027.mjs \
 *     --school "ST MATTHEWS NTENDEZI" \
 *     --from-app --email ... --password ...
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCHOOL_DATA_DIR = path.join(REPO_ROOT, 'docs', 'SchoolData');
const require = createRequire(import.meta.url);

const SKIP_SHEETS = new Set(['Summary', 'By Class Summary', 'README', 'Overview']);
const SKIP_FILE_RE = /classes with photo_id|staff|upload photo_id|upload manifest|photo status|photo upload audit|by class with photo id|students with photo id|\.zip$/i;
const LIST_FILE_RE = /2026|2027|class list|^N[123]\.xlsx$|^P[1-6]\.xlsx$/i;

function loadXlsx() {
  const candidates = [
    path.join(REPO_ROOT, 'StudentManagement', 'Backend', 'node_modules', 'xlsx'),
    'xlsx',
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next
    }
  }
  throw new Error('xlsx package not found');
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function normalizeName(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function nameMatchScore(sourceName, listName) {
  const source = normalizeName(sourceName);
  const target = normalizeName(listName);
  if (!source || !target) return 0;
  if (source === target) return 100;

  const variants = new Set([source]);
  const parts = source.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    variants.add(`${parts.slice(1).join(' ')} ${parts[0]}`);
    variants.add(`${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`);
  }
  for (const variant of variants) {
    if (variant === target) return 95;
    if (variant.includes(target) || target.includes(variant)) return 85;
    const sourceTokens = new Set(variant.split(' '));
    const targetTokens = target.split(' ').filter(Boolean);
    if (targetTokens.length) {
      const overlap = targetTokens.filter((t) => sourceTokens.has(t)).length / targetTokens.length;
      const score = Math.round(overlap * 80);
      if (score > 0) return score;
    }
  }
  return 0;
}

function extractName(values) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const text = value.trim();
    const upper = text.toUpperCase();
    if (!text || upper.includes('CLASS LIST') || ['NO', 'NAMES', "LEARNERS' NAMES", 'PHOTO_ID', 'GENDER'].includes(upper)) {
      continue;
    }
    if (text.replace('.', '').match(/^\d+$/)) continue;
    return text;
  }
  return null;
}

function readListRowsFromWorkbook(XLSX, workbookPath) {
  const wb = XLSX.readFile(workbookPath);
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEETS.has(sheetName) || sheetName.includes('No Photo')) continue;
    const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
    for (const line of matrix) {
      const values = (line ?? []).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      if (values.length < 2) continue;
      const name = extractName(values);
      if (!name) continue;
      rows.push({
        name,
        nameKey: normalizeName(name),
        className: sheetName,
        sourceFile: path.basename(workbookPath),
      });
    }
  }
  return rows;
}

function readPhotoIdRows(XLSX, workbookPath, photoIdsFilter) {
  const wb = XLSX.readFile(workbookPath);
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEETS.has(sheetName) || /manifest|readme|summary|overview/i.test(sheetName)) continue;
    const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
    for (const line of matrix) {
      const values = (line ?? []).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      if (values.length < 2) continue;
      let photoId = null;
      let name = null;
      for (const value of values) {
        if (typeof value === 'number' && value >= 1000 && value < 4000) photoId = Math.trunc(value);
        else if (typeof value === 'string') name = extractName([value]);
      }
      if (!name || !photoId) continue;
      if (photoIdsFilter && !photoIdsFilter.has(photoId)) continue;
      rows.push({ name, photoId, className: sheetName });
    }
  }
  return rows;
}

async function collectListWorkbooks(schoolDir) {
  const files = [];
  async function walk(dir, depth = 0) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'photo' || entry.name === 'photo-edited' || entry.name === 'PRINTEND' || entry.name === 'systemCeck') {
          continue;
        }
        if (entry.name === 'LIST 2027' || depth === 0) {
          await walk(full, depth + 1);
        }
        continue;
      }
      if (!/\.xlsx$/i.test(entry.name)) continue;
      if (SKIP_FILE_RE.test(entry.name)) continue;
      const rel = path.relative(schoolDir, full);
      if (rel.startsWith('LIST 2027') || LIST_FILE_RE.test(entry.name)) {
        files.push(full);
      }
    }
  }
  await walk(schoolDir);
  return [...new Set(files)].sort();
}

function findBestListMatch(targetName, listRows) {
  let best = null;
  let bestScore = 0;
  for (const row of listRows) {
    const score = nameMatchScore(targetName, row.name);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  if (!best || bestScore < 70) return { match: null, score: bestScore };
  return { match: best, score: bestScore };
}

async function login(email, password) {
  const IAM_API_URL = process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1';
  const res = await fetch(`${IAM_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  return json.data.accessToken;
}

async function fetchStudentCandidates(token, excelName) {
  const STUDENT_API_URL = process.env.STUDENT_API_URL ?? 'http://localhost:3052/api';
  const parts = normalizeName(excelName).split(' ').filter(Boolean);
  const terms = new Set();
  for (const p of parts) if (p.length >= 2) terms.add(p);
  if (parts.length >= 2) {
    terms.add(parts[parts.length - 1]);
    terms.add(parts[0]);
  }
  const byId = new Map();
  for (const term of terms) {
    const params = new URLSearchParams({ search: term });
    const res = await fetch(`${STUDENT_API_URL}/students?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Student search failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
    for (const s of json.data ?? []) {
      byId.set(s.id, {
        fullName: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
      });
    }
  }
  return [...byId.values()];
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const schoolFolder = flags.school;
  if (!schoolFolder) throw new Error('--school is required');

  const schoolDir = path.join(SCHOOL_DATA_DIR, schoolFolder);
  const XLSX = loadXlsx();
  const photoIdPath = path.join(schoolDir, 'classes with photo_id.xlsx');

  const photoIdsFilter = flags['photo-ids']
    ? new Set(String(flags['photo-ids']).split(',').map((v) => Number(v.trim())).filter(Number.isFinite))
    : null;

  let targets = readPhotoIdRows(XLSX, photoIdPath, photoIdsFilter);
  if (!targets.length) throw new Error(`No rows found in ${photoIdPath}`);

  if (flags['from-app']) {
    const token = flags.token ?? await login(flags.email, flags.password);
    const notFound = [];
    for (const row of targets) {
      const candidates = await fetchStudentCandidates(token, row.name);
      const { match, score } = findBestListMatch(row.name, candidates.map((c) => ({ name: c.fullName })));
      if (!match || score < 70) notFound.push(row);
    }
    targets = notFound;
  }

  const listFiles = await collectListWorkbooks(schoolDir);
  if (!listFiles.length) throw new Error(`No LIST 2027 / 2026-2027 workbooks found under ${schoolDir}`);

  const listRows = [];
  for (const file of listFiles) {
    listRows.push(...readListRowsFromWorkbook(XLSX, file));
  }

  console.log(`School: ${schoolFolder}`);
  console.log(`LIST 2027 / 2026-2027 files scanned: ${listFiles.length}`);
  console.log(`Students on class lists: ${listRows.length}`);
  console.log(`Checking ${targets.length} student(s) from classes with photo_id.xlsx\n`);

  let onList = 0;
  let notOnList = 0;

  for (const target of targets) {
    const { match, score } = findBestListMatch(target.name, listRows);
    if (match && score >= 70) {
      onList += 1;
      const fuzzy = score < 100 ? ` (~${score}% name match)` : '';
      console.log(
        `  ON LIST 2027  [${target.photoId}] ${target.name} (${target.className})`
        + `\n                 -> ${match.name} | class/sheet: ${match.className} | file: ${match.sourceFile}${fuzzy}`,
      );
    } else {
      notOnList += 1;
      console.log(
        `  NOT ON LIST   [${target.photoId}] ${target.name} (${target.className})`
        + (score > 0 ? ` — closest score ${score}%` : ''),
      );
    }
  }

  console.log(`\nSummary: { onList2027: ${onList}, notOnList2027: ${notOnList}, total: ${targets.length} }`);
  if (onList > 0) {
    console.log('\nStudents ON LIST 2027 but NOT in app → import/register them in ShulePlus first, then re-run photo upload.');
  }
  if (notOnList > 0) {
    console.log('\nStudents NOT on LIST 2027 → likely wrong name in photo_id file, or removed/transferred student.');
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

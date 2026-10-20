#!/usr/bin/env node
/**
 * Upload student/staff photos from docs/SchoolData to ShulePlus APIs.
 *
 * Setup (server or local):
 *   export IAM_API_URL=https://shuleplus.rw/api/v1
 *   export STUDENT_API_URL=https://studentmanagement-api.shuleplus.rw/api
 *   export HR_API_URL=https://hr-api.shuleplus.rw/api
 *   export SERVICE_KEY=<MODULE_PROVISIONING_KEY>   # for search-orgs only
 *
 * Search organizations (schools):
 *   node scripts/upload-school-photos.mjs search-orgs MATTHEWS
 *   node scripts/upload-school-photos.mjs search-orgs --status=ACTIVE
 *
 * Upload photos (dry-run first):
 *   node scripts/upload-school-photos.mjs upload \
 *     --school "ST MATTHEWS GASHONGA" \
 *     --email admin@school.rw \
 *     --password 'YourPassword' \
 *     --type both \
 *     --dry-run
 *
 * Upload for real:
 *   node scripts/upload-school-photos.mjs upload \
 *     --school "ST MATTHEWS GASHONGA" \
 *     --token "<JWT>" \
 *     --type students \
 *     --force
 *
 * Audit before upload (Excel report):
 *   node scripts/upload-school-photos.mjs audit \
 *     --school "ST MATTHEWS NTENDEZI" \
 *     --email admin@school.rw \
 *     --password 'YourPassword'
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCHOOL_DATA_DIR = path.join(REPO_ROOT, 'docs', 'SchoolData');

function schoolDataFolder(schoolFolder) {
  return path.join(SCHOOL_DATA_DIR, schoolFolder);
}

function schoolReportPath(schoolFolder, fileName) {
  return path.join(schoolDataFolder(schoolFolder), fileName);
}

async function resolveExistingPath(candidates) {
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // try next
    }
  }
  return candidates[0];
}

const IAM_API_URL = process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1';
const STUDENT_API_URL = process.env.STUDENT_API_URL ?? 'http://localhost:3052/api';
const HR_API_URL = process.env.HR_API_URL ?? 'http://localhost:3005/api';
const SERVICE_KEY = process.env.SERVICE_KEY ?? process.env.MODULE_PROVISIONING_KEY ?? 'dev-service-key';

const SKIP_SHEETS = new Set([
  'Summary',
  'By Class Summary',
  'README',
  'Overview',
  'No Photo ID',
  'Missing Card JPG',
]);
const UPLOAD_DELAY_MS = Number(process.env.UPLOAD_DELAY_MS ?? 0);
const SKIP_NAME_PATTERNS = [
  /^LIKELY HAS IMAGE/i,
  /\.XLSX$/i,
  /^METRIC$/i,
  /^SCHOOL$/i,
  /^UPLOAD COMMAND$/i,
  /^PHOTO FOLDER$/i,
  /^EXACT MATCH$/i,
  /^FUZZY MATCH/i,
  /^STUDENTS TO UPLOAD$/i,
  /^CLASSES$/i,
];
const require = createRequire(import.meta.url);

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
  throw new Error('xlsx package not found. Run: cd StudentManagement/Backend && npm install');
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
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
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function normalizeName(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function photoSubdirFromFlags(flags) {
  const raw = flags['photo-dir'] ?? flags.photoDir ?? 'photo';
  const dir = String(raw).replace(/^[/\\]+|[/\\]+$/g, '');
  if (!dir || dir.includes('..')) throw new Error('Invalid --photo-dir (use e.g. photo or photowithoutbg)');
  return dir;
}

function photoPath(schoolFolder, photoFile, photoId, photoSubdir = 'photo') {
  const file = photoFile || `2L7A${photoId}.JPG`;
  return path.join(SCHOOL_DATA_DIR, schoolFolder, photoSubdir, file);
}

/** Prefer .JPG from Excel; accept .jpg on disk (Linux zips often use lowercase). */
async function resolvePhotoFilePath(schoolFolder, photoFile, photoId, photoSubdir = 'photo') {
  const base = photoFile || `2L7A${photoId}.JPG`;
  const dir = path.join(SCHOOL_DATA_DIR, schoolFolder, photoSubdir);
  const stem = base.replace(/\.(jpe?g|png)$/i, '');
  const candidates = [
    path.join(dir, base),
    path.join(dir, `${stem}.JPG`),
    path.join(dir, `${stem}.jpg`),
    path.join(dir, `${stem}.jpeg`),
    path.join(dir, `${stem}.PNG`),
    path.join(dir, `${stem}.png`),
  ];
  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }
  if (photoId != null && Number.isFinite(Number(photoId))) {
    const pid = Math.trunc(Number(photoId));
    const anmp = `ANMP${String(pid).padStart(4, '0')}`;
    for (const ext of ['.png', '.PNG']) {
      const p = path.join(dir, `${anmp}${ext}`);
      if (await fileExists(p)) return p;
    }
  }
  // Card exports: "2L7A1778 ZAIDI HORTENSE.JPG"
  if (photoId != null && Number.isFinite(Number(photoId))) {
    const prefix = `2L7A${Math.trunc(Number(photoId))}`;
    try {
      const entries = await fs.readdir(dir);
      const hit = entries.find(
        (name) =>
          name.toUpperCase().startsWith(prefix.toUpperCase()) &&
          /\.(jpe?g|png)$/i.test(name),
      );
      if (hit) return path.join(dir, hit);
    } catch {
      // ignore
    }
  }
  return path.join(dir, base);
}

function edupotoSourceVariants(sourceName) {
  const normalized = normalizeName(sourceName);
  const parts = normalized.split(' ').filter(Boolean);
  const out = new Set([normalized]);
  if (parts.length >= 2) {
    out.add(`${parts.slice(1).join(' ')} ${parts[0]}`);
    out.add(`${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`);
  }
  if (parts.length >= 3) {
    out.add(`${parts[parts.length - 1]} ${parts[0]} ${parts.slice(1, -1).join(' ')}`.replace(/\s+/g, ' ').trim());
  }
  return [...out];
}

function nameMatchScore(sourceName, firstName, lastName, fullName) {
  const dbVariants = [
    normalizeName(fullName),
    normalizeName(`${firstName} ${lastName}`),
    normalizeName(`${lastName} ${firstName}`),
  ].filter(Boolean);

  let best = 0;
  for (const source of edupotoSourceVariants(sourceName)) {
    if (dbVariants.includes(source)) return 100;

    for (const variant of dbVariants) {
      if (variant.includes(source) || source.includes(variant)) best = Math.max(best, 85);
      const sourceTokens = new Set(source.split(' '));
      const variantTokens = variant.split(' ').filter(Boolean);
      if (!variantTokens.length) continue;
      const overlap = variantTokens.filter((t) => sourceTokens.has(t)).length / variantTokens.length;
      best = Math.max(best, Math.round(overlap * 80));
    }
  }
  return best;
}

function studentSearchTerms(name) {
  const parts = normalizeName(name).split(' ').filter(Boolean);
  const terms = new Set();
  for (const p of parts) {
    if (p.length >= 2) terms.add(p);
  }
  if (parts.length >= 2) {
    terms.add(parts[parts.length - 1]);
    terms.add(parts[0]);
  }
  return [...terms];
}

function pickBestMatch(sourceName, candidates, label, options = {}) {
  const quiet = Boolean(options.quiet);
  let best = null;
  let bestScore = 0;
  for (const item of candidates) {
    const score = nameMatchScore(
      sourceName,
      item.firstName,
      item.lastName,
      item.fullName ?? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()
    );
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (!best || bestScore < 70) {
    return { match: null, score: bestScore };
  }
  if (!quiet && bestScore < 100) {
    console.log(`    ~ fuzzy ${label} match (${bestScore}%): ${sourceName} -> ${best.fullName ?? best.firstName + ' ' + best.lastName}`);
  }
  return { match: best, score: bestScore };
}

function buildDuplicatePhotoIdIndex(rows) {
  const byPhotoId = new Map();
  for (const row of rows) {
    const list = byPhotoId.get(row.photoId) ?? [];
    list.push(row);
    byPhotoId.set(row.photoId, list);
  }
  return byPhotoId;
}

function sanitizeSheetName(name, used) {
  const cleaned = String(name).replace(/[\\/*?:\[\]]/g, '-').slice(0, 31) || 'Sheet';
  let candidate = cleaned;
  let n = 2;
  while (used.has(candidate)) {
    const tail = ` ${n}`;
    candidate = `${cleaned.slice(0, 31 - tail.length)}${tail}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function auditRow(token, row, duplicateIndex, photoSubdir = 'photo') {
  const photoFile = row.photoFile || `2L7A${row.photoId}.JPG`;
  const filePath = await resolvePhotoFilePath(row.schoolFolder, row.photoFile, row.photoId, photoSubdir);
  const exists = await fileExists(filePath);
  const dupRows = duplicateIndex.get(row.photoId) ?? [];
  const isDuplicatePhotoId = dupRows.length > 1;
  const otherNames = dupRows
    .filter((r) => normalizeName(r.name) !== normalizeName(row.name))
    .map((r) => r.name)
    .join('; ');

  let dbStudentId = '';
  let dbMatchedName = '';
  let matchScore = 0;
  let hasExistingPhoto = false;
  let status = 'pending';

  if (row.type === 'student') {
    const candidates = await fetchStudentCandidates(token, row.name);
    const { match, score } = pickBestMatch(row.name, candidates, 'student', { quiet: true });
    matchScore = score;
    if (match) {
      dbStudentId = match.id;
      dbMatchedName = match.fullName;
      hasExistingPhoto = Boolean(match.studentPhoto);
      status = 'matched';
    } else {
      status = 'not_found';
    }
  } else {
    const parts = row.name.trim().split(/\s+/);
    const searchTerm = parts.length > 1 ? parts[parts.length - 1] : row.name;
    const candidates = await fetchStaff(token, searchTerm);
    const { match, score } = pickBestMatch(row.name, candidates, 'staff', { quiet: true });
    matchScore = score;
    if (match) {
      dbStudentId = match.id;
      dbMatchedName = match.fullName;
      hasExistingPhoto = Boolean(match.photoUrl);
      status = 'matched';
    } else {
      status = 'not_found';
    }
  }

  if (!exists) status = 'missing_file';
  const fuzzyMatch = status === 'matched' && matchScore > 0 && matchScore < 100;
  const exactMatch = status === 'matched' && matchScore === 100;
  const readyToUpload = status === 'matched' && exists && !hasExistingPhoto;

  const notes = [];
  if (!exists) notes.push('Photo file missing on disk');
  if (isDuplicatePhotoId) notes.push(`Duplicate photo_id shared with: ${otherNames || '(same name repeated)'}`);
  if (fuzzyMatch) notes.push(`Fuzzy name match (${matchScore}%) — verify face in photo`);
  if (status === 'not_found') notes.push('No student/staff in database with this name');
  if (hasExistingPhoto) notes.push('Already has photo in database');

  let uploadStatus = 'Not Uploaded';
  let notUploadedReason = '';
  if (status === 'missing_file') {
    notUploadedReason = 'Missing photo file on disk';
  } else if (status === 'not_found') {
    notUploadedReason = 'Not in database (name not found)';
  } else if (status === 'matched' && hasExistingPhoto) {
    uploadStatus = 'Uploaded';
    notUploadedReason = '';
  } else if (status === 'matched') {
    notUploadedReason = 'In database but no photo in app yet — run upload';
  }

  return {
    type: row.type,
    class: row.className ?? '',
    excel_name: row.name,
    photo_id: row.photoId,
    photo_file: photoFile,
    file_exists: exists ? 'Y' : 'N',
    duplicate_photo_id: isDuplicatePhotoId ? 'Y' : 'N',
    other_names_same_photo_id: otherNames,
    db_student_id: dbStudentId,
    db_matched_name: dbMatchedName,
    match_score: matchScore || '',
    exact_match: exactMatch ? 'Y' : 'N',
    fuzzy_match: fuzzyMatch ? 'Y' : 'N',
    has_existing_photo: hasExistingPhoto ? 'Y' : 'N',
    ready_to_upload: readyToUpload ? 'Y' : 'N',
    upload_status: uploadStatus,
    not_uploaded_reason: notUploadedReason,
    status,
    notes: notes.join(' | '),
  };
}

function sheetUploaded(rows) {
  return rows
    .filter((r) => r.upload_status === 'Uploaded')
    .map((r) => ({
      name: r.excel_name,
      class: r.class,
      photo_id: r.photo_id,
      photo_file: r.photo_file,
      matched_in_app: r.db_matched_name,
      match_score: r.match_score,
      fuzzy: r.fuzzy_match,
    }));
}

function sheetNotUploaded(rows) {
  return rows
    .filter((r) => r.upload_status === 'Not Uploaded')
    .map((r) => ({
      name: r.excel_name,
      class: r.class,
      photo_id: r.photo_id,
      photo_file: r.photo_file,
      reason: r.not_uploaded_reason,
      matched_in_app: r.db_matched_name || '',
      notes: r.notes,
    }));
}

function sheetFuzzy(rows) {
  return rows
    .filter((r) => r.fuzzy_match === 'Y')
    .map((r) => ({
      name_in_excel: r.excel_name,
      name_in_app: r.db_matched_name,
      photo_id: r.photo_id,
      photo_file: r.photo_file,
      match_score: r.match_score,
      upload_status: r.upload_status,
      notes: r.notes,
    }));
}

function jsonSheetOrPlaceholder(XLSX, rows, placeholderHeaders) {
  if (rows.length) return XLSX.utils.json_to_sheet(rows);
  const ws = XLSX.utils.aoa_to_sheet([placeholderHeaders]);
  return ws;
}

async function writeAuditWorkbook(XLSX, outputPath, schoolFolder, auditRows) {
  const uploadedCount = auditRows.filter((r) => r.upload_status === 'Uploaded').length;
  const notUploadedCount = auditRows.filter((r) => r.upload_status === 'Not Uploaded').length;

  const summary = {
    school_folder: schoolFolder,
    generated_at: new Date().toISOString(),
    total_rows: auditRows.length,
    uploaded_in_app: uploadedCount,
    not_uploaded: notUploadedCount,
    matched: auditRows.filter((r) => r.status === 'matched').length,
    not_found: auditRows.filter((r) => r.status === 'not_found').length,
    missing_file: auditRows.filter((r) => r.file_exists === 'N').length,
    fuzzy_match: auditRows.filter((r) => r.fuzzy_match === 'Y').length,
    duplicate_photo_id: auditRows.filter((r) => r.duplicate_photo_id === 'Y').length,
    ready_to_upload: auditRows.filter((r) => r.ready_to_upload === 'Y').length,
    has_existing_photo: auditRows.filter((r) => r.has_existing_photo === 'Y').length,
  };

  const summaryRows = Object.entries(summary).map(([metric, value]) => ({ metric, value }));
  const uploaded = sheetUploaded(auditRows);
  const notUploaded = sheetNotUploaded(auditRows);
  const fuzzy = sheetFuzzy(auditRows);
  const duplicates = auditRows.filter((r) => r.duplicate_photo_id === 'Y');

  const wb = XLSX.utils.book_new();
  const used = new Set();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), sanitizeSheetName('Summary', used));
  XLSX.utils.book_append_sheet(
    wb,
    jsonSheetOrPlaceholder(XLSX, uploaded, ['name', 'class', 'photo_id', 'photo_file', 'matched_in_app']),
    sanitizeSheetName('Uploaded', used),
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonSheetOrPlaceholder(XLSX, notUploaded, ['name', 'class', 'photo_id', 'photo_file', 'reason']),
    sanitizeSheetName('Not Uploaded', used),
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonSheetOrPlaceholder(XLSX, fuzzy, ['name_in_excel', 'name_in_app', 'photo_id', 'match_score', 'upload_status']),
    sanitizeSheetName('Fuzzy', used),
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditRows), sanitizeSheetName('All Rows Detail', used));
  if (duplicates.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(duplicates), sanitizeSheetName('Duplicate Photo ID', used));
  }

  XLSX.writeFile(wb, outputPath);
}

async function buildAuditRows(token, rows, photoSubdir = 'photo') {
  const duplicateIndex = buildDuplicatePhotoIdIndex(rows);
  const auditRows = [];
  for (let i = 0; i < rows.length; i += 1) {
    const record = await auditRow(token, rows[i], duplicateIndex, photoSubdir);
    auditRows.push(record);
    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      console.log(`  Processed ${i + 1}/${rows.length}`);
    }
  }
  return auditRows;
}

async function generateAuditWorkbook(token, schoolFolder, flags, { quiet = false } = {}) {
  flags.type = flags.type ?? 'students';
  if (!flags.source) flags.source = 'photo-id';

  const allRows = await loadUploadRows(schoolFolder, flags);
  const rows = allRows.filter((row) => {
    if (flags.type === 'students') return row.type === 'student';
    if (flags.type === 'staff') return row.type === 'staff';
    return true;
  });

  if (!rows.length) throw new Error('No rows with photo_id found. Check folder and classes with photo_id.xlsx');

  if (!quiet) console.log(`Auditing ${rows.length} row(s) for ${schoolFolder}...\n`);

  const photoSubdir = photoSubdirFromFlags(flags);
  const auditRows = await buildAuditRows(token, rows, photoSubdir);
  const XLSX = loadXlsx();
  const defaultOut = schoolReportPath(schoolFolder, `${schoolFolder} - PHOTO UPLOAD AUDIT.xlsx`);
  const outputPath = flags.output ? path.resolve(flags.output) : defaultOut;
  await writeAuditWorkbook(XLSX, outputPath, schoolFolder, auditRows);

  return { outputPath, auditRows, rows };
}

async function cmdAudit(flags) {
  const schoolFolder = flags.school;
  if (!schoolFolder) throw new Error('--school is required (folder name under docs/SchoolData)');

  let token = flags.token;
  if (!token) {
    const { email, password } = authEmailPassword(flags);
    if (!email || !password) {
      throw new Error('Provide --token or --email and --password (or SHULEPLUS_EMAIL / SHULEPLUS_PASSWORD)');
    }
    token = await login(email, password);
  }

  const { outputPath, auditRows } = await generateAuditWorkbook(token, schoolFolder, flags);

  const summary = {
    uploaded_in_app: auditRows.filter((r) => r.upload_status === 'Uploaded').length,
    not_uploaded: auditRows.filter((r) => r.upload_status === 'Not Uploaded').length,
    fuzzy: auditRows.filter((r) => r.fuzzy_match === 'Y').length,
    duplicate_photo_id: auditRows.filter((r) => r.duplicate_photo_id === 'Y').length,
  };

  console.log('\nAudit summary:', summary);
  console.log(`Report saved: ${outputPath}`);
  console.log('Sheets: Summary | Uploaded | Not Uploaded | Fuzzy | All Rows Detail');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(email, password) {
  const res = await fetch(`${IAM_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  }
  return json.data.accessToken;
}

async function searchOrganizations(search, status) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  params.set('limit', '100');

  const res = await fetch(`${IAM_API_URL}/internal/organizations?${params}`, {
    headers: { 'x-service-key': SERVICE_KEY },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Organization search failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  }
  return json.data ?? [];
}

function readStudentRowsFromWorkbook(XLSX, workbookPath, schoolFolder) {
  const wb = XLSX.readFile(workbookPath);
  const rows = [];

  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEETS.has(sheetName) || sheetName.includes('No Photo')) continue;
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    for (const row of data) {
      const name = String(row.name ?? row.Name ?? '').trim();
      const photoId = Number(row.photo_id ?? row.photoId ?? row['photo id']);
      if (!name || !Number.isFinite(photoId)) continue;
      const pid = Math.trunc(photoId);
      let photoFile = String(row.photo_file ?? row.photoFile ?? '').trim();
      if (!photoFile) {
        photoFile = pid < 1000 ? `ANMP${String(pid).padStart(4, '0')}.png` : `2L7A${pid}.JPG`;
      }
      const studentCode = String(
        row.student_code ?? row.studentCode ?? row.student_uid ?? row.studentUid ?? '',
      ).trim();
      const excelClass = String(row.excel_class ?? row.excelClass ?? row.class ?? '').trim();
      rows.push({
        className: sheetName,
        excelClass: excelClass || sheetName,
        number: row.number ?? row.No ?? row['No.'] ?? '',
        name,
        studentCode,
        photoId: pid,
        photoFile,
        schoolFolder,
        type: 'student',
      });
    }
  }
  return rows;
}

function readPhotoIdWorkbook(XLSX, workbookPath, schoolFolder, type = 'student') {
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
        // RUSIZI PRIMARY ~1000–1880; GASHONGA ~2000+; TYAZO cards ~7800–8500.
        if (typeof value === 'number' && value >= 1000 && value < 10000) photoId = Math.trunc(value);
        else if (typeof value === 'string') {
          const text = value.trim();
          const upper = text.toUpperCase();
          if (upper.includes('CLASS LIST') || ['NO', 'NAMES', "LEARNERS' NAMES", 'STAFF NAME', 'POSITION'].includes(upper)) continue;
          if (text.replace('.', '').match(/^\d+$/)) continue;
          name = text;
        }
      }
      // GS CAMP: [No, Name, photo_id] with ANMP ids 1–999.
      if (!photoId && values.length >= 3) {
        const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
        if (nums.length >= 2) photoId = Math.trunc(nums[nums.length - 1]);
      } else if (!photoId && values.length >= 2) {
        const tail = values[values.length - 1];
        if (typeof tail === 'number' && tail >= 1 && tail < 1000) photoId = Math.trunc(tail);
      }
      if (!name || !photoId) continue;
      if (SKIP_NAME_PATTERNS.some((pattern) => pattern.test(name))) continue;
      const photoFile =
        photoId < 1000
          ? `ANMP${String(photoId).padStart(4, '0')}.png`
          : `2L7A${photoId}.JPG`;
      rows.push({
        className: sheetName,
        name,
        photoId,
        photoFile,
        schoolFolder,
        type,
      });
    }
  }
  return rows;
}

function resolveWorkbookPath(schoolFolder, workbookFlag) {
  if (!workbookFlag) return null;
  const raw = String(workbookFlag).trim();
  if (path.isAbsolute(raw)) return raw;
  return path.join(SCHOOL_DATA_DIR, schoolFolder, raw);
}

async function loadUploadRows(schoolFolder, flags) {
  const XLSX = loadXlsx();
  const byClassFile = await resolveExistingPath([
    schoolReportPath(schoolFolder, `${schoolFolder} - 2026-2027 By Class With Photo ID.xlsx`),
    path.join(SCHOOL_DATA_DIR, `${schoolFolder} - 2026-2027 By Class With Photo ID.xlsx`),
  ]);
  const legacyFile = await resolveExistingPath([
    schoolReportPath(schoolFolder, `${schoolFolder} - 2026-2027 Students With Photo ID.xlsx`),
    path.join(SCHOOL_DATA_DIR, `${schoolFolder} - 2026-2027 Students With Photo ID.xlsx`),
  ]);
  const customWorkbook = resolveWorkbookPath(schoolFolder, flags.workbook);
  const photoIdStudents = customWorkbook ?? path.join(SCHOOL_DATA_DIR, schoolFolder, 'classes with photo_id.xlsx');
  const photoIdStaff = path.join(SCHOOL_DATA_DIR, schoolFolder, 'STAFF 2027.xlsx');

  const source = flags.workbook ? 'photo-id' : (flags.source ?? 'auto');
  const rows = [];

  if (source === 'auto' || source === 'by-class') {
    let workbook = byClassFile;
    try {
      await fs.access(workbook);
    } catch {
      workbook = legacyFile;
    }
    try {
      await fs.access(workbook);
      rows.push(...readStudentRowsFromWorkbook(XLSX, workbook, schoolFolder));
    } catch {
      if (source === 'by-class') throw new Error(`Workbook not found: ${workbook}`);
    }
  }

  if (source === 'photo-id' || ((source === 'auto') && rows.length === 0)) {
    try {
      await fs.access(photoIdStudents);
      const probe = XLSX.readFile(photoIdStudents);
      const firstSheet = probe.Sheets[probe.SheetNames[0]];
      const headerRow = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })[0];
      const hasColumnPhotoId =
        headerRow &&
        (headerRow.photo_id !== undefined ||
          headerRow.photoId !== undefined ||
          headerRow['photo id'] !== undefined);
      if (hasColumnPhotoId) {
        rows.push(...readStudentRowsFromWorkbook(XLSX, photoIdStudents, schoolFolder));
      } else {
        rows.push(...readPhotoIdWorkbook(XLSX, photoIdStudents, schoolFolder, 'student'));
      }
    } catch {
      if (source === 'photo-id') {
        throw new Error(`Workbook not found: ${photoIdStudents}`);
      }
    }
  }

  if (flags.type === 'staff' || flags.type === 'both') {
    try {
      await fs.access(photoIdStaff);
      rows.push(...readPhotoIdWorkbook(XLSX, photoIdStaff, schoolFolder, 'staff'));
    } catch {
      // no staff workbook
    }
  }

  const unique = new Map();
  for (const row of rows) {
    const key = `${row.type}:${normalizeName(row.name)}:${row.photoId}`;
    unique.set(key, row);
  }
  return [...unique.values()];
}

function classLabelFromStudent(s) {
  const en = s.enrollments?.[0];
  const cls = en?.class;
  if (!cls) return String(s.className ?? '').trim();
  return cls.stream ? `${cls.name} ${cls.stream}`.trim() : String(cls.name ?? '').trim();
}

function mapStudentFromApi(s) {
  const uid = String(s.studentUid ?? s.studentCode ?? '').trim();
  return {
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    fullName: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
    studentUid: uid,
    studentCode: String(s.studentCode ?? uid).trim(),
    className: classLabelFromStudent(s),
    studentPhoto: s.studentPhoto ?? null,
  };
}

async function fetchStudents(token, search) {
  const params = new URLSearchParams({ search });
  const res = await fetch(`${STUDENT_API_URL}/students?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Student search failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  return (json.data ?? []).map(mapStudentFromApi);
}

function normalizeClassLabel(label) {
  return normalizeName(label).replace(/\s+/g, ' ').trim();
}

async function resolveStudentForUpload(token, row) {
  const code = String(row.studentCode ?? '').trim();
  if (code) {
    const byCode = await fetchStudents(token, code);
    const exact = byCode.find(
      (s) => s.studentUid === code || s.studentCode === code || s.id === code,
    );
    if (exact) return exact;
  }

  const candidates = await fetchStudentCandidates(token, row.name);
  const wantClass = normalizeClassLabel(row.excelClass ?? row.className ?? '');
  let pool = candidates;
  if (wantClass) {
    const inClass = candidates.filter((c) => {
      const cn = normalizeClassLabel(c.className ?? '');
      if (!cn) return false;
      if (cn === wantClass) return true;
      return cn.replace(/\s/g, '') === wantClass.replace(/\s/g, '');
    });
    if (inClass.length === 1) return inClass[0];
    if (inClass.length > 1) pool = inClass;
  }

  const { match, score } = pickBestMatch(row.name, pool, 'student');
  if (!match || score < 70) return null;
  return match;
}

async function fetchStudentCandidates(token, excelName) {
  const terms = studentSearchTerms(excelName);
  const byId = new Map();
  for (const term of terms) {
    const batch = await fetchStudents(token, term);
    for (const s of batch) byId.set(s.id, s);
  }
  return [...byId.values()];
}

async function fetchStaff(token, search) {
  const params = new URLSearchParams({ search, limit: '50' });
  const res = await fetch(`${HR_API_URL}/directory?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Staff search failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  return (json.data ?? []).map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName: e.fullName ?? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
    photoUrl: e.photoUrl ?? null,
  }));
}

function imageMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function uploadStudentPhoto(token, filePath) {
  const bytes = await fs.readFile(filePath);
  const form = new FormData();
  form.append('photo', new Blob([bytes], { type: imageMimeType(filePath) }), path.basename(filePath));

  const res = await fetch(`${STUDENT_API_URL}/upload/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Photo upload failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  return json.data.url;
}

async function updateStudentPhoto(token, studentId, photoUrl) {
  const res = await fetch(`${STUDENT_API_URL}/students/${studentId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ studentPhoto: photoUrl }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Student update failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  return json.data;
}

async function clearStudentPhoto(token, studentId) {
  const res = await fetch(`${STUDENT_API_URL}/students/${studentId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ studentPhoto: '' }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Clear photo failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  return json.data;
}

function parsePhotoIdFilter(flags) {
  const raw = flags['photo-id'] ?? flags.photoId ?? '';
  if (!raw) return null;
  return raw
    .split(',')
    .map((s) => parseInt(String(s).trim(), 10))
    .filter((n) => Number.isFinite(n));
}

function duplicatePhotoGroups(rows, photoIdFilter = null) {
  const index = buildDuplicatePhotoIdIndex(rows);
  const groups = [];
  for (const [photoId, dupRows] of index.entries()) {
    if (dupRows.length < 2) continue;
    if (photoIdFilter && !photoIdFilter.includes(photoId)) continue;
    groups.push({ photoId, rows: dupRows });
  }
  groups.sort((a, b) => a.photoId - b.photoId);
  return groups;
}

async function writeDuplicatePhotoReport(XLSX, outputPath, schoolFolder, groups, actions = []) {
  const flat = [];
  for (const g of groups) {
    for (const r of g.rows) {
      flat.push({
        photo_id: g.photoId,
        photo_file: r.photoFile || `2L7A${g.photoId}.JPG`,
        excel_name: r.name,
        class: r.className ?? '',
        share_count: g.rows.length,
      });
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { school_folder: schoolFolder, duplicate_photo_id_groups: groups.length, student_rows: flat.length },
    ]),
    'Summary',
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat), 'Duplicate Photo ID');
  if (actions.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actions), 'Clear Photo Actions');
  }
  XLSX.writeFile(wb, outputPath);
}

async function cmdListDuplicates(flags) {
  const schoolFolder = flags.school;
  if (!schoolFolder) throw new Error('--school is required');
  flags.source = flags.source ?? 'photo-id';
  const rows = (await loadUploadRows(schoolFolder, flags)).filter((r) => r.type === 'student');
  const filter = parsePhotoIdFilter(flags);
  const groups = duplicatePhotoGroups(rows, filter);

  if (!groups.length) {
    console.log('No duplicate photo_id groups found.');
    return;
  }

  console.log(`Duplicate photo_id groups: ${groups.length}\n`);
  for (const g of groups) {
    console.log(`  photo_id ${g.photoId} (${g.rows.length} students):`);
    for (const r of g.rows) {
      console.log(`    - ${r.name}  [${r.className ?? ''}]`);
    }
    console.log('');
  }

  const XLSX = loadXlsx();
  const out = flags.output
    ? path.resolve(flags.output)
    : schoolReportPath(schoolFolder, `${schoolFolder} - DUPLICATE PHOTO ID.xlsx`);
  await writeDuplicatePhotoReport(XLSX, out, schoolFolder, groups);
  console.log(`Report: ${out}`);
}

async function cmdClearDuplicatePhotos(flags) {
  const schoolFolder = flags.school;
  if (!schoolFolder) throw new Error('--school is required');

  let token = flags.token;
  if (!token) {
    if (!flags.email || !flags.password) throw new Error('Provide --token or --email and --password');
    token = await login(flags.email, flags.password);
  }

  flags.source = flags.source ?? 'photo-id';
  const dryRun = Boolean(flags['dry-run']);
  const rows = (await loadUploadRows(schoolFolder, flags)).filter((r) => r.type === 'student');
  const filter = parsePhotoIdFilter(flags);
  const groups = duplicatePhotoGroups(rows, filter);

  if (!groups.length) {
    console.log('No duplicate photo_id groups matched.');
    return;
  }

  console.log(`School folder: ${schoolFolder}`);
  console.log(`Duplicate groups: ${groups.length}${dryRun ? ' (dry-run)' : ''}\n`);

  const actions = [];
  const results = { cleared: 0, skipped: 0, notFound: 0, errors: 0 };

  for (const g of groups) {
    console.log(`photo_id ${g.photoId} shared by ${g.rows.length} students:`);
    for (const row of g.rows) {
      const label = `[student] ${row.name} (${g.photoId})`;
      try {
        const candidates = await fetchStudentCandidates(token, row.name);
        const { match } = pickBestMatch(row.name, candidates, 'student');
        if (!match) {
          console.log(`  NOT FOUND     ${label}`);
          actions.push({
            photo_id: g.photoId,
            excel_name: row.name,
            action: 'not_found',
            db_name: '',
          });
          results.notFound += 1;
          continue;
        }
        if (!match.studentPhoto) {
          console.log(`  SKIP (no photo) ${label} -> ${match.fullName}`);
          actions.push({
            photo_id: g.photoId,
            excel_name: row.name,
            action: 'skipped_no_photo',
            db_name: match.fullName,
            student_id: match.id,
          });
          results.skipped += 1;
          continue;
        }
        if (dryRun) {
          console.log(`  DRY-RUN clear ${label} -> ${match.fullName}`);
          actions.push({
            photo_id: g.photoId,
            excel_name: row.name,
            action: 'would_clear',
            db_name: match.fullName,
            student_id: match.id,
          });
          results.cleared += 1;
          continue;
        }
        await clearStudentPhoto(token, match.id);
        console.log(`  CLEARED       ${label} -> ${match.fullName}`);
        actions.push({
          photo_id: g.photoId,
          excel_name: row.name,
          action: 'cleared',
          db_name: match.fullName,
          student_id: match.id,
        });
        results.cleared += 1;
      } catch (err) {
        console.log(`  ERROR         ${label} -> ${err.message ?? err}`);
        actions.push({
          photo_id: g.photoId,
          excel_name: row.name,
          action: 'error',
          error: String(err.message ?? err),
        });
        results.errors += 1;
      }
    }
    console.log('');
  }

  console.log('Summary:', results);

  const XLSX = loadXlsx();
  const out = flags.output
    ? path.resolve(flags.output)
    : schoolReportPath(schoolFolder, `${schoolFolder} - DUPLICATE PHOTO ID CLEARED.xlsx`);
  await writeDuplicatePhotoReport(XLSX, out, schoolFolder, groups, actions);
  console.log(`Report: ${out}`);
}

async function updateStaffPhoto(token, employeeId, filePath) {
  const bytes = await fs.readFile(filePath);
  const photoUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  const res = await fetch(`${HR_API_URL}/employees/${employeeId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ photoUrl }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Staff update failed (${res.status}): ${json.message ?? JSON.stringify(json)}`);
  return json.data;
}

async function cmdSearchOrgs(positional, flags) {
  const search = positional[0] ?? flags.search ?? '';
  const status = flags.status;
  const orgs = await searchOrganizations(search, status);

  if (!orgs.length) {
    console.log('No organizations found.');
    return;
  }

  console.log(`Found ${orgs.length} organization(s):\n`);
  for (const org of orgs) {
    console.log(`  ${org.name}`);
    console.log(`    id:   ${org.id}`);
    console.log(`    code: ${org.organizationCode ?? '—'}`);
    console.log(`    slug: ${org.slug ?? '—'}`);
    console.log(`    type: ${org.type ?? '—'}  status: ${org.status ?? '—'}`);
    console.log('');
  }
}

function authEmailPassword(flags) {
  const email = flags.email ?? process.env.SHULEPLUS_EMAIL ?? process.env.SP_UPLOAD_EMAIL;
  const password =
    flags.password ?? process.env.SHULEPLUS_PASSWORD ?? process.env.SP_UPLOAD_PASSWORD;
  return { email, password };
}

async function cmdUpload(flags) {
  const schoolFolder = flags.school;
  if (!schoolFolder) throw new Error('--school is required (folder name under docs/SchoolData)');

  const type = flags.type ?? 'students';
  flags.type = type;
  const dryRun = Boolean(flags['dry-run']);
  const force = Boolean(flags.force);
  const limit = flags.limit ? Number(flags.limit) : undefined;

  let token = flags.token;
  if (!token) {
    const { email, password } = authEmailPassword(flags);
    if (!email || !password) {
      throw new Error('Provide --token or --email and --password (or SHULEPLUS_EMAIL / SHULEPLUS_PASSWORD)');
    }
    token = await login(email, password);
  }

  const allRows = await loadUploadRows(schoolFolder, flags);
  const filteredRows = allRows.filter((row) => {
    if (type === 'students') return row.type === 'student';
    if (type === 'staff') return row.type === 'staff';
    return true;
  });
  const rows = limit ? filteredRows.slice(0, limit) : filteredRows;
  const photoSubdir = photoSubdirFromFlags(flags);

  console.log(`School folder: ${schoolFolder}`);
  console.log(`Photo directory: ${photoSubdir}/`);
  console.log(`Rows to process: ${rows.length}${dryRun ? ' (dry-run)' : ''}\n`);

  const results = { uploaded: 0, skipped: 0, missingFile: 0, notFound: 0, errors: 0 };

  for (const row of rows) {
    const filePath = await resolvePhotoFilePath(row.schoolFolder, row.photoFile, row.photoId, photoSubdir);
    const label = `[${row.type}] ${row.name} (${row.photoId})`;

    try {
      await fs.access(filePath);
    } catch {
      console.log(`  MISSING FILE  ${label} -> ${filePath}`);
      results.missingFile += 1;
      continue;
    }

    try {
      if (row.type === 'student') {
        const match = await resolveStudentForUpload(token, row);
        if (!match) {
          console.log(`  NOT FOUND     ${label}`);
          results.notFound += 1;
          continue;
        }
        if (match.studentPhoto && !force) {
          console.log(`  SKIP (has photo) ${label}`);
          results.skipped += 1;
          continue;
        }
        if (dryRun) {
          console.log(
            `  DRY-RUN       ${label} -> ${match.fullName} (${match.studentUid || match.id}) [${match.className || '?'}]`,
          );
          results.uploaded += 1;
          continue;
        }
        const photoUrl = await uploadStudentPhoto(token, filePath);
        await updateStudentPhoto(token, match.id, photoUrl);
        console.log(
          `  UPLOADED      ${label} -> ${match.fullName} (${match.studentUid || match.id}) [${match.className || '?'}]`,
        );
        results.uploaded += 1;
      } else {
        const parts = row.name.trim().split(/\s+/);
        const searchTerm = parts.length > 1 ? parts[parts.length - 1] : row.name;
        const candidates = await fetchStaff(token, searchTerm);
        const { match } = pickBestMatch(row.name, candidates, 'staff');
        if (!match) {
          console.log(`  NOT FOUND     ${label}`);
          results.notFound += 1;
          continue;
        }
        if (match.photoUrl && !force) {
          console.log(`  SKIP (has photo) ${label}`);
          results.skipped += 1;
          continue;
        }
        if (dryRun) {
          console.log(`  DRY-RUN       ${label} -> staff ${match.fullName} (${match.id})`);
          results.uploaded += 1;
          continue;
        }
        await updateStaffPhoto(token, match.id, filePath);
        console.log(`  UPLOADED      ${label} -> ${match.fullName}`);
        results.uploaded += 1;
      }
    } catch (err) {
      console.log(`  ERROR         ${label}: ${err.message}`);
      results.errors += 1;
    }
    if (UPLOAD_DELAY_MS > 0) await sleep(UPLOAD_DELAY_MS);
  }

  console.log('\nSummary:', results);

  const writeReport = Boolean(flags.report) || Boolean(flags['write-audit']);
  if (writeReport && !dryRun && !limit) {
    console.log('\nWriting PHOTO UPLOAD AUDIT workbook (Uploaded / Not Uploaded / Fuzzy)...');
    const { outputPath, auditRows } = await generateAuditWorkbook(token, schoolFolder, flags, { quiet: false });
    const uploaded = auditRows.filter((r) => r.upload_status === 'Uploaded').length;
    const notUploaded = auditRows.filter((r) => r.upload_status === 'Not Uploaded').length;
    console.log(`Audit saved: ${outputPath}`);
    console.log(`  Uploaded in app: ${uploaded}  |  Not uploaded: ${notUploaded}  |  Fuzzy: ${auditRows.filter((r) => r.fuzzy_match === 'Y').length}`);
  }
}

function printHelp() {
  console.log(`
Upload school photos from docs/SchoolData to ShulePlus.

Commands:
  search-orgs [term] [--status=ACTIVE]
  audit --school "ST MATTHEWS NTENDEZI" [--email ... --password ... | --token ...]
  upload --school "ST MATTHEWS GASHONGA" [--email ... --password ... | --token ...]

Audit flags:
  --school        Folder name under docs/SchoolData
  --type          students | staff | both   (default: students)
  --source        photo-id | auto | by-class   (default: photo-id)
  --workbook      Custom photo_id .xlsx (relative to school folder or absolute)
  --output        Custom path for .xlsx report

  Workbook: docs/SchoolData/<school>/<school> - PHOTO UPLOAD AUDIT.xlsx
  Sheets: Summary, Uploaded, Not Uploaded, Fuzzy, All Rows Detail

Upload flags:
  --school        Folder name under docs/SchoolData
  --type          students | staff | both   (default: students)
  --source        auto | by-class | photo-id
  --workbook      Custom photo_id .xlsx (e.g. LIST 2027/MIDDLE TOP CLASS - upload photo_id.xlsx)
  --dry-run       Match only, do not upload
  --force         Replace existing photos
  --photo-dir     Subfolder under school for images (default: photo; e.g. photo-edited, photowithoutbg)
  --limit         Process only first N rows
  --report        After upload, write PHOTO UPLOAD AUDIT.xlsx (same as audit)

Duplicate photo_id (same JPG assigned to multiple names in Excel):
  list-duplicates --school "ST MATTHEWS RUSIZI PRIMARY" [--photo-id 1197]
  clear-duplicate-photos --school "..." --email ... --password ... [--photo-id 1197] [--dry-run]

Environment:
  IAM_API_URL         default http://localhost:3001/api/v1
  STUDENT_API_URL     default http://localhost:3052/api
  HR_API_URL          default http://localhost:3005/api
  SERVICE_KEY         for search-orgs (IAM internal API)

Search organizations in database (direct SQL on server):
  psql "$DATABASE_URL" -c "SELECT id, name, organization_code, slug, status FROM organizations WHERE name ILIKE '%MATTHEWS%' ORDER BY name;"

Search via IAM script (requires DATABASE_URL in Authentication/Backend/.env):
  cd Authentication/Backend && npx tsx scripts/search-organizations.ts MATTHEWS
`);
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  if (!command || command === 'help' || flags.help) {
    printHelp();
    return;
  }

  if (command === 'search-orgs') {
    await cmdSearchOrgs(positional.slice(1), flags);
    return;
  }

  if (command === 'audit') {
    await cmdAudit(flags);
    return;
  }

  if (command === 'upload') {
    await cmdUpload(flags);
    return;
  }

  if (command === 'list-duplicates') {
    await cmdListDuplicates(flags);
    return;
  }

  if (command === 'clear-duplicate-photos') {
    await cmdClearDuplicatePhotos(flags);
    return;
  }

  throw new Error(`Unknown command: ${command}. Run with --help.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

import type { PrintCardStaff, StaffSource } from '../clients/upstream.client';

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function filterStaffSearch(rows: PrintCardStaff[], search?: string) {
  const q = search?.trim();
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter(
    (row) =>
      row.fullName.toLowerCase().includes(needle) ||
      row.employeeNumber.toLowerCase().includes(needle) ||
      row.position.toLowerCase().includes(needle) ||
      (row.email?.toLowerCase().includes(needle) ?? false) ||
      (row.rfidUid?.toLowerCase().includes(needle) ?? false)
  );
}

function photoPriority(source?: StaffSource) {
  if (source === 'iam') return 3;
  if (source === 'hr') return 2;
  if (source === 'timetable') return 1;
  return 0;
}

function mergeStaffRows(a: PrintCardStaff, b: PrintCardStaff): PrintCardStaff {
  const pickPhoto = () => {
    if (!a.photoUrl) return b.photoUrl ?? null;
    if (!b.photoUrl) return a.photoUrl ?? null;
    return photoPriority(a.source) >= photoPriority(b.source) ? a.photoUrl : b.photoUrl;
  };

  const preferred = photoPriority(a.source) >= photoPriority(b.source) ? a : b;

  return {
    ...preferred,
    id: a.source === 'iam' ? a.id : b.source === 'iam' ? b.id : preferred.id,
    photoUrl: pickPhoto(),
    rfidUid: a.rfidUid ?? b.rfidUid ?? null,
    employeeNumber:
      a.source === 'iam'
        ? a.employeeNumber
        : b.source === 'iam'
          ? b.employeeNumber
          : preferred.employeeNumber,
    position: preferred.position || a.position || b.position,
  };
}

function mergeStaffLists(
  hrRows: PrintCardStaff[],
  iamRows: PrintCardStaff[],
  timetableRows: PrintCardStaff[],
  search?: string
): PrintCardStaff[] {
  const byEmail = new Map<string, PrintCardStaff>();
  const withoutEmail: PrintCardStaff[] = [];

  function ingest(rows: PrintCardStaff[], defaultSource: StaffSource) {
    for (const raw of rows) {
      const row: PrintCardStaff = { ...raw, source: raw.source ?? defaultSource };
      const email = normalizeEmail(row.email);
      if (!email) {
        withoutEmail.push(row);
        continue;
      }
      const existing = byEmail.get(email);
      if (!existing) {
        byEmail.set(email, row);
        continue;
      }
      byEmail.set(email, mergeStaffRows(existing, row));
    }
  }

  ingest(hrRows, 'hr');
  ingest(iamRows, 'iam');
  ingest(timetableRows, 'timetable');

  return filterStaffSearch(
    [...byEmail.values(), ...withoutEmail].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    search
  );
}

/** HR + IAM Users & Access + Timetable teachers — aligned with IAM Smart Access staff roster. */
export function mergeAllStaffSources(
  hrRows: PrintCardStaff[],
  iamRows: PrintCardStaff[],
  timetableRows: PrintCardStaff[],
  search?: string
): PrintCardStaff[] {
  const iamPhotoById = new Map(
    iamRows.filter((row) => row.photoUrl).map((row) => [row.id, row.photoUrl as string])
  );
  const enrichedTimetable = timetableRows.map((row) => {
    if (row.photoUrl) return row;
    const linkedPhoto = iamPhotoById.get(row.employeeNumber);
    if (linkedPhoto) return { ...row, photoUrl: linkedPhoto };
    return row;
  });

  return mergeStaffLists(hrRows, iamRows, enrichedTimetable, search);
}

function indexStaffByEmailAndName(rows: PrintCardStaff[], defaultSource: StaffSource) {
  const byEmail = new Map<string, PrintCardStaff>();
  const byName = new Map<string, PrintCardStaff>();
  for (const raw of rows) {
    const row: PrintCardStaff = { ...raw, source: raw.source ?? defaultSource };
    const email = normalizeEmail(row.email);
    if (email && !byEmail.has(email)) byEmail.set(email, row);
    const nameKey = normalizePersonName(row.fullName);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, row);
  }
  return { byEmail, byName };
}

/**
 * Card printing roster: only IAM Users & Access accounts (registered org users),
 * enriched with HR / timetable photos and RFID when emails or names match.
 * Excludes legacy HR-only employees that were never provisioned in IAM.
 */
export function mergeRegisteredStaffForCards(
  hrRows: PrintCardStaff[],
  iamRows: PrintCardStaff[],
  timetableRows: PrintCardStaff[],
  search?: string
): PrintCardStaff[] {
  const hr = indexStaffByEmailAndName(hrRows, 'hr');
  const tt = indexStaffByEmailAndName(timetableRows, 'timetable');

  const roster = iamRows.map((iam) => {
    let row: PrintCardStaff = { ...iam, source: 'iam' };
    const email = normalizeEmail(iam.email);
    const nameKey = normalizePersonName(iam.fullName);

    const hrMatch =
      (email ? hr.byEmail.get(email) : undefined) ?? (nameKey ? hr.byName.get(nameKey) : undefined);
    const ttMatch =
      (email ? tt.byEmail.get(email) : undefined) ?? (nameKey ? tt.byName.get(nameKey) : undefined);

    if (hrMatch) row = mergeStaffRows(row, hrMatch);
    if (ttMatch) row = mergeStaffRows(row, ttMatch);
    return row;
  });

  return filterStaffSearch(
    roster.sort((a, b) => a.fullName.localeCompare(b.fullName)),
    search
  );
}

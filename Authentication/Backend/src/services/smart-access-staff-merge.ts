import type { SmartAccessStaff } from '../clients/smart-access-module.client';

export type StaffSource = 'hr' | 'iam' | 'timetable';

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function filterStaffSearch(rows: SmartAccessStaff[], search?: string) {
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

function mergeStaffRows(a: SmartAccessStaff, b: SmartAccessStaff): SmartAccessStaff {
  const pickPhoto = () => {
    if (!a.photoUrl) return b.photoUrl ?? null;
    if (!b.photoUrl) return a.photoUrl ?? null;
    return photoPriority(a.source) >= photoPriority(b.source) ? a.photoUrl : b.photoUrl;
  };

  const preferred =
    photoPriority(a.source) >= photoPriority(b.source)
      ? a
      : b;

  return {
    ...preferred,
    id: a.source === 'iam' ? a.id : b.source === 'iam' ? b.id : preferred.id,
    photoUrl: pickPhoto(),
    rfidUid: a.rfidUid ?? b.rfidUid ?? null,
    fingerprintId: a.fingerprintId ?? b.fingerprintId ?? null,
    employeeNumber:
      a.source === 'iam'
        ? a.employeeNumber
        : b.source === 'iam'
          ? b.employeeNumber
          : preferred.employeeNumber,
    position: preferred.position || a.position || b.position,
  };
}

/** Merge HR, IAM users, and Timetable staff — dedupe by email and keep the best photo/id. */
export function mergeStaffLists(
  hrRows: SmartAccessStaff[],
  iamRows: SmartAccessStaff[],
  timetableRows: SmartAccessStaff[],
  search?: string
): SmartAccessStaff[] {
  const byEmail = new Map<string, SmartAccessStaff>();
  const withoutEmail: SmartAccessStaff[] = [];

  function ingest(rows: SmartAccessStaff[], defaultSource: StaffSource) {
    for (const raw of rows) {
      const row: SmartAccessStaff = { ...raw, source: raw.source ?? defaultSource };
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

export function staffSourceLabel(source?: StaffSource) {
  if (source === 'hr') return 'HR';
  if (source === 'iam') return 'Users & Access';
  if (source === 'timetable') return 'Timetable';
  return 'Staff';
}

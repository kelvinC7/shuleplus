import { fetchHrTeachers } from '../clients/hr.client';
import { fetchIamTeachingStaff } from '../clients/iam.client';
import { fetchTimetableTeacherProfiles } from '../clients/timetable.client';

export type TeacherCandidate = {
  id: string;
  name: string;
  email: string | null;
  source: 'IAM' | 'TIMETABLE' | 'HR' | 'MANUAL';
  userId: string | null;
  refId: string | null;
  subtitle: string | null;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

export async function listTeacherCandidates(
  organizationId: string,
  search?: string
): Promise<TeacherCandidate[]> {
  const [iamTeachers, timetableProfiles, hrTeachers] = await Promise.all([
    fetchIamTeachingStaff(organizationId, search).catch(() => []),
    fetchTimetableTeacherProfiles(organizationId).catch(() => []),
    fetchHrTeachers(organizationId).catch(() => []),
  ]);

  const byKey = new Map<string, TeacherCandidate>();
  const q = search?.trim().toLowerCase() ?? '';

  for (const teacher of iamTeachers) {
    const email = teacher.email?.trim() || null;
    const key = teacher.id || normalizeEmail(email) || teacher.name.toLowerCase();
    byKey.set(key, {
      id: teacher.id,
      name: teacher.name,
      email,
      source: 'IAM',
      userId: teacher.id,
      refId: null,
      subtitle: [teacher.position, teacher.department, 'Users & Access'].filter(Boolean).join(' · '),
    });
  }

  for (const profile of timetableProfiles) {
    const email = profile.loginEmail?.trim() || null;
    const key = profile.teacherUserId || normalizeEmail(email) || profile.teacherName.toLowerCase();
    const existing = byKey.get(key) ?? [...byKey.values()].find((c) => normalizeEmail(c.email) === normalizeEmail(email));
    if (existing) {
      existing.subtitle = [existing.subtitle, 'Timetable'].filter(Boolean).join(' · ');
      if (!existing.userId && profile.teacherUserId) existing.userId = profile.teacherUserId;
      continue;
    }
    byKey.set(key, {
      id: profile.teacherUserId,
      name: profile.teacherName,
      email,
      source: 'TIMETABLE',
      userId: profile.teacherUserId,
      refId: null,
      subtitle: email ? `Timetable · ${email}` : 'Timetable',
    });
  }

  for (const teacher of hrTeachers) {
    const email = teacher.email?.trim() || null;
    const emailKey = normalizeEmail(email);
    const existingByEmail = emailKey
      ? [...byKey.values()].find((c) => normalizeEmail(c.email) === emailKey)
      : undefined;

    if (existingByEmail) {
      existingByEmail.subtitle = [existingByEmail.subtitle, 'HR'].filter(Boolean).join(' · ');
      if (!existingByEmail.refId) existingByEmail.refId = teacher.id;
      continue;
    }

    const key = teacher.id;
    if (byKey.has(key)) continue;

    byKey.set(key, {
      id: teacher.id,
      name: teacher.fullName,
      email,
      source: 'HR',
      userId: null,
      refId: teacher.id,
      subtitle: [teacher.position, teacher.employeeNumber ? `#${teacher.employeeNumber}` : null]
        .filter(Boolean)
        .join(' · ') || 'HR',
    });
  }

  let results = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));

  if (q) {
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.subtitle?.toLowerCase().includes(q) ?? false)
    );
  }

  return results;
}

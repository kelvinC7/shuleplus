import { fetchTeacherAccountProfile } from '../clients/timetable.client';

export type TimetableTeacherLink = {
  profile: Awaited<ReturnType<typeof fetchTeacherAccountProfile>>;
  linked: boolean;
  emailMatched: boolean;
};

export async function resolveTimetableTeacherLink(
  organizationId: string,
  userId: string,
  email?: string | null
): Promise<TimetableTeacherLink> {
  const profile = await fetchTeacherAccountProfile({
    organizationId,
    teacherUserId: userId,
    email: email ?? undefined,
  }).catch(() => null);

  const emailMatched = Boolean(
    profile?.loginEmail &&
      email &&
      profile.loginEmail.trim().toLowerCase() === email.trim().toLowerCase()
  );

  const linked = Boolean(
    profile && (emailMatched || profile.teacherUserId === userId)
  );

  return { profile, linked, emailMatched };
}

export function registrationPathFromLink(
  timetable: TimetableTeacherLink,
  hasPayrollSnapshot: boolean
): 'timetable' | 'payroll' | 'unlinked' {
  if (hasPayrollSnapshot) return 'payroll';
  if (timetable.linked) return 'timetable';
  return 'unlinked';
}

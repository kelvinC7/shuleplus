import { studentMgmtClient, type SmParent } from '../student-mgmt-client.service';
import { countSmsSegments, formatRwPhone, maskPhone, normalizePhoneKey } from '../../utils/sms-segments';
import type { SmsParentTarget } from '../../generated/prisma';
import {
  formatStudentLine,
  SMS_SIGNATURE_SUFFIX,
  SMS_TEMPLATE_MULTI,
  SMS_TEMPLATE_SINGLE,
} from './sms-message-templates';

export type StudentRow = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  sdmCode?: string | null;
  parents: Array<{
    parentId: string;
    fullName: string;
    phone: string;
    role: string;
    smsEnabled: boolean;
  }>;
};

export type ResolvedSmsRecipient = {
  phoneNormalized: string;
  phoneMasked: string;
  phoneE164: string;
  parentName: string;
  parentRole: string | null;
  studentSummary: string;
  students: Array<{ studentId: string; studentName: string; className: string | null; studentCode: string }>;
  segments: number;
  messageBody: string;
  skipReason?: string;
};

function roleMatches(target: SmsParentTarget, role: string): boolean {
  const r = role.toUpperCase();
  if (target === 'BOTH') return r === 'FATHER' || r === 'MOTHER' || r === 'GUARDIAN';
  if (target === 'FATHER') return r === 'FATHER' || r === 'GUARDIAN';
  if (target === 'MOTHER') return r === 'MOTHER' || r === 'GUARDIAN';
  return true;
}

export async function loadStudentDirectory(organizationId: string): Promise<StudentRow[]> {
  const parents = await studentMgmtClient.listParents(organizationId);
  const byStudent = new Map<string, StudentRow>();

  for (const p of parents) {
    for (const s of p.students ?? []) {
      if (!s.studentId) continue;
      const existing =
        byStudent.get(s.studentId) ??
        ({
          studentId: s.studentId,
          studentCode: s.studentCode ?? s.studentId,
          studentName: s.studentName ?? 'Student',
          className: s.className ?? null,
          parents: [],
        } satisfies StudentRow);
      existing.parents.push({
        parentId: p.id,
        fullName: p.fullName,
        phone: p.phone ?? '',
        role: (s.role ?? 'GUARDIAN').toUpperCase(),
        smsEnabled: p.smsEnabled !== false,
      });
      byStudent.set(s.studentId, existing);
    }
  }
  return [...byStudent.values()];
}

function studentLine(s: { studentName: string; className: string | null; studentCode: string }) {
  const cls = s.className?.trim();
  return cls ? `${s.studentName} (${cls})` : s.studentName;
}

function buildCombinedBody(params: {
  schoolName: string;
  template: string;
  students: ResolvedSmsRecipient['students'];
  customMessage: string;
}) {
  const studentsList = params.students.map(formatStudentLine).join('; ');
  const primary = params.students[0];
  const t = params.template.trim();
  const template =
    params.students.length > 1 &&
    (t === SMS_TEMPLATE_SINGLE ||
      t.includes('{student_line}') ||
      t.includes('{student_ref}') ||
      t.includes('{student_name}') ||
      t.startsWith('Dear Parent'))
      ? SMS_TEMPLATE_MULTI
      : params.template;

  const studentLine = primary ? formatStudentLine(primary) : '';
  const studentRef = studentLine;

  let body = template
    .replace(/\{school_name\}/gi, params.schoolName)
    .replace(/\{student_name\}/gi, primary?.studentName ?? '')
    .replace(/\{student_code\}/gi, primary?.studentCode ?? '')
    .replace(/\{class_name\}/gi, primary?.className?.trim() ?? '')
    .replace(/\{student_line\}/gi, studentLine)
    .replace(/\{student_ref\}/gi, studentRef)
    .replace(/\{message\}/gi, params.customMessage)
    .replace(/\{students_list\}/gi, studentsList);

  const sigPlain = `| ${SMS_SIGNATURE_SUFFIX}`;
  if (!body.includes(SMS_SIGNATURE_SUFFIX)) body = `${body.trim()} ${sigPlain}`;
  return body.trim();
}

export function resolveRecipientsFromStudents(params: {
  rows: StudentRow[];
  selectedStudentIds: string[];
  parentTarget: SmsParentTarget;
  schoolName: string;
  template: string;
  customMessage: string;
  classFilter?: string;
}): { recipients: ResolvedSmsRecipient[]; missingContacts: number; duplicatePhones: number } {
  const selected = params.rows.filter((r) => {
    if (params.selectedStudentIds.length && !params.selectedStudentIds.includes(r.studentId)) return false;
    if (params.classFilter && (r.className ?? '').trim() !== params.classFilter.trim()) return false;
    return true;
  });

  const groups = new Map<
    string,
    {
      phoneE164: string;
      parentName: string;
      parentRole: string | null;
      students: ResolvedSmsRecipient['students'];
    }
  >();

  let missingContacts = 0;
  let duplicatePhones = 0;

  for (const row of selected) {
    const links = row.parents.filter((p) => roleMatches(params.parentTarget, p.role));
    if (!links.length) {
      missingContacts += 1;
      continue;
    }
    for (const link of links) {
      if (!link.phone?.trim()) {
        missingContacts += 1;
        continue;
      }
      if (link.smsEnabled === false) continue;
      const key = normalizePhoneKey(link.phone);
      const phoneE164 = formatRwPhone(link.phone);
      const student = {
        studentId: row.studentId,
        studentName: row.studentName,
        className: row.className,
        studentCode: row.studentCode,
      };
      const hit = groups.get(key);
      if (hit) {
        duplicatePhones += 1;
        if (!hit.students.some((s) => s.studentId === student.studentId)) {
          hit.students.push(student);
        }
        continue;
      }
      groups.set(key, {
        phoneE164,
        parentName: link.fullName,
        parentRole: link.role,
        students: [student],
      });
    }
  }

  const recipients: ResolvedSmsRecipient[] = [];
  for (const [phoneNormalized, g] of groups) {
    const messageBody = buildCombinedBody({
      schoolName: params.schoolName,
      template: params.template,
      students: g.students,
      customMessage: params.customMessage,
    });
    recipients.push({
      phoneNormalized,
      phoneMasked: maskPhone(g.phoneE164),
      phoneE164: g.phoneE164,
      parentName: g.parentName,
      parentRole: g.parentRole,
      studentSummary: g.students.map(studentLine).join('; '),
      students: g.students,
      messageBody,
      segments: countSmsSegments(messageBody),
    });
  }

  return { recipients, missingContacts, duplicatePhones };
}

export function resolveCustomNumberRecipients(
  numbers: string[],
  message: string,
  schoolName: string
): ResolvedSmsRecipient[] {
  const sig = `| ${SMS_SIGNATURE_SUFFIX}`;
  const body = message.includes(SMS_SIGNATURE_SUFFIX) ? message : `${message.trim()} ${sig}`;
  const seen = new Set<string>();
  const out: ResolvedSmsRecipient[] = [];
  for (const raw of numbers) {
    const key = normalizePhoneKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const phoneE164 = formatRwPhone(raw);
    out.push({
      phoneNormalized: key,
      phoneMasked: maskPhone(phoneE164),
      phoneE164,
      parentName: 'Custom',
      parentRole: null,
      studentSummary: '',
      students: [],
      messageBody: body,
      segments: countSmsSegments(body),
    });
  }
  return out;
}

export function resolveBulkParents(params: {
  rows: StudentRow[];
  scope: 'class' | 'school';
  className?: string;
  parentTarget: SmsParentTarget;
  schoolName: string;
  template: string;
  customMessage: string;
}) {
  const ids =
    params.scope === 'school'
      ? params.rows.map((r) => r.studentId)
      : params.rows.filter((r) => (r.className ?? '').trim() === (params.className ?? '').trim()).map((r) => r.studentId);
  return resolveRecipientsFromStudents({
    rows: params.rows,
    selectedStudentIds: ids,
    parentTarget: params.parentTarget,
    schoolName: params.schoolName,
    template: params.template,
    customMessage: params.customMessage,
    classFilter: params.scope === 'class' ? params.className : undefined,
  });
}

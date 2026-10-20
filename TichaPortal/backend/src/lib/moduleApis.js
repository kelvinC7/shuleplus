const env = require('./env');
const { serviceFetch, unwrap } = require('./serviceFetch');

function payrollApi(path, opts) {
  return serviceFetch(env.PAYROLL_API_URL, path, opts);
}

function hrApi(path, opts) {
  return serviceFetch(env.HR_API_URL, path, opts);
}

function kaziApi(path, opts) {
  return serviceFetch(env.KAZI_API_URL, path, opts);
}

function disciplineApi(path, opts) {
  return serviceFetch(env.STUDENT_DISCIPLINE_API_URL, path, opts);
}

function babyeyiApi(path, opts) {
  return serviceFetch(env.BABYEYI_API_URL, path, opts);
}

function emailMatch(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function monthName(date) {
  return date.toLocaleString('en-US', { month: 'long' });
}

async function payrollStaffForTeacher(organizationId, email) {
  const rows = unwrap(
    await payrollApi('/staff/for-kazi-sync', { query: { organizationId } })
  );
  const list = Array.isArray(rows) ? rows : [];
  return list.find((row) => emailMatch(row.email, email)) || null;
}

async function hrStaffForTeacher(organizationId, email) {
  const rows = unwrap(
    await hrApi('/internal/staff', { query: { organizationId, search: email } })
  );
  const list = Array.isArray(rows) ? rows : [];
  return list.find((row) => emailMatch(row.email, email)) || list[0] || null;
}

async function buildTeacherPayrollSummary(organizationId, teacher) {
  const email = teacher.email;
  const [payrollRow, hrRow] = await Promise.all([
    payrollStaffForTeacher(organizationId, email).catch(() => null),
    hrStaffForTeacher(organizationId, email).catch(() => null),
  ]);

  const now = new Date();
  const net = Number(payrollRow?.netSalary ?? 0);
  const allowances = Number(payrollRow?.allowances ?? 0);
  const basic = Number(payrollRow?.basicSalary ?? Math.max(0, net - allowances));
  const rssb = Number(payrollRow?.rssbEmployee ?? 0);
  const tax = Number(payrollRow?.paye ?? payrollRow?.taxAmount ?? 0);
  const deductions = Number(payrollRow?.deductions ?? tax);
  const fullName =
    payrollRow?.fullName ||
    [hrRow?.firstName, hrRow?.lastName].filter(Boolean).join(' ').trim() ||
    teacher.name;
  const staffCode = payrollRow?.employeeNumber || hrRow?.employeeNumber || null;

  const currentSalary = {
    basic,
    allowances,
    net,
    rssb,
    tax,
    deductions,
  };

  const history = payrollRow
    ? [
        {
          id: `current-${now.getFullYear()}-${now.getMonth() + 1}`,
          month: monthName(now),
          year: now.getFullYear(),
          term: '',
          status: 'Paid',
          basic,
          allowances,
          deductions,
          tax,
          rssb,
          advance: 0,
          net,
          paid: net,
        },
      ]
    : [];

  return {
    staff: {
      fullName,
      staffCode,
      department: payrollRow?.department || hrRow?.position || null,
      role: payrollRow?.position || hrRow?.position || 'Teacher',
      email,
    },
    school: {},
    currentSalary,
    history,
    source: payrollRow ? 'payroll' : hrRow ? 'hr' : 'not-linked',
  };
}

function configuredUpstreams() {
  return {
    iam: env.IAM_API_URL,
    timetable: env.TIMETABLE_API_URL,
    academic: env.ACADEMIC_API_URL,
    studentManagement: env.STUDENT_MANAGEMENT_API_URL,
    attendance: env.ATTENDANCE_API_URL,
    kazi: env.KAZI_API_URL,
    hr: env.HR_API_URL,
    payroll: env.PAYROLL_API_URL,
    discipline: env.STUDENT_DISCIPLINE_API_URL,
    babyeyi: env.BABYEYI_API_URL,
  };
}

async function probeUpstream(name, fn) {
  try {
    await fn();
    return { name, ok: true };
  } catch (err) {
    return { name, ok: false, message: err.message || 'Unavailable' };
  }
}

async function probeConfiguredModules() {
  return Promise.all([
    probeUpstream('payroll', () => payrollApi('/health')),
    probeUpstream('hr', () => hrApi('/health')),
    probeUpstream('kazi', () => kaziApi('/health')),
    probeUpstream('discipline', () => disciplineApi('/health')),
    probeUpstream('babyeyi', () => babyeyiApi('/health')),
  ]);
}

module.exports = {
  payrollApi,
  hrApi,
  kaziApi,
  disciplineApi,
  babyeyiApi,
  buildTeacherPayrollSummary,
  configuredUpstreams,
  probeConfiguredModules,
};

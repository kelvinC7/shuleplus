import { Router } from 'express';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { schoolData } from '../services/school-data.service';
import { consoleService } from '../services/console.service';
import { AppError } from '../middleware/error.middleware';
import { DEMO_BUSES, DEMO_SERVICES } from '../demo/demo-data';

const router = Router();

/**
 * GET /search - global search across students, staff, approvals and modules.
 * Only data the caller is authorized for is searched.
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const auth = resolveAuth(req);
    if (auth.mode === 'unauthorized') {
      throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
    }
    const term = q(req, 'q');
    if (!term || term.length < 2) {
      return ok(res, { groups: [], query: term ?? '' }, { mode: auth.mode });
    }
    const needle = term.toLowerCase();

    const [students, staff, approvals] = await Promise.all([
      schoolData.students(auth, { search: term }).catch(() => []),
      schoolData.staff(auth, { search: term }).catch(() => []),
      consoleService
        .listApprovals({ search: term, page: 1, pageSize: 8 })
        .catch(() => ({ items: [] as unknown[] })),
    ]);

    const modules = [
      { title: 'Executive Overview', href: '/director/overview', keywords: 'dashboard home kpi performance' },
      { title: 'Daily Briefing', href: '/director/briefing', keywords: 'briefing alerts today' },
      { title: 'Schools & Branches', href: '/director/schools', keywords: 'branch compare school' },
      { title: 'Students', href: '/director/students', keywords: 'learner enrolment' },
      { title: 'Academics', href: '/director/academics', keywords: 'results marks performance subjects' },
      { title: 'Teaching Now', href: '/director/teaching-now', keywords: 'lessons cover substitute' },
      { title: 'Attendance', href: '/director/attendance', keywords: 'absent late rfid gate' },
      { title: 'Discipline', href: '/director/discipline', keywords: 'conduct cases behaviour' },
      { title: 'School Fees', href: '/director/fees', keywords: 'collection billing outstanding' },
      { title: 'Budget', href: '/director/budget', keywords: 'vote lines expenditure plan' },
      { title: 'HR & Payroll', href: '/director/hr', keywords: 'staff leave payroll workload' },
      { title: 'Live Campus', href: '/director/live-campus', keywords: 'cctv cameras security guards' },
      { title: 'Transport', href: '/director/transport', keywords: 'bus route driver gps' },
      { title: 'Parents', href: '/director/parents', keywords: 'parent mis accounts' },
      { title: 'Messages', href: '/director/messages', keywords: 'shulechat conversations' },
      { title: 'Circulars & Broadcasts', href: '/director/circulars', keywords: 'announcement sms wizard' },
      { title: 'Services', href: '/director/services', keywords: `shulekit shulemart uniforms dining ${DEMO_SERVICES.shuleTrip.pending > 0 ? 'shuletrip' : ''}` },
      { title: 'Approvals', href: '/director/approvals', keywords: 'approve reject requests decisions' },
      { title: 'Action Plan', href: '/director/action-plan', keywords: 'tasks commitments follow-up' },
      { title: 'Reports', href: '/director/reports', keywords: 'export pdf excel analytics' },
      { title: 'Audit Trail', href: '/director/audit', keywords: 'audit log history accountability' },
    ].filter((m) => `${m.title} ${m.keywords}`.toLowerCase().includes(needle));

    const buses = DEMO_BUSES.filter(
      (b) => `${b.name} ${b.route} ${b.driver}`.toLowerCase().includes(needle)
    ).map((b) => ({
      id: String(b.id),
      title: `${b.name} · ${b.route} route`,
      subtitle: b.status === 'late' ? `Delayed ~${b.etaMin} min` : 'On schedule',
      href: '/director/transport',
    }));

    return ok(
      res,
      {
        query: term,
        groups: [
          {
            id: 'students',
            label: 'Students',
            items: students.slice(0, 6).map((s) => ({
              id: s.id,
              title: s.fullName,
              subtitle: `${s.studentCode} · ${s.className ?? '—'} · ${s.schoolName}`,
              href: `/director/students?focus=${s.id}`,
            })),
          },
          {
            id: 'staff',
            label: 'Staff',
            items: staff.slice(0, 6).map((s) => ({
              id: s.id,
              title: s.fullName,
              subtitle: `${s.role} · ${s.schoolName}`,
              href: `/director/hr?focus=${s.id}`,
            })),
          },
          {
            id: 'approvals',
            label: 'Approval requests',
            items: (approvals.items as Array<{ id: string; reference: string; title: string; requester: string }>).map(
              (a) => ({
                id: a.id,
                title: a.title,
                subtitle: `${a.reference} · ${a.requester}`,
                href: `/director/approvals?focus=${a.id}`,
              })
            ),
          },
          {
            id: 'modules',
            label: 'Modules & pages',
            items: modules.map((m) => ({ id: m.href, title: m.title, subtitle: 'Open page', href: m.href })),
          },
          {
            id: 'transport',
            label: 'Buses',
            items: buses,
          },
        ].filter((g) => g.items.length > 0),
      },
      { mode: auth.mode }
    );
  })
);

export default router;

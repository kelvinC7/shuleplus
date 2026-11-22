/**
 * Seed the Director Console database with the prototype's decision-layer
 * records: the 6 pending approvals (circular, PO-214, leave, KaziAdvance,
 * ShuleTrip, budget reallocation), notifications, incidents and starter
 * action-plan tasks. Safe to re-run: upserts by reference/unique key.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const daysFromNow = (n: number) => new Date(Date.now() + n * 86400_000);

async function main() {
  // ── approvals (prototype requests) ────────────────────────────────────
  const approvals = [
    {
      reference: 'CI-018',
      category: 'CIRCULAR',
      title: 'Babyeyi: Term 1 2027 fees and requirements',
      requester: 'Claudine Niyonsaba',
      requesterRole: 'Secretary',
      amount: null,
      description:
        'Draft circular announcing Term 1 2027 school fees structure and requirements list for all 6 schools. Includes bank details, deadline (15 Jan 2027) and the requirements per level. Awaiting Director signature before publishing to 3,130 families.',
      dueDate: daysFromNow(0),
      priority: 'HIGH',
      workflowSteps: JSON.stringify([
        { name: 'Drafted by Secretary', status: 'done' },
        { name: 'Head teacher review', status: 'done' },
        { name: 'Director signature', status: 'pending' },
        { name: 'Publish to parents', status: 'pending' },
      ]),
      attachments: JSON.stringify([
        { name: 'Fees structure 2027.pdf', kind: 'document' },
        { name: 'Requirements per level.xlsx', kind: 'document' },
      ]),
    },
    {
      reference: 'PO-214',
      category: 'PROCUREMENT',
      title: 'Lab reagents and consumables · Term 3',
      requester: 'Eric Nkurunziza',
      requesterRole: 'Head of Science · Kamembe Secondary',
      amount: 1_340_000,
      description:
        'Purchase order for chemistry and biology reagents, consumables and lab glassware covering S3–S6 practicals for the remainder of Term 3. Three quotations attached; lowest bidder selected. Goods received note will follow delivery.',
      dueDate: daysFromNow(2),
      priority: 'MEDIUM',
      workflowSteps: JSON.stringify([
        { name: 'Requisition raised', status: 'done' },
        { name: 'Quotations reviewed (3)', status: 'done' },
        { name: 'Director approval', status: 'pending' },
        { name: 'Payment processing', status: 'pending' },
      ]),
      attachments: JSON.stringify([
        { name: 'Quotation comparison.pdf', kind: 'document' },
        { name: 'Quotation - MedLab Supplies.pdf', kind: 'document' },
      ]),
    },
    {
      reference: 'LV-092',
      category: 'LEAVE',
      title: 'Alice Uwase · annual leave 28–29 Oct',
      requester: 'Alice Uwase',
      requesterRole: 'Teacher · PE & Sports (S1–S4)',
      amount: null,
      description:
        'Request for 2 days of annual leave on 28–29 Oct. Balance: 8 of 15 days used. Cover arranged: Mr. Habiyaremye (S1–S2), Director of Studies (S3–S4 theory). Timetable conflicts checked — no clashes.',
      dueDate: daysFromNow(4),
      priority: 'LOW',
      workflowSteps: JSON.stringify([
        { name: 'Leave request submitted', status: 'done' },
        { name: 'Cover plan confirmed', status: 'done' },
        { name: 'Director approval', status: 'pending' },
      ]),
      attachments: JSON.stringify([]),
    },
    {
      reference: 'KA-047',
      category: 'KAZI_ADVANCE',
      title: 'Patrick Rukundo · salary advance RWF 180,000',
      requester: 'Patrick Rukundo',
      requesterRole: 'Teacher · Mathematics',
      amount: 180_000,
      description:
        'Salary advance request equivalent to 30% of monthly salary for a family medical emergency. Repayment over 3 months starting November payroll. Policy allows one advance per year; none taken this year.',
      dueDate: daysFromNow(1),
      priority: 'MEDIUM',
      workflowSteps: JSON.stringify([
        { name: 'Request submitted', status: 'done' },
        { name: 'HR eligibility check', status: 'done' },
        { name: 'Director approval', status: 'pending' },
        { name: 'Payroll scheduling', status: 'pending' },
      ]),
      attachments: JSON.stringify([{ name: 'Medical invoice.jpg', kind: 'image' }]),
    },
    {
      reference: 'TR-088',
      category: 'TRIP',
      title: 'S3 study trip · Nyungwe National Park',
      requester: 'Josiane Uwera',
      requesterRole: 'Director of Studies · Kamembe Secondary',
      amount: 1_650_000,
      description:
        'S3 study trip to Nyungwe National Park on 14 Nov (86 students, 6 staff, 2 buses). Cost: RWF 19,200/student transport + entry + meals. Consent forms: 78 of 86 returned. Safety plan and first-aid kit attached. Requires district approval after the Director.',
      dueDate: daysFromNow(3),
      priority: 'HIGH',
      workflowSteps: JSON.stringify([
        { name: 'Trip request submitted', status: 'done' },
        { name: 'Safety plan reviewed', status: 'done' },
        { name: 'Parent consents collected (78/86)', status: 'done' },
        { name: 'Director approval', status: 'pending' },
        { name: 'District education office approval', status: 'pending' },
      ]),
      attachments: JSON.stringify([
        { name: 'Trip safety plan.pdf', kind: 'document' },
        { name: 'Bus hire quotation.pdf', kind: 'document' },
      ]),
    },
    {
      reference: 'BR-031',
      category: 'BUDGET',
      title: 'Reallocate RWF 4M from Maintenance to Boarding',
      requester: 'Olivier Hakizimana',
      requesterRole: 'Deputy Head · Kamembe Secondary',
      amount: 4_000_000,
      description:
        'Boarding food costs are 8% over plan this term due to supplier price increases. Request to move RWF 4M from the underspent Maintenance vote (72% remaining) to the Boarding vote. No impact on committed maintenance contracts.',
      dueDate: daysFromNow(1),
      priority: 'URGENT',
      workflowSteps: JSON.stringify([
        { name: 'Reallocation drafted', status: 'done' },
        { name: 'Chief Accountant review', status: 'done' },
        { name: 'Director approval', status: 'pending' },
        { name: 'Budget amendment posted', status: 'pending' },
      ]),
      attachments: JSON.stringify([{ name: 'Budget variance analysis.pdf', kind: 'document' }]),
    },
  ];

  for (const a of approvals) {
    await prisma.approvalItem.upsert({
      where: { reference: a.reference },
      create: { ...a, status: 'PENDING', organizationId: null },
      update: {},
    });
  }

  // an already-decided request so history shows a realistic audit trail
  await prisma.approvalItem.upsert({
    where: { reference: 'PO-211' },
    create: {
      reference: 'PO-211',
      category: 'PROCUREMENT',
      title: 'Term 3 textbooks · Kamembe N&P',
      requester: 'Eric Nkurunziza',
      requesterRole: 'Head teacher · Kamembe N&P',
      amount: 2_100_000,
      description: 'P6 textbooks and teachers guides for Term 3.',
      dueDate: daysFromNow(-2),
      priority: 'MEDIUM',
      workflowSteps: JSON.stringify([
        { name: 'Requisition raised', status: 'done' },
        { name: 'Director approval', status: 'done' },
      ]),
      attachments: JSON.stringify([]),
      status: 'APPROVED',
      organizationId: null,
    },
    update: {},
  });
  const po211 = await prisma.approvalItem.findUnique({ where: { reference: 'PO-211' } });
  if (po211 && (await prisma.decision.count({ where: { approvalId: po211.id } })) === 0) {
    await prisma.decision.create({
      data: {
        approvalId: po211.id,
        action: 'APPROVED',
        comment: 'Within budget. Proceed.',
        decidedBy: 'seed',
        decidedByName: 'Mr. Muramira',
      },
    });
  }

  // ── notifications ────────────────────────────────────────────────────
  const notifications = [
    {
      category: 'SECURITY',
      title: 'Dining hall camera offline',
      body: 'Kamembe Main · CAM-24 (Dining hall) stopped responding at 06:12. IT technician notified.',
      severity: 'info',
      organizationId: 'demo-km',
      link: '/director/live-campus',
    },
    {
      category: 'FINANCE',
      title: 'Boarding expenditure over budget',
      body: 'Kamembe Secondary · Boarding vote at 96% of plan with 6 weeks of term remaining.',
      severity: 'warning',
      organizationId: 'demo-ks',
      link: '/director/budget',
    },
    {
      category: 'ACADEMIC',
      title: 'S2B Chemistry unassigned',
      body: 'No teacher assigned to S2B Chemistry this week. Assign a cover teacher.',
      severity: 'urgent',
      organizationId: 'demo-ks',
      link: '/director/teaching-now',
    },
    {
      category: 'APPROVAL',
      title: 'Trip request awaiting your decision',
      body: 'TR-088 · S3 study trip to Nyungwe — 78 of 86 consents received.',
      severity: 'warning',
      organizationId: null,
      link: '/director/approvals',
    },
    {
      category: 'STAFF',
      title: 'Leave request submitted',
      body: 'Alice Uwase requested 2 days annual leave (28–29 Oct) with cover confirmed.',
      severity: 'info',
      organizationId: 'demo-km',
      link: '/director/hr',
    },
    {
      category: 'SYSTEM',
      title: 'Daily briefing ready',
      body: 'Your director daily briefing for today has been prepared.',
      severity: 'info',
      organizationId: null,
      link: '/director/briefing',
      read: true,
    },
  ];
  for (const n of notifications) {
    const existing = await prisma.notificationItem.findFirst({ where: { title: n.title } });
    if (!existing) {
      await prisma.notificationItem.create({ data: n });
    }
  }

  // ── incidents ────────────────────────────────────────────────────────
  const incidents = [
    {
      type: 'CAMERA',
      title: 'Dining hall camera offline',
      description: 'CAM-24 stopped responding 06:12. PoE switch port suspected. IT ticket opened.',
      priority: 'MEDIUM',
      status: 'INVESTIGATING',
      assignedTo: 'IT support',
      organizationId: 'demo-km',
    },
    {
      type: 'SECURITY',
      title: 'Unknown visitor at Gate B',
      description:
        'Visitor without appointment attempted entry at 11:20. Turned away and logged by guard Emmanuel Ndayisaba.',
      priority: 'HIGH',
      status: 'RESOLVED',
      assignedTo: 'Security',
      organizationId: 'demo-km',
    },
    {
      type: 'TRANSPORT',
      title: 'Bus 2 delayed on Nkanka route',
      description: 'Bus 2 running ~12 min late due to road works near Nkanka junction. Parents notified.',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedTo: 'Transport',
      organizationId: null,
    },
  ];
  for (const i of incidents) {
    const existing = await prisma.incident.findFirst({ where: { title: i.title } });
    if (!existing) {
      await prisma.incident.create({ data: i });
    }
  }

  // ── action plan tasks ─────────────────────────────────────────────────
  const tasks = [
    {
      title: 'Fix S2B Chemistry teacher assignment',
      description: 'Assign a permanent teacher or weekly cover for S2B Chemistry.',
      owner: 'Director of Studies',
      ownerRole: 'Josiane Uwera',
      priority: 'HIGH',
      category: 'ACADEMICS',
      dueDate: daysFromNow(2),
      status: 'IN_PROGRESS',
      progress: 40,
    },
    {
      title: 'Follow up boarding budget overrun',
      description: 'Review supplier prices with the bursar and decide on BR-031 reallocation.',
      owner: 'Chief Accountant',
      ownerRole: 'Finance',
      priority: 'URGENT',
      category: 'FINANCE',
      dueDate: daysFromNow(1),
      status: 'OPEN',
      progress: 0,
    },
    {
      title: 'Publish Term 3 mid-term results',
      description: 'Verify marking completion above 95% then publish via Circulars.',
      owner: 'Director of Studies',
      ownerRole: 'Josiane Uwera',
      priority: 'MEDIUM',
      category: 'ACADEMICS',
      dueDate: daysFromNow(-3),
      status: 'IN_PROGRESS',
      progress: 75,
    },
    {
      title: 'Review Gashonga fee collection plan',
      description: 'Gashonga collection at 63% — meet branch manager on remediation.',
      owner: 'Branch Manager',
      ownerRole: 'Peace Umuhoza',
      priority: 'HIGH',
      category: 'FINANCE',
      dueDate: daysFromNow(5),
      status: 'OPEN',
      progress: 0,
    },
    {
      title: 'Close camera maintenance ticket',
      description: 'Confirm CAM-24 restoration and test recording retention.',
      owner: 'IT Support',
      ownerRole: 'Operations',
      priority: 'MEDIUM',
      category: 'OPERATIONS',
      dueDate: daysFromNow(-1),
      status: 'IN_PROGRESS',
      progress: 60,
    },
  ];
  for (const t of tasks) {
    const existing = await prisma.taskItem.findFirst({ where: { title: t.title } });
    if (!existing) {
      await prisma.taskItem.create({ data: t });
    }
  }

  // ── leadership meetings ───────────────────────────────────────────────
  const meetings = [
    {
      title: 'Term 3 leadership review',
      description: 'Branch performance, fee collection and staffing decisions for Term 3.',
      agenda: JSON.stringify([
        'Term 3 results and pass rate by branch',
        'Fee collection recovery plan',
        'Staffing gaps and cover arrangements',
      ]),
      location: 'Boardroom, Kamembe',
      meetingDate: daysFromNow(3),
      startTime: '09:00',
      endTime: '11:00',
      participants: JSON.stringify([
        'Director',
        'Head Teacher',
        'Director of Studies',
        'Chief Accountant',
      ]),
      status: 'SCHEDULED',
      createdByName: 'Director',
    },
    {
      title: 'Finance and budget committee',
      description: 'Review boarding overrun and approve the maintenance vote reallocation.',
      agenda: JSON.stringify([
        'Boarding food cost variance',
        'Maintenance vote reallocation',
        'Term 1 2027 fee structure preview',
      ]),
      location: 'Finance office',
      meetingDate: daysFromNow(7),
      startTime: '14:00',
      endTime: '15:30',
      participants: JSON.stringify(['Director', 'Chief Accountant', 'Bursar']),
      status: 'SCHEDULED',
      createdByName: 'Chief Accountant',
    },
    {
      title: 'Parents consultative meeting',
      description: 'Term 3 parent engagement and results release briefing.',
      agenda: JSON.stringify(['Results release plan', 'Fees and requirements', 'Parent questions']),
      location: 'Main hall, Kamembe',
      meetingDate: daysFromNow(-12),
      startTime: '10:00',
      endTime: '12:00',
      participants: JSON.stringify(['Director', 'Head Teacher', 'Parent representatives']),
      status: 'COMPLETED',
      createdByName: 'Head Teacher',
    },
  ];
  for (const m of meetings) {
    const existing = await prisma.meeting.findFirst({ where: { title: m.title } });
    if (!existing) {
      await prisma.meeting.create({ data: m });
    }
  }

  const counts = {
    approvals: await prisma.approvalItem.count(),
    notifications: await prisma.notificationItem.count(),
    incidents: await prisma.incident.count(),
    tasks: await prisma.taskItem.count(),
    meetings: await prisma.meeting.count(),
  };
  console.log('[seed] Director console seeded:', counts);
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

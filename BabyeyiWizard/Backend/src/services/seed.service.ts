import { prisma } from '../config/database';
import {
  DEFAULT_REQUIREMENTS,
  NESA_LIMITS,
  SYSTEM_TEMPLATES,
} from '../constants/babyeyi';

export class SeedService {
  async seedTenantData(organizationId: string, organizationName?: string) {
    await this.seedRequirementCatalog();
    await this.seedNesaLimits();
    await this.seedSystemTemplates();

    const existingProfile = await prisma.schoolProfile.findUnique({
      where: { organizationId },
    });

    if (!existingProfile) {
      await prisma.schoolProfile.create({
        data: {
          organizationId,
          schoolName: organizationName ?? 'Demo School',
          schoolCode: `SCH-${organizationId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
          ownershipType: 'GOVERNMENT',
          academicYear: '2025-2026',
          principalName: 'Dr. Jean Baptiste',
          province: 'Kigali City',
          district: 'Gasabo',
          sector: 'Remera',
          verificationStatus: 'verified',
          schoolStatus: 'active',
        },
      });
    }

    const circularCount = await prisma.circular.count({ where: { organizationId } });
    if (circularCount === 0) {
      await this.seedSampleCirculars(organizationId);
    }
  }

  async seedRequirementCatalog() {
    const count = await prisma.requirementCatalog.count();
    if (count > 0) return;
    await prisma.requirementCatalog.createMany({
      data: DEFAULT_REQUIREMENTS.map((r) => ({
        name: r.name,
        description: r.description,
        quantity: r.quantity,
      })),
    });
  }

  async seedNesaLimits() {
    const count = await prisma.nesaFeeLimit.count();
    if (count > 0) return;
    const rows: Array<{ level: string; term: string; category: string; limitRwf: number }> = [];
    for (const [level, terms] of Object.entries(NESA_LIMITS)) {
      for (const [term, limit] of Object.entries(terms)) {
        for (const category of ['Public', 'Boarding', 'TVET']) {
          rows.push({ level, term, category, limitRwf: limit });
        }
      }
    }
    await prisma.nesaFeeLimit.createMany({ data: rows });
  }

  async seedSystemTemplates() {
    const count = await prisma.template.count({ where: { isSystem: true } });
    if (count > 0) return;
    await prisma.template.createMany({
      data: SYSTEM_TEMPLATES.map((t) => ({
        ...t,
        isSystem: true,
        description: `Standard ${t.name} template for quick circular creation`,
        previewData: {
          payments: [{ name: 'Tuition', amount: 8500, pay_channel: 'school' }],
          requirements: DEFAULT_REQUIREMENTS.slice(0, 3),
        },
      })),
    });
  }

  private async seedSampleCirculars(organizationId: string) {
    const samples = [
      {
        className: 'P4',
        term: 'Term 1',
        status: 'PUBLISHED' as const,
        schoolCategory: 'Public',
        payments: [
          { name: 'Tuition', amount: 8500, pay_channel: 'school' },
          { name: 'Development fee', amount: 2000, pay_channel: 'school' },
        ],
        downloadCount: 142,
        viewCount: 389,
        qrScanCount: 256,
      },
      {
        className: 'S3',
        term: 'Term 2',
        status: 'APPROVED' as const,
        schoolCategory: 'Public',
        payments: [{ name: 'Tuition', amount: 12000, pay_channel: 'school' }],
        downloadCount: 87,
        viewCount: 201,
        qrScanCount: 134,
      },
      {
        className: 'P6',
        term: 'Term 1',
        status: 'PENDING' as const,
        schoolCategory: 'Boarding',
        payments: [{ name: 'Tuition', amount: 15000, pay_channel: 'school' }],
        requestIncrease: true,
        increaseReason: 'Boarding facility upgrade',
      },
      {
        className: 'S1',
        term: 'Term 3',
        status: 'DRAFT' as const,
        schoolCategory: 'Public',
        payments: [{ name: 'Tuition', amount: 12000, pay_channel: 'school' }],
      },
      {
        className: 'P5',
        term: 'Term 2',
        status: 'REJECTED' as const,
        schoolCategory: 'Public',
        payments: [{ name: 'Tuition', amount: 20000, pay_channel: 'school' }],
        requestIncrease: true,
      },
    ];

    for (const sample of samples) {
      const totalFee = sample.payments.reduce((s, p) => s + p.amount, 0);
      const circular = await prisma.circular.create({
        data: {
          organizationId,
          academicYear: '2025-2026',
          term: sample.term,
          className: sample.className,
          classes: [sample.className],
          schoolCategory: sample.schoolCategory,
          ownershipType: 'Government',
          payments: sample.payments,
          requirements: DEFAULT_REQUIREMENTS.slice(0, 4).map((r) => ({
            item: r.name,
            description: r.description,
            quantity: r.quantity,
            pay_channel: 'babyeyi',
            cost: 0,
          })),
          banks: [
            {
              bank_name: 'Bank of Kigali',
              account_no: '1234567890',
              account_name: 'Demo School',
              is_primary: true,
            },
          ],
          leaders: [
            { name: 'Dr. Jean Baptiste', role: 'Head Teacher', phone: '+250788000001', email: 'head@school.rw' },
            { name: 'Marie Claire', role: 'Accountant', phone: '+250788000002', email: 'accountant@school.rw' },
          ],
          status: sample.status,
          totalFee,
          downloadCount: sample.downloadCount ?? 0,
          viewCount: sample.viewCount ?? 0,
          qrScanCount: sample.qrScanCount ?? 0,
          requestIncrease: sample.requestIncrease ?? false,
          increaseReason: sample.increaseReason,
          authorName: 'School Secretary',
          publishedAt: sample.status === 'PUBLISHED' ? new Date() : null,
          publishedBy: sample.status === 'PUBLISHED' ? 'Director' : null,
          qrHash: sample.status === 'PUBLISHED' ? 'abc123def4567890' : null,
        },
      });

      await prisma.circularActivity.createMany({
        data: [
          { circularId: circular.id, eventType: 'created', description: `Circular for ${sample.className} created`, actorName: 'Secretary' },
          ...(sample.status !== 'DRAFT'
            ? [{ circularId: circular.id, eventType: 'submitted', description: 'Submitted for approval', actorName: 'Secretary' }]
            : []),
          ...(sample.status === 'PUBLISHED' || sample.status === 'APPROVED'
            ? [{ circularId: circular.id, eventType: 'approved', description: 'Director approved', actorName: 'Director' }]
            : []),
          ...(sample.status === 'PUBLISHED'
            ? [
                { circularId: circular.id, eventType: 'published', description: 'Circular published', actorName: 'Director' },
                { circularId: circular.id, eventType: 'qr_generated', description: 'QR code generated', actorName: 'System' },
              ]
            : []),
        ],
      });

      if (sample.status === 'PENDING') {
        await prisma.circularApproval.createMany({
          data: [
            { circularId: circular.id, stage: 'DIRECTOR', action: 'APPROVED', approverName: 'Director', actedAt: new Date() },
            { circularId: circular.id, stage: 'ACCOUNTANT', action: 'PENDING' },
            { circularId: circular.id, stage: 'DISTRICT', action: 'PENDING' },
            { circularId: circular.id, stage: 'NESA', action: 'PENDING' },
          ],
        });
      }
    }

    await prisma.notification.createMany({
      data: [
        { organizationId, type: 'CIRCULAR_PUBLISHED', title: 'Circular Published', message: 'P4 Term 1 circular is now live for parents' },
        { organizationId, type: 'DIRECTOR_APPROVED', title: 'Director Approved', message: 'S3 circular approved by Director' },
        { organizationId, type: 'QR_GENERATED', title: 'QR Generated', message: 'QR verification code ready for P4 circular' },
        { organizationId, type: 'PARENT_DOWNLOADED', title: 'Parent Downloaded', message: 'A parent downloaded the P4 circular PDF' },
        { organizationId, type: 'REMINDER', title: 'Pending Approval', message: 'P6 circular awaiting district review', isRead: false },
      ],
    });
  }
}

export const seedService = new SeedService();

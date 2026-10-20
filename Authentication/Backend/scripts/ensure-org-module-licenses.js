const { PrismaClient, ModuleAssignmentStatus } = require('../src/generated/prisma');

const prisma = new PrismaClient();

/** Ensure these exist in Module Catalog with correct local URLs/slugs */
const ENSURE_CATALOG = [
  {
    slug: 'timetable',
    name: 'Timetable',
    shortName: 'TT',
    category: 'Education',
    frontendUrl: 'http://localhost:3011',
    backendUrl: 'http://localhost:3010',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'teacher-portal',
    name: 'Teacher Portal',
    shortName: 'TP',
    category: 'Education',
    frontendUrl: 'http://localhost:5173',
    backendUrl: 'http://localhost:4000',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'task-module',
    name: 'Task MIS',
    shortName: 'Task',
    category: 'Productivity',
    frontendUrl: 'http://localhost:3004',
    backendUrl: 'http://localhost:3003',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'procurement-mis',
    name: 'Procurement MIS',
    shortName: 'Proc',
    category: 'Operations',
    frontendUrl: 'http://localhost:3031',
    backendUrl: 'http://localhost:3030',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'student-discipline',
    name: 'Student Discipline',
    shortName: 'SD',
    category: 'Education',
    frontendUrl: 'http://localhost:3033',
    backendUrl: 'http://localhost:3032',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'cafeteria',
    name: 'Cafeteria',
    shortName: 'Cafe',
    category: 'Operations',
    frontendUrl: 'http://localhost:3005',
    backendUrl: 'http://localhost:3007',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'school-budget',
    name: 'School Budget',
    shortName: 'Budget',
    category: 'Finance',
    frontendUrl: 'http://localhost:3023',
    backendUrl: 'http://localhost:3022',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'action-plan',
    name: 'Action Plan MIS',
    shortName: 'AP',
    category: 'Productivity',
    frontendUrl: 'http://localhost:3035',
    backendUrl: 'http://localhost:3034',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'hr',
    name: 'HR Management',
    shortName: 'HR',
    category: 'Human Resources',
    frontendUrl: 'http://localhost:3006',
    backendUrl: 'http://localhost:3005',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'attendance',
    name: 'Digital Attendance',
    shortName: 'Digital',
    category: 'Education',
    frontendUrl: 'http://localhost:3025',
    backendUrl: 'http://localhost:3024',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'transport',
    name: 'Smart Transport',
    shortName: 'Transport',
    category: 'Operations',
    frontendUrl: 'http://localhost:3065',
    backendUrl: 'http://localhost:3064',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'payroll',
    name: 'Payroll',
    shortName: 'Pay',
    category: 'Finance',
    frontendUrl: 'http://localhost:3008',
    backendUrl: 'http://localhost:3007',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'parent-mis',
    name: 'Parent MIS',
    shortName: 'Parent',
    category: 'Communication',
    frontendUrl: 'http://localhost:3009',
    backendUrl: 'http://localhost:3003',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'babyeyi',
    name: 'Babyeyi Wizard',
    shortName: 'Babyeyi',
    category: 'Communication',
    frontendUrl: 'http://localhost:3013',
    backendUrl: 'http://localhost:3012/api',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'shulekit-mis',
    name: 'ShuleKit',
    shortName: 'ShuleKit',
    category: 'Operations',
    frontendUrl: 'http://localhost:3039',
    backendUrl: 'http://localhost:3038/api',
    healthCheckUrl: '/health',
    /** Platform-owned: catalog only — never auto-license to schools. */
    platformOwned: true,
  },
];

const PLATFORM_OWNED_SLUGS = new Set(
  ENSURE_CATALOG.filter((m) => m.platformOwned).map((m) => m.slug)
);

async function main() {
  console.log('\n=== 1) ENSURE CATALOG ENTRIES ===');
  for (const mod of ENSURE_CATALOG) {
    const row = await prisma.platformModule.upsert({
      where: { slug: mod.slug },
      update: {
        name: mod.name,
        shortName: mod.shortName,
        category: mod.category,
        frontendUrl: mod.frontendUrl,
        backendUrl: mod.backendUrl,
        healthCheckUrl: mod.healthCheckUrl,
        isEnabled: true,
        maintenanceMode: false,
        ...(mod.platformOwned
          ? { visibleInMarketplace: false, isCore: true }
          : {}),
      },
      create: {
        slug: mod.slug,
        name: mod.name,
        shortName: mod.shortName,
        category: mod.category,
        frontendUrl: mod.frontendUrl,
        backendUrl: mod.backendUrl,
        healthCheckUrl: mod.healthCheckUrl,
        isEnabled: true,
        version: '1.0.0',
        ...(mod.platformOwned
          ? { visibleInMarketplace: false, isCore: true }
          : {}),
      },
    });
    console.log(`catalog: ${row.slug}${mod.platformOwned ? ' (platform-owned)' : ''}`);
  }

  const orgs = await prisma.organization.findMany({
    select: { id: true, slug: true, name: true, type: true },
    orderBy: { slug: 'asc' },
  });
  console.log('\n=== ORGANIZATIONS ===');
  console.log(orgs.map((o) => `${o.slug}`).join(', ') || '(none)');

  const schoolOrgs = orgs.filter(
    (o) => o.slug !== 'babyeyi-platform' && o.slug !== 'shuleplus-platform'
  );
  if (!schoolOrgs.length) {
    console.log('No school organizations found.');
    return;
  }

  const catalog = await prisma.platformModule.findMany({
    where: { isEnabled: true, slug: { notIn: [...PLATFORM_OWNED_SLUGS] } },
    select: { id: true, slug: true, name: true },
    orderBy: { slug: 'asc' },
  });

  console.log('\n=== 1b) UNASSIGN PLATFORM-OWNED MODULES FROM SCHOOLS ===');
  for (const slug of PLATFORM_OWNED_SLUGS) {
    const mod = await prisma.platformModule.findUnique({ where: { slug } });
    if (!mod) continue;
    const schoolOrgIds = schoolOrgs.map((o) => o.id);
    const deletedOrg = await prisma.organizationModule.deleteMany({
      where: { moduleId: mod.id, organizationId: { in: schoolOrgIds } },
    });
    const deletedUser = await prisma.userModule.deleteMany({
      where: { moduleId: mod.id, organizationId: { in: schoolOrgIds } },
    });
    console.log(
      `${slug}: removed ${deletedOrg.count} org licenses, ${deletedUser.count} user links`
    );
  }

  console.log('\n=== 2) LICENSE ALL ENABLED (NON-PLATFORM) MODULES TO SCHOOL ORGS ===');
  for (const org of schoolOrgs) {
    for (const m of catalog) {
      await prisma.organizationModule.upsert({
        where: {
          organizationId_moduleId: { organizationId: org.id, moduleId: m.id },
        },
        update: {
          status: ModuleAssignmentStatus.ACTIVE,
          // Keep existing tenantProvisioned; never fake-true without /tenant/create.
        },
        create: {
          organizationId: org.id,
          moduleId: m.id,
          status: ModuleAssignmentStatus.ACTIVE,
          // Real tenant create required in each module DB (Super Admin → Provisioning).
          tenantProvisioned: false,
          activatedAt: new Date(),
        },
      });
    }
    console.log(`${org.slug}: licensed ${catalog.length} modules`);

    const orgUsers = await prisma.user.findMany({
      where: { organizationId: org.id, status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        userRoles: { select: { role: { select: { slug: true } } } },
      },
    });

    for (const user of orgUsers) {
      for (const m of catalog) {
        await prisma.userModule.upsert({
          where: { userId_moduleId: { userId: user.id, moduleId: m.id } },
          update: {},
          create: {
            userId: user.id,
            organizationId: org.id,
            moduleId: m.id,
          },
        });
      }
      const roles = user.userRoles.map((r) => r.role.slug).join(',') || 'no-role';
      console.log(`  user ${user.email} [${roles}] → ${catalog.length} modules`);
    }
  }

  console.log('\n=== 3) VERIFY timetable + teacher-portal ===');
  for (const org of schoolOrgs) {
    for (const slug of ['timetable', 'teacher-portal']) {
      const row = await prisma.organizationModule.findFirst({
        where: {
          organizationId: org.id,
          status: ModuleAssignmentStatus.ACTIVE,
          module: { slug },
        },
        include: { module: { select: { slug: true, frontendUrl: true } } },
      });
      console.log(
        row
          ? `OK ${org.slug} / ${slug} → ${row.module.frontendUrl}`
          : `MISSING ${org.slug} / ${slug}`
      );
    }
  }

  console.log('\n=== 4) PROVISION MODULE TENANTS (real /tenant/create) ===');
  console.log('Run: node scripts/provision-all-module-tenants.js');
  console.log('Or Super Admin → Provisioning → Provision all pending / Repair all.');
  console.log('\nDone. Log out and log in again as Organization Admin, then relaunch modules.');
  console.log('Note: Super Admin / Root Admin JWT has empty modules[] by design — use an Org Admin account.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

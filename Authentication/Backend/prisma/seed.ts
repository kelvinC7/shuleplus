import { PrismaClient, OrganizationStatus, UserStatus, ModuleAssignmentStatus } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const PLATFORM_ORG_SLUG = 'babyeyi-platform';

const ROLES = {
  ROOT_ADMIN: 'root_admin',
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  ORGANIZATION_MEMBER: 'organization_member',
  MODULE_OPERATOR: 'module_operator',
  SCHOOL_REPRESENTATIVE: 'school_representative',
  CHIEF_ACCOUNTANT: 'chief_accountant',
};

const ROOT_ADMIN_PERMISSIONS = [
  'platform.super_admins.create',
  'platform.organizations.enable',
  'platform.organizations.disable',
  'platform.organizations.suspend',
  'platform.organizations.archive',
  'platform.modules.enable',
  'platform.modules.disable',
  'platform.analytics.view',
  'platform.audit.view',
  'platform.emergency.control',
  'platform.subscriptions.manage',
  'platform.settings.manage',
];

const SUPER_ADMIN_PERMISSIONS = [
  'organizations.manage',
  'modules.manage',
  'users.manage',
  'reports.view',
  'roles.manage',
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const env = {
  ROOT_ADMIN_EMAIL: process.env.ROOT_ADMIN_EMAIL,
  ROOT_ADMIN_PASSWORD: process.env.ROOT_ADMIN_PASSWORD,
  ROOT_ADMIN_FIRST_NAME: process.env.ROOT_ADMIN_FIRST_NAME,
  ROOT_ADMIN_LAST_NAME: process.env.ROOT_ADMIN_LAST_NAME,
  ROOT_ADMIN_PHONE: process.env.ROOT_ADMIN_PHONE,
};

export const SAINT_THEO_ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const SAINT_THEO_ORG_SLUG = 'saint-theo-school';

const PLATFORM_MODULES = [
  {
    slug: 'academic',
    name: 'Academic Module',
    shortName: 'Academic',
    category: 'Education',
    version: '2.4.1',
    description: 'Students, classes, academics',
    isCore: true,
    frontendUrl: 'http://localhost:3004',
    backendUrl: 'http://localhost:3003',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'student-management',
    name: 'Student Management',
    shortName: 'Students',
    category: 'Education',
    version: '1.0.0',
    description: 'Student master data, enrollments, classes, exams and marks',
    isCore: true,
    frontendUrl: 'http://localhost:3053',
    backendUrl: 'http://localhost:3052',
    healthCheckUrl: '/api/health',
  },
  { slug: 'attendance', name: 'Digital Attendance', shortName: 'Digital', category: 'Education', version: '1.0.0', description: 'Entry and exit logs, devices, and live presence.', isCore: false, frontendUrl: 'http://localhost:3025', backendUrl: 'http://localhost:3024/api', healthCheckUrl: '/health' },
  { slug: 'transport', name: 'Smart Transport', shortName: 'Transport', category: 'Operations', version: '1.0.0', description: 'RFID boarding, live trips, GPS, parent alerts and student safety', isCore: false, frontendUrl: 'http://localhost:3065', backendUrl: 'http://localhost:3064/api', healthCheckUrl: '/health' },
  {
    slug: 'school-fees',
    name: 'School Fees',
    shortName: 'Fees',
    category: 'Finance',
    version: '2.1.0',
    description: 'Student fee structures, billing, payments, and collections',
    isCore: false,
    frontendUrl: 'http://localhost:3015',
    backendUrl: 'http://localhost:3014',
    healthCheckUrl: '/api/health',
  },
  { slug: 'inventory', name: 'Inventory', shortName: 'Inventory', category: 'Operations', version: '1.3.0', description: 'Asset inventory', isPremium: false },
  {
    slug: 'school-uniform',
    name: 'School Uniform MIS',
    shortName: 'Uniform',
    category: 'Operations',
    version: '1.0.0',
    description: 'Uniforms, fabric, inventory, sales and student distribution',
    isPremium: false,
    frontendUrl: 'http://localhost:3050',
    backendUrl: 'http://localhost:3051',
    healthCheckUrl: '/api/health',
  },
  { slug: 'library', name: 'Library', shortName: 'Library', category: 'Education', version: '1.0.0', description: 'Smart school library management', isPremium: false, frontendUrl: 'http://localhost:3061', backendUrl: 'http://localhost:3060', healthCheckUrl: '/api/health' },
  {
    slug: 'sample-module',
    name: 'Sample Module',
    shortName: 'Sample',
    category: 'Productivity',
    version: '1.0.0',
    description: 'Sample productivity microservice for demonstration',
    isPremium: false,
    visibleInMarketplace: false,
    frontendUrl: 'http://localhost:3004',
    backendUrl: 'http://localhost:3003',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'action-plan',
    name: 'Action Plan Management',
    shortName: 'AP',
    category: 'Productivity',
    version: '1.0.0',
    description: 'Enterprise action plan tracking, approval workflows, KPIs, and reporting',
    isPremium: false,
    frontendUrl: 'http://localhost:3035',
    backendUrl: 'http://localhost:3034',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'nesa',
    name: 'NESA Dashboard',
    shortName: 'NESA',
    category: 'Governance',
    version: '1.0.0',
    description: 'National Education Standards Authority console',
    isPremium: false,
    visibleInMarketplace: false,
    frontendUrl: 'http://localhost:3015',
    backendUrl: 'http://localhost:3014/api',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'assets-portal',
    name: 'Assets Portal',
    shortName: 'Assets',
    category: 'Operations',
    version: '1.0.0',
    description: 'KPS-style asset register, depreciation, operations & reports',
    isPremium: false,
    frontendUrl: 'http://localhost:3021',
    backendUrl: 'http://localhost:3020/api',
    healthCheckUrl: '/health',
  },
  {
    slug: 'school-budget',
    name: 'School Budget',
    shortName: 'Budget',
    category: 'Finance',
    version: '1.0.0',
    description: 'School budget planning, expense allocation, usage tracking and approvals',
    isPremium: false,
    frontendUrl: 'http://localhost:3023',
    backendUrl: 'http://localhost:3022/api',
    healthCheckUrl: '/health',
  },
  {
    slug: 'shulekit-mis',
    name: 'ShuleKit',
    shortName: 'ShuleKit',
    category: 'Operations',
    version: '1.0.0',
    description: 'Platform-owned materials kits — Super Admin catalog, parent Standard/Custom orders',
    isPremium: false,
    isCore: true,
    visibleInMarketplace: false,
    frontendUrl: 'http://localhost:3039',
    backendUrl: 'http://localhost:3038/api',
    healthCheckUrl: '/health',
  },
  {
    slug: 'canteen',
    name: 'School Canteen',
    shortName: 'Canteen',
    category: 'Operations',
    version: '1.0.0',
    description: 'School canteen & cafeteria — menus, orders, inventory, student wallets and delivery',
    isPremium: true,
    isCore: false,
    frontendUrl: 'http://localhost:3050',
    backendUrl: 'http://localhost:3051',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'mini-website',
    name: 'School Mini-Website',
    shortName: 'Website',
    category: 'Intelligence',
    version: '1.0.0',
    description: 'Publish a simple school website for news, admissions, galleries and contact — ready for parents and visitors',
    isPremium: true,
    isCore: false,
    frontendUrl: 'http://localhost:3054',
    backendUrl: 'http://localhost:3055/api',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'shulechat',
    name: 'ShuleChat',
    shortName: 'Chat',
    category: 'Communication',
    version: '1.0.0',
    description: 'Secure in-app messaging for teachers, parents and staff — direct messages, group chats and announcements',
    isPremium: true,
    isCore: false,
    frontendUrl: 'http://localhost:3054',
    backendUrl: 'http://localhost:3055',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'print-card',
    name: 'Print Card',
    shortName: 'Print Card',
    category: 'Operations',
    version: '1.0.0',
    description: 'Manage, preview, print, and track student and staff smart cards',
    isCore: false,
    isPremium: false,
    visibleInMarketplace: false,
    frontendUrl: 'http://localhost:3092',
    backendUrl: 'http://localhost:3093/api',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'sector-mis',
    name: 'Sector MIS',
    shortName: 'SEI',
    category: 'Governance',
    version: '1.0.0',
    description: 'SEI Attendance Intelligence — sector command center, monitoring, analytics, and follow-up',
    isCore: false,
    isPremium: false,
    visibleInMarketplace: false,
    frontendUrl: 'http://localhost:3071',
    backendUrl: 'http://localhost:3070',
    healthCheckUrl: '/api/health',
  },
  {
    slug: 'deo-mis',
    name: 'District MIS',
    shortName: 'DEO',
    category: 'Governance',
    version: '1.0.0',
    description: 'District Education Officer attendance intelligence — sectors, schools, analytics',
    isCore: false,
    isPremium: false,
    visibleInMarketplace: false,
    frontendUrl: 'http://localhost:3073',
    backendUrl: 'http://localhost:3072',
    healthCheckUrl: '/api/health',
  },
];

export async function seedPlatform(prisma: PrismaClient) {
  const platformOrg = await prisma.organization.upsert({
    where: { slug: PLATFORM_ORG_SLUG },
    update: {},
    create: {
      name: 'Babyeyi Platform',
      slug: PLATFORM_ORG_SLUG,
      type: 'OTHER',
      status: OrganizationStatus.ACTIVE,
      email: 'platform@babyeyi.com',
      modules: [],
    },
  });

  await prisma.platformSettings.upsert({
    where: { id: 'platform' },
    update: {},
    create: { id: 'platform' },
  });

  for (const mod of PLATFORM_MODULES) {
    await prisma.platformModule.upsert({
      where: { slug: mod.slug },
      update: {
        name: mod.name,
        shortName: mod.shortName,
        category: mod.category,
        version: mod.version,
        description: mod.description,
        isCore: mod.isCore ?? false,
        isPremium: mod.isPremium ?? false,
        ...('visibleInMarketplace' in mod && typeof (mod as { visibleInMarketplace?: boolean }).visibleInMarketplace === 'boolean'
          ? { visibleInMarketplace: (mod as { visibleInMarketplace: boolean }).visibleInMarketplace }
          : {}),
        // URLs: only set on create. Production URLs come from scripts/apply-module-subdomains.mjs
        // or Super Admin → Module Catalog. Re-seeding must not revert shuleplus.rw → localhost.
      },
      create: {
        slug: mod.slug,
        name: mod.name,
        shortName: mod.shortName,
        category: mod.category,
        version: mod.version,
        description: mod.description,
        isCore: mod.isCore ?? false,
        ...('visibleInMarketplace' in mod && typeof (mod as { visibleInMarketplace?: boolean }).visibleInMarketplace === 'boolean'
          ? { visibleInMarketplace: (mod as { visibleInMarketplace: boolean }).visibleInMarketplace }
          : {}),
        isPremium: mod.isPremium ?? false,
        frontendUrl: 'frontendUrl' in mod ? mod.frontendUrl : undefined,
        backendUrl: 'backendUrl' in mod ? mod.backendUrl : undefined,
        healthCheckUrl: 'healthCheckUrl' in mod ? mod.healthCheckUrl : undefined,
      },
    });
  }

  // Manual modules (hr, payroll, teacher-portal) are managed via Module Catalog only.
  // Do not delete them here — bootstrap runs on every server start and would wipe admin-created entries.

  const academic = await prisma.platformModule.findUnique({ where: { slug: 'academic' } });
  const library = await prisma.platformModule.findUnique({ where: { slug: 'library' } });

  if (library && academic) {
    await prisma.moduleDependency.upsert({
      where: { moduleId_dependsOnModuleId: { moduleId: library.id, dependsOnModuleId: academic.id } },
      update: {},
      create: { moduleId: library.id, dependsOnModuleId: academic.id },
    });
  }

  const allPermissions = [
    ...ROOT_ADMIN_PERMISSIONS.map((name) => {
      const [module, ...rest] = name.split('.');
      return { name, module, action: rest.join('.') };
    }),
    ...SUPER_ADMIN_PERMISSIONS.map((name) => {
      const [module, ...rest] = name.split('.');
      return { name, module, action: rest.join('.') };
    }),
  ];

  for (const perm of allPermissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: {
        name: perm.name,
        module: perm.module,
        action: perm.action,
        description: perm.name,
      },
    });
  }

  const rootAdminRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: platformOrg.id, slug: ROLES.ROOT_ADMIN } },
    update: { isSystem: true, hierarchyLevel: 1000, dataScope: 'GLOBAL' },
    create: {
      organizationId: platformOrg.id,
      name: 'Root Administrator',
      slug: ROLES.ROOT_ADMIN,
      description: 'Highest platform authority — seed only',
      hierarchyLevel: 1000,
      isSystem: true,
      dataScope: 'GLOBAL',
    },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: platformOrg.id, slug: ROLES.SUPER_ADMIN } },
    update: { isSystem: true, hierarchyLevel: 900, dataScope: 'GLOBAL' },
    create: {
      organizationId: platformOrg.id,
      name: 'Super Administrator',
      slug: ROLES.SUPER_ADMIN,
      description: 'Platform super admin — created by ROOT_ADMIN',
      hierarchyLevel: 900,
      isSystem: true,
      dataScope: 'GLOBAL',
    },
  });

  await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: platformOrg.id, slug: ROLES.MODULE_OPERATOR } },
    update: { isSystem: true, hierarchyLevel: 100, dataScope: 'GLOBAL' },
    create: {
      organizationId: platformOrg.id,
      name: 'Module Operator',
      slug: ROLES.MODULE_OPERATOR,
      description: 'National/system user with direct module access',
      hierarchyLevel: 100,
      isSystem: true,
      dataScope: 'GLOBAL',
    },
  });

  await prisma.role.upsert({
    where: {
      organizationId_slug: { organizationId: platformOrg.id, slug: ROLES.SCHOOL_REPRESENTATIVE },
    },
    update: { isSystem: true, hierarchyLevel: 150, dataScope: 'GLOBAL' },
    create: {
      organizationId: platformOrg.id,
      name: 'School Representative',
      slug: ROLES.SCHOOL_REPRESENTATIVE,
      description: 'Multi-school oversight representative',
      hierarchyLevel: 150,
      isSystem: true,
      dataScope: 'GLOBAL',
    },
  });

  await prisma.role.upsert({
    where: {
      organizationId_slug: { organizationId: platformOrg.id, slug: ROLES.CHIEF_ACCOUNTANT },
    },
    update: { isSystem: true, hierarchyLevel: 145, dataScope: 'GLOBAL' },
    create: {
      organizationId: platformOrg.id,
      name: 'Chief Accountant',
      slug: ROLES.CHIEF_ACCOUNTANT,
      description: 'Multi-school finance chief accountant',
      hierarchyLevel: 145,
      isSystem: true,
      dataScope: 'GLOBAL',
    },
  });

  const rootPerms = await prisma.permission.findMany({
    where: { name: { in: [...ROOT_ADMIN_PERMISSIONS] } },
  });

  const superPerms = await prisma.permission.findMany({
    where: { name: { in: [...SUPER_ADMIN_PERMISSIONS] } },
  });

  for (const perm of rootPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rootAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: rootAdminRole.id, permissionId: perm.id },
    });
  }

  for (const perm of superPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }

  return { platformOrg, rootAdminRole };
}

export async function ensureRootAdmin(prisma: PrismaClient) {
  const { platformOrg, rootAdminRole } = await seedPlatform(prisma);

  if (!env.ROOT_ADMIN_EMAIL || !env.ROOT_ADMIN_PASSWORD) {
    console.warn('[Seed] ROOT_ADMIN_EMAIL/PASSWORD not set — skipping ROOT_ADMIN user creation');
    return;
  }

  const email = env.ROOT_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email, organizationId: platformOrg.id },
  });

  if (existing) {
    console.log('[Seed] ROOT_ADMIN already exists');
    return;
  }

  const passwordHash = await hashPassword(env.ROOT_ADMIN_PASSWORD);

  const user = await prisma.user.create({
    data: {
      organizationId: platformOrg.id,
      email,
      passwordHash,
      firstName: env.ROOT_ADMIN_FIRST_NAME,
      lastName: env.ROOT_ADMIN_LAST_NAME,
      phone: env.ROOT_ADMIN_PHONE || null,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
      mfaEnabled: false,
      userRoles: {
        create: { roleId: rootAdminRole.id },
      },
    },
  });

  console.log(`[Seed] ROOT_ADMIN created: ${user.email} (password change required on first login)`);
}

export async function seedSchool(prisma: PrismaClient) {
  const email = 'admin@sttheo.rw';
  const password = 'Admin@123!Test';

  const org = await prisma.organization.upsert({
    where: { slug: SAINT_THEO_ORG_SLUG },
    update: {},
    create: {
      id: SAINT_THEO_ORG_ID,
      name: 'Saint Theo School',
      slug: SAINT_THEO_ORG_SLUG,
      organizationCode: 'STTHEO',
      type: 'SCHOOL',
      status: OrganizationStatus.ACTIVE,
      email,
      phone: '+250788000001',
      country: 'Rwanda',
      modules: ['academic', 'student-management'],
    },
  });
  console.log(`[Seed] School org created: ${org.name} (${org.id})`);

  const role = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: ROLES.ORGANIZATION_ADMIN } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Organization Administrator',
      slug: ROLES.ORGANIZATION_ADMIN,
      description: 'School-level administrator with full module access',
      hierarchyLevel: 800,
      isSystem: true,
      dataScope: 'ORGANIZATION',
    },
  });
  console.log(`[Seed] Role created: ${role.slug}`);

  const academicModule = await prisma.platformModule.findUnique({ where: { slug: 'academic' } });
  if (!academicModule) throw new Error('Academic module not seeded — run seedPlatform first');

  await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId: org.id, moduleId: academicModule.id } },
    update: { status: ModuleAssignmentStatus.ACTIVE, tenantProvisioned: true },
    create: {
      organizationId: org.id,
      moduleId: academicModule.id,
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
  });
  console.log(`[Seed] Academic module assigned to org`);

  const studentMgmtModule = await prisma.platformModule.findUnique({ where: { slug: 'student-management' } });
  if (studentMgmtModule) {
    await prisma.organizationModule.upsert({
      where: { organizationId_moduleId: { organizationId: org.id, moduleId: studentMgmtModule.id } },
      update: { status: ModuleAssignmentStatus.ACTIVE, tenantProvisioned: true },
      create: {
        organizationId: org.id,
        moduleId: studentMgmtModule.id,
        status: ModuleAssignmentStatus.ACTIVE,
        tenantProvisioned: true,
        tenantProvisionedAt: new Date(),
      },
    });
    console.log(`[Seed] Student Management module assigned to org`);
  }

  const canteenModule = await prisma.platformModule.findUnique({ where: { slug: 'canteen' } });
  if (canteenModule) {
    await prisma.organizationModule.upsert({
      where: { organizationId_moduleId: { organizationId: org.id, moduleId: canteenModule.id } },
      update: { status: ModuleAssignmentStatus.ACTIVE, tenantProvisioned: true },
      create: {
        organizationId: org.id,
        moduleId: canteenModule.id,
        status: ModuleAssignmentStatus.ACTIVE,
        tenantProvisioned: true,
        tenantProvisionedAt: new Date(),
      },
    });
    console.log(`[Seed] Canteen module assigned to org (approved)`);
  } else {
    console.warn('[Seed] Canteen module not found — skipping assignment (run seedPlatform first)');
  }

  const miniWebsiteModule = await prisma.platformModule.findUnique({ where: { slug: 'mini-website' } });
  if (miniWebsiteModule) {
    await prisma.organizationModule.upsert({
      where: { organizationId_moduleId: { organizationId: org.id, moduleId: miniWebsiteModule.id } },
      update: { status: ModuleAssignmentStatus.ACTIVE, tenantProvisioned: true },
      create: {
        organizationId: org.id,
        moduleId: miniWebsiteModule.id,
        status: ModuleAssignmentStatus.ACTIVE,
        tenantProvisioned: true,
        tenantProvisionedAt: new Date(),
      },
    });
    console.log(`[Seed] Mini-Website module assigned to org (approved)`);
  } else {
    console.warn('[Seed] Mini-Website module not found — skipping assignment (run seedPlatform first)');
  }

  const libraryModule = await prisma.platformModule.findUnique({ where: { slug: 'library' } });
  if (libraryModule) {
    await prisma.organizationModule.upsert({
      where: { organizationId_moduleId: { organizationId: org.id, moduleId: libraryModule.id } },
      update: { status: ModuleAssignmentStatus.ACTIVE, tenantProvisioned: true },
      create: {
        organizationId: org.id,
        moduleId: libraryModule.id,
        status: ModuleAssignmentStatus.ACTIVE,
        tenantProvisioned: true,
        tenantProvisionedAt: new Date(),
      },
    });
    console.log(`[Seed] Library module assigned to org (approved)`);
  } else {
    console.warn('[Seed] Library module not found — skipping assignment (run seedPlatform first)');
  }

  const transportModule = await prisma.platformModule.findUnique({ where: { slug: 'transport' } });
  if (transportModule) {
    await prisma.organizationModule.upsert({
      where: { organizationId_moduleId: { organizationId: org.id, moduleId: transportModule.id } },
      update: { status: ModuleAssignmentStatus.ACTIVE, tenantProvisioned: true },
      create: {
        organizationId: org.id,
        moduleId: transportModule.id,
        status: ModuleAssignmentStatus.ACTIVE,
        tenantProvisioned: true,
        tenantProvisionedAt: new Date(),
      },
    });
    console.log(`[Seed] Transport module assigned to org (approved)`);
  } else {
    console.warn('[Seed] Transport module not found — skipping assignment (run seedPlatform first)');
  }

  const existing = await prisma.user.findFirst({
    where: { email, organizationId: org.id },
  });

  if (!existing) {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email,
        passwordHash,
        firstName: 'Saint',
        lastName: 'Theo Admin',
        phone: '+250788000001',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
        mfaEnabled: false,
        userRoles: {
          create: { roleId: role.id },
        },
      },
    });
    console.log(`[Seed] Academic user created: ${user.email} / ${password}`);
  } else {
    console.log(`[Seed] Academic user already exists: ${email}`);
  }

  if (canteenModule) {
    const orgUsers = await prisma.user.findMany({
      where: { organizationId: org.id, status: UserStatus.ACTIVE },
      select: { id: true, email: true },
    });
    for (const u of orgUsers) {
      await prisma.userModule.upsert({
        where: { userId_moduleId: { userId: u.id, moduleId: canteenModule.id } },
        update: { organizationId: org.id },
        create: { userId: u.id, organizationId: org.id, moduleId: canteenModule.id },
      });
    }
    console.log(`[Seed] Canteen module linked to ${orgUsers.length} active user(s)`);
  }

  if (miniWebsiteModule) {
    const orgUsers = await prisma.user.findMany({
      where: { organizationId: org.id, status: UserStatus.ACTIVE },
      select: { id: true, email: true },
    });
    for (const u of orgUsers) {
      await prisma.userModule.upsert({
        where: { userId_moduleId: { userId: u.id, moduleId: miniWebsiteModule.id } },
        update: { organizationId: org.id },
        create: { userId: u.id, organizationId: org.id, moduleId: miniWebsiteModule.id },
      });
    }
    console.log(`[Seed] Mini-Website module linked to ${orgUsers.length} active user(s)`);
  }

  if (libraryModule) {
    const orgUsers = await prisma.user.findMany({
      where: { organizationId: org.id, status: UserStatus.ACTIVE },
      select: { id: true, email: true },
    });
    for (const u of orgUsers) {
      await prisma.userModule.upsert({
        where: { userId_moduleId: { userId: u.id, moduleId: libraryModule.id } },
        update: { organizationId: org.id },
        create: { userId: u.id, organizationId: org.id, moduleId: libraryModule.id },
      });
    }
    console.log(`[Seed] Library module linked to ${orgUsers.length} active user(s)`);
  }

  await syncOrgModulesJson(prisma, org.id);
}

async function syncOrgModulesJson(prisma: PrismaClient, organizationId: string) {
  const active = await prisma.organizationModule.findMany({
    where: { organizationId, status: ModuleAssignmentStatus.ACTIVE, tenantProvisioned: true },
    include: { module: { select: { slug: true } } },
  });
  const slugs = active.map((a) => a.module.slug);
  await prisma.organization.update({
    where: { id: organizationId },
    data: { modules: slugs },
  });
  console.log(`[Seed] Org modules JSON synced → [${slugs.join(', ')}]`);
}

import { PrismaClient, OrganizationStatus, UserStatus, ModuleAssignmentStatus } from '../src/generated/prisma';
import { hashPassword } from '../src/utils/security';
import { PLATFORM_ORG_SLUG, ROLES } from '../src/constants/roles';

const prisma = new PrismaClient();

const INVENTORY_MODULE_SLUG = 'inventory-mis';

const DEMO_ORG = {
  name: 'ShulePlus Demo School',
  slug: 'demo-school',
  code: 'DEMO001',
  type: 'SCHOOL' as const,
  email: 'demo@shuleplus.com',
};

const DEMO_USERS = [
  {
    email: 'admin@demoschool.com',
    password: 'DemoAdmin@2026',
    firstName: 'Demo',
    lastName: 'Admin',
    role: ROLES.ORGANIZATION_ADMIN,
  },
  {
    email: 'storekeeper@demoschool.com',
    password: 'Store@2026',
    firstName: 'John',
    lastName: 'Storekeeper',
    role: ROLES.ORGANIZATION_MEMBER,
  },
  {
    email: 'viewer@demoschool.com',
    password: 'Viewer@2026',
    firstName: 'Jane',
    lastName: 'Viewer',
    role: ROLES.ORGANIZATION_MEMBER,
  },
];

async function main() {
  console.log('[Seed:Inventory] Starting inventory MIS seed...');

  // 1. Ensure the inventory-mis platform module exists
  const invModule = await prisma.platformModule.upsert({
    where: { slug: INVENTORY_MODULE_SLUG },
    update: {
      name: 'Inventory MIS',
      shortName: 'Inventory',
      category: 'Operations',
      version: '1.0.0',
      description: 'Consumable inventory management — stock receiving, issuing, transfers, adjustments',
      isPremium: false,
      isCore: false,
      frontendUrl: 'http://localhost:3004',
      backendUrl: 'http://localhost:3003',
      healthCheckUrl: '/api/health',
    },
    create: {
      slug: INVENTORY_MODULE_SLUG,
      name: 'Inventory MIS',
      shortName: 'Inventory',
      category: 'Operations',
      version: '1.0.0',
      description: 'Consumable inventory management — stock receiving, issuing, transfers, adjustments',
      isPremium: false,
      isCore: false,
      frontendUrl: 'http://localhost:3004',
      backendUrl: 'http://localhost:3003',
      healthCheckUrl: '/api/health',
    },
  });
  console.log(`[Seed:Inventory] Module ready: ${invModule.slug}`);

  // 2. Find the platform org for reference
  const platformOrg = await prisma.organization.findUnique({
    where: { slug: PLATFORM_ORG_SLUG },
  });
  if (!platformOrg) throw new Error('Platform org not found — run the main seed first');

  // 3. Create or get the demo organization
  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG.slug },
    update: {},
    create: {
      name: DEMO_ORG.name,
      slug: DEMO_ORG.slug,
      type: DEMO_ORG.type,
      status: OrganizationStatus.ACTIVE,
      email: DEMO_ORG.email,
      organizationCode: DEMO_ORG.code,
      modules: [],
    },
  });
  console.log(`[Seed:Inventory] Organization ready: ${org.name} (${org.id})`);

  // 4. Create org-level roles if they don't exist
  const orgAdminRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: ROLES.ORGANIZATION_ADMIN } },
    update: { hierarchyLevel: 100, dataScope: 'ORGANIZATION' },
    create: {
      organizationId: org.id,
      name: 'Organization Admin',
      slug: ROLES.ORGANIZATION_ADMIN,
      description: 'Full access within the organization',
      hierarchyLevel: 100,
      isSystem: true,
      dataScope: 'ORGANIZATION',
    },
  });

  const memberRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: ROLES.ORGANIZATION_MEMBER } },
    update: { hierarchyLevel: 10, dataScope: 'ORGANIZATION' },
    create: {
      organizationId: org.id,
      name: 'Organization Member',
      slug: ROLES.ORGANIZATION_MEMBER,
      description: 'Basic user with limited permissions',
      hierarchyLevel: 10,
      isSystem: true,
      dataScope: 'ORGANIZATION',
    },
  });

  // 5. Assign the inventory-mis module to the organization
  const orgModule = await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId: org.id, moduleId: invModule.id } },
    update: {
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
    create: {
      organizationId: org.id,
      moduleId: invModule.id,
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
  });
  console.log(`[Seed:Inventory] Module assigned to org: ${orgModule.status}`);

  // 6. Create users and assign roles
  for (const u of DEMO_USERS) {
    const existingUser = await prisma.user.findFirst({
      where: { email: u.email, organizationId: org.id },
    });

    if (existingUser) {
      console.log(`[Seed:Inventory] User already exists: ${u.email}`);
      continue;
    }

    const passwordHash = await hashPassword(u.password);

    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
        mfaEnabled: false,
      },
    });

    // Assign role
    const roleId = u.role === ROLES.ORGANIZATION_ADMIN ? orgAdminRole.id : memberRole.id;
    await prisma.userRole.create({
      data: { userId: user.id, roleId },
    });

    // Assign module to user
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: invModule.id } },
      update: {},
      create: {
        userId: user.id,
        organizationId: org.id,
        moduleId: invModule.id,
      },
    });

    console.log(`[Seed:Inventory] User created: ${u.email} (role: ${u.role})`);
  }

  // 7. Provision tenant in InventoryMIS backend
  try {
    const invBackendUrl = invModule.backendUrl || 'http://localhost:3003';
    const res = await fetch(`${invBackendUrl}/api/tenant/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': 'dev-service-key',
      },
      body: JSON.stringify({
        organizationId: org.id,
        organizationName: org.name,
        organizationCode: org.organizationCode || undefined,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      console.log(`[Seed:Inventory] Tenant provisioned in InventoryMIS`);
    } else if (res.status === 409) {
      console.log(`[Seed:Inventory] Tenant already exists in InventoryMIS`);
    } else {
      console.warn(`[Seed:Inventory] Warning: Tenant provisioning returned ${res.status}`);
    }
  } catch (err: any) {
    if (err?.name === 'TimeoutError') {
      console.warn(`[Seed:Inventory] Warning: Tenant provisioning timed out (is InventoryMIS running?)`);
    } else {
      console.warn(`[Seed:Inventory] Warning: Could not provision tenant (is InventoryMIS running?): ${err?.message}`);
    }
  }

  console.log('\n[Seed:Inventory] ✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Demo School Users:');
  console.log('   Org Admin    → admin@demoschool.com / DemoAdmin@2026');
  console.log('   Storekeeper  → storekeeper@demoschool.com / Store@2026');
  console.log('   Viewer       → viewer@demoschool.com / Viewer@2026');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Access InventoryMIS at: http://localhost:3004/dashboard');
  console.log(' (Login via IAM first, then navigate to InventoryMIS)');
}

main()
  .catch((e) => {
    console.error('[Seed:Inventory] Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

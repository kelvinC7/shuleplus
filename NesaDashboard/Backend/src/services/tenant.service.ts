export interface MockTenant {
  organizationId: string;
  organizationName: string;
  organizationCode?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

const tenants = new Map<string, MockTenant>();

export class TenantService {
  async createTenant(input: {
    organizationId: string;
    organizationName: string;
    organizationCode?: string;
  }): Promise<MockTenant> {
    const existing = tenants.get(input.organizationId);
    if (existing) return existing;

    const tenant: MockTenant = {
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      organizationCode: input.organizationCode,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    tenants.set(input.organizationId, tenant);
    return tenant;
  }

  listTenants(): MockTenant[] {
    return Array.from(tenants.values());
  }
}

export const tenantService = new TenantService();

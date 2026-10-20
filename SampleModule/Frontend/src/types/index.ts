export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  recordCount: number;
  reportCount: number;
  status: string;
}

export interface SampleRecord {
  id: string;
  title: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

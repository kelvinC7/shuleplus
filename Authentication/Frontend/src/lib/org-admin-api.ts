import { api } from '@/lib/api';

export type ModuleAccessLevel = 'USER' | 'HEAD';
export type DataScope = 'SELF' | 'DEPARTMENT' | 'BRANCH' | 'ORGANIZATION' | 'GLOBAL';
export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'LOCKED'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION';

export interface ModuleAssignment {
  slug: string;
  name?: string;
  shortName?: string | null;
  accessLevel: ModuleAccessLevel;
  dataScope: DataScope;
}

export type OrgChiefAccountantRow = {
  assignmentId: string;
  userId: string;
  organizationId: string;
  status: string;
  permissions: Record<string, string> & { moduleScope?: Record<string, unknown> };
  assignedAt: string;
  expiresAt: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    status: string;
    lastLoginAt: string | null;
    accessLevel: string;
    enforceMfa: boolean;
  };
  managedBy: 'platform';
  canDeleteUser: false;
};

export interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl?: string | null;
  department: string | null;
  branch: string | null;
  position: string | null;
  employeeId: string | null;
  status: UserStatus | string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  activatedAt: string | null;
  roles: string[];
  modules: ModuleAssignment[];
  supervisor: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface LicensedModule {
  id?: string;
  slug: string;
  name: string;
  shortName?: string | null;
  description?: string | null;
}

export type ModuleEnrollmentStatus =
  | 'available'
  | 'active'
  | 'pending_activation'
  | 'provisioning'
  | 'suspended';

export interface MarketplaceModuleItem {
  module: {
    id: string;
    slug: string;
    name: string;
    shortName: string | null;
    category: string | null;
    description: string | null;
    color: string | null;
    icon: string | null;
    isPremium: boolean;
    isCore: boolean;
  };
  enrollmentStatus: ModuleEnrollmentStatus;
  assignment: {
    id: string;
    status: string;
    tenantProvisioned: boolean;
    activatedAt: string | null;
  } | null;
  dependencies: { id: string; slug: string; name: string }[];
}

export interface ModuleEnrollResult {
  enrollmentStatus: ModuleEnrollmentStatus;
  message: string;
  module: { id: string; slug: string; name: string };
  provisioning: { provisioned: boolean; error?: string };
}

export interface UsageStats {
  totalUsers: number;
  licensedModules: number;
  seats: Array<{
    slug: string;
    name: string;
    assignedUsers: number;
    heads: number;
  }>;
}

export interface AccessAuditItem {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: unknown;
  actor: { name: string; email: string } | null;
  createdAt: string;
}

export interface CreateOrgUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password?: string;
  department?: string;
  branch?: string;
  position?: string;
  employeeId?: string;
  supervisorId?: string;
  avatarUrl?: string;
  moduleAssignments?: Array<{
    slug: string;
    accessLevel?: ModuleAccessLevel;
    dataScope?: DataScope;
  }>;
  moduleSlugs?: string[];
  requirePasswordChange?: boolean;
  sendCredentialsEmail?: boolean;
  status?: UserStatus;
  activatedAt?: string | null;
}

export interface UpdateOrgUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  branch?: string;
  position?: string;
  employeeId?: string;
  supervisorId?: string | null;
  avatarUrl?: string | null;
}

export interface UserPhotoSources {
  avatarUrl: string | null;
  hrPhotoUrl: string | null;
}

export interface OrgDepartment {
  id: string;
  name: string;
  code: string | null;
}

export const orgAdminApi = {
  listUsers: () => api.get<{ success: boolean; data: OrgUser[] }>('/iam/org/users'),
  listChiefAccountants: () =>
    api.get<{ success: boolean; data: OrgChiefAccountantRow[] }>('/iam/org/chief-accountants'),
  updateChiefAccountantAssignment: (
    userId: string,
    body: { permissions?: Record<string, unknown>; status?: string }
  ) =>
    api.patch<{ success: boolean; data: OrgChiefAccountantRow[] }>(
      `/iam/org/chief-accountants/${userId}`,
      body
    ),
  getUser: (userId: string) =>
    api.get<{ success: boolean; data: OrgUser }>(`/iam/org/users/${userId}`),
  getUserPhotoSources: (userId: string) =>
    api.get<{ success: boolean; data: UserPhotoSources }>(`/iam/org/users/${userId}/photo-sources`),
  listDepartments: () =>
    api.get<{ success: boolean; data: OrgDepartment[] }>('/iam/org/departments'),
  createDepartment: (body: {
    name: string;
    branch?: string;
    departmentHead?: string;
    departmentType?: string;
  }) =>
    api.post<{ success: boolean; data: OrgDepartment }>('/iam/org/departments', body),
  deleteDepartment: (departmentId: string) =>
    api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(
      `/iam/org/departments/${departmentId}`
    ),
  listModules: () =>
    api.get<{ success: boolean; data: LicensedModule[] }>('/iam/org/modules'),
  listModuleCatalog: () =>
    api.get<{ success: boolean; data: MarketplaceModuleItem[] }>('/iam/org/modules/catalog'),
  enrollModule: (moduleId: string) =>
    api.post<{ success: boolean; data: ModuleEnrollResult }>('/iam/org/modules/enroll', {
      moduleId,
    }),
  createUser: (payload: CreateOrgUserPayload) =>
    api.post<{
      success: boolean;
      data: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        modules: ModuleAssignment[];
        tempPassword?: string;
        credentialsSent?: boolean;
      };
    }>('/iam/org/users', payload),
  updateUser: (userId: string, payload: UpdateOrgUserPayload) =>
    api.put<{ success: boolean; data: OrgUser }>(`/iam/org/users/${userId}`, payload),
  deleteUser: (userId: string) =>
    api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(
      `/iam/org/users/${userId}`
    ),
  setUserModules: (
    userId: string,
    body: {
      moduleSlugs?: string[];
      moduleAssignments?: Array<{
        slug: string;
        accessLevel?: ModuleAccessLevel;
        dataScope?: DataScope;
      }>;
    }
  ) => api.put(`/iam/org/users/${userId}/modules`, body),
  updateStatus: (userId: string, status: UserStatus) =>
    api.patch(`/iam/org/users/${userId}/status`, { status }),
  resetPassword: (userId: string, body?: { password?: string; sendEmail?: boolean }) =>
    api.post<{ success: boolean; data: { tempPassword: string; emailSent: boolean } }>(
      `/iam/org/users/${userId}/reset-password`,
      body ?? {}
    ),
  usage: () => api.get<{ success: boolean; data: UsageStats }>('/iam/org/usage'),
  accessAudit: (limit = 50) =>
    api.get<{ success: boolean; data: AccessAuditItem[] }>(
      `/iam/org/access-audit?limit=${limit}`
    ),
  getAcademicSettings: () =>
    api.get<{ success: boolean; data: AcademicSettings }>('/iam/org/academic-settings'),
  updateAcademicSettings: (body: AcademicSettings) =>
    api.put<{ success: boolean; data: AcademicSettings }>('/iam/org/academic-settings', body),

  getAdmissionSettings: () =>
    api.get<{ success: boolean; data: AdmissionSettings }>('/iam/org/admissions/settings'),
  updateAdmissionSettings: (body: Partial<AdmissionSettings>) =>
    api.put<{ success: boolean; data: AdmissionSettings }>('/iam/org/admissions/settings', body),
  listAdmissionApplications: (status?: string) =>
    api.get<{ success: boolean; count: number; data: AdmissionApplicationSummary[] }>(
      `/iam/org/admissions/applications${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
  getAdmissionApplication: (applicationId: string) =>
    api.get<{ success: boolean; data: AdmissionApplicationSummary }>(
      `/iam/org/admissions/applications/${applicationId}`,
    ),
  updateAdmissionStatus: (
    applicationId: string,
    body: { status: string; schoolNotes?: string; interviewAt?: string | null },
  ) =>
    api.patch<{ success: boolean; data: AdmissionApplicationSummary }>(
      `/iam/org/admissions/applications/${applicationId}/status`,
      body,
    ),

  getOrganizationProfile: () =>
    api.get<{ success: boolean; data: Record<string, unknown> }>('/iam/org/profile'),
  updateOrganizationProfile: (body: Record<string, unknown>) =>
    api.put<{ success: boolean; data: Record<string, unknown> }>('/iam/org/profile', body),
};

export interface TermDateRange {
  start: string;
  end: string;
}

export interface ReportCardSettings {
  verifyBaseUrl?: string | null;
  enableClassTeacherComments?: boolean;
  enableHeadTeacherComments?: boolean;
  defaultHeadTeacherComment?: string | null;
  classTeacherCommentHint?: string | null;
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  termDates?: Record<string, TermDateRange>;
  reportCard?: ReportCardSettings;
}

export interface AdmissionDocumentDef {
  id: string;
  name: string;
  required: boolean;
  transferOnly?: boolean;
  levels?: string[];
}

export interface AdmissionSettings {
  enabled: boolean;
  applicationDeadline: string | null;
  estimatedFee: number | null;
  availablePlaces: Record<string, number>;
  requiredDocuments: AdmissionDocumentDef[];
  termsUrl: string | null;
  privacyUrl: string | null;
  welcomeMessage: string | null;
}

export interface AdmissionApplicationSummary {
  id: string;
  applicationNumber: string;
  organizationId: string;
  status: string;
  statusIndex: number;
  admissionLevel: string;
  classApplying: string;
  academicYear: string;
  termOfEntry: string;
  admissionType: string;
  studentName: string | null;
  studentDetails: Record<string, unknown>;
  parentDetails: Record<string, unknown>;
  documents: unknown[];
  schoolNotes: string | null;
  interviewAt: string | null;
  submittedAt: string | null;
  createdAt: string;
}

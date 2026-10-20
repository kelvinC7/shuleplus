import { api } from '@/services/api';
import type {
  ApiEnvelope,
  AcademicSettingsData,
  DisciplineOrgSettings,
  InitializeStudentsResult,
  CaseStats,
  DashboardSummary,
  DisciplineCase,
  DisciplineMark,
  MarkStats,
  Gate,
  GateDashboardData,
  GateLog,
  GateOfficer,
  GateScanResult,
  PermissionRequest,
  PermissionStats,
  ScorePreview,
  SmClass,
  SmStudent,
  SmParent,
  StudentDisciplineProfile,
} from '@/types/discipline';

export const disciplineApi = {
  dashboard: () => api.get<ApiEnvelope<DashboardSummary>>('/dashboard'),
  academicSettings: () => api.get<ApiEnvelope<AcademicSettingsData>>('/settings/academic'),

  disciplineSettings: () => api.get<ApiEnvelope<DisciplineOrgSettings>>('/settings/discipline'),
  updateDisciplineSettings: (body: Partial<DisciplineOrgSettings>) =>
    api.patch<ApiEnvelope<DisciplineOrgSettings>>('/settings/discipline', body),
  seedDefaultMarksFromSettings: () =>
    api.post<ApiEnvelope<{ seeded: boolean; count?: number }>>('/settings/discipline/seed-default-marks'),
  initializeAllStudents: () =>
    api.post<ApiEnvelope<InitializeStudentsResult>>('/settings/discipline/initialize-students'),
  applyStartingScoreToAll: () =>
    api.post<ApiEnvelope<{ updated: number }>>('/settings/discipline/apply-starting-score'),

  // Marks
  markStats: () => api.get<ApiEnvelope<MarkStats>>('/discipline/marks/stats'),
  marks: (params?: { type?: string; status?: string; search?: string; sort?: string }) =>
    api.get<ApiEnvelope<DisciplineMark[]>>('/discipline/marks', { params }),
  seedDefaultMarks: () => api.post<ApiEnvelope<{ seeded: boolean; count?: number }>>('/discipline/marks/seed-defaults'),
  createMark: (body: {
    name: string;
    description?: string;
    category?: string;
    type: string;
    points: number;
    status?: string;
  }) => api.post<ApiEnvelope<DisciplineMark>>('/discipline/marks', body),
  updateMark: (
    id: string,
    body: Partial<{
      name: string;
      description: string;
      category: string;
      type: string;
      points: number;
      status: string;
    }>
  ) => api.patch<ApiEnvelope<DisciplineMark>>(`/discipline/marks/${id}`, body),
  deleteMark: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/discipline/marks/${id}`),

  // Integration (Student Management)
  classes: () => api.get<ApiEnvelope<SmClass[]>>('/integration/classes'),
  students: (params?: { classId?: string; className?: string; search?: string; academicYear?: string }) =>
    api.get<ApiEnvelope<SmStudent[]>>('/integration/students', { params }),
  studentProfile: (studentId: string) =>
    api.get<ApiEnvelope<StudentDisciplineProfile>>(`/integration/students/${studentId}/profile`),
  studentParents: (studentId: string) =>
    api.get<ApiEnvelope<SmParent[]>>(`/integration/students/${studentId}/parents`),
  previewScore: (body: { studentId: string; appliedPoints: number }) =>
    api.post<ApiEnvelope<ScorePreview>>('/integration/preview-score', body),

  // Cases
  caseStats: () => api.get<ApiEnvelope<CaseStats>>('/discipline/cases/stats'),
  cases: (params?: { className?: string; status?: string; search?: string }) =>
    api.get<ApiEnvelope<DisciplineCase[]>>('/discipline/cases', { params }),
  seedSamples: () => api.post<ApiEnvelope<{ seeded: boolean }>>('/discipline/seed-samples'),
  createCase: (body: {
    studentId?: string;
    studentName: string;
    studentCode?: string;
    className: string;
    classId?: string;
    academicYear?: string;
    markId?: string;
    customCaseName?: string;
    category?: string;
    severity?: string;
    status?: string;
    incidentDate?: string;
    incidentTime?: string;
    location?: string;
    description?: string;
    appliedPoints?: number;
    actionsTaken?: string[];
    actionNotes?: string;
    notifyParent?: boolean;
    notifyMethods?: string[];
  }) => api.post<ApiEnvelope<DisciplineCase>>('/discipline/cases', body),
  updateCase: (
    id: string,
    body: Partial<{
      studentName: string;
      studentCode: string;
      className: string;
      category: string;
      severity: string;
      status: string;
      incidentDate: string;
      description: string;
      actionNotes: string;
    }>
  ) => api.patch<ApiEnvelope<DisciplineCase>>(`/discipline/cases/${id}`, body),
  notifyCase: (id: string, notifyMethods?: string[]) =>
    api.post<ApiEnvelope<{ sent?: number }>>(`/discipline/cases/${id}/notify`, { notifyMethods }),
  deleteCase: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/discipline/cases/${id}`),

  // Permissions
  permissionStats: () => api.get<ApiEnvelope<PermissionStats>>('/permissions/stats'),
  permissions: (params?: {
    search?: string;
    academicYear?: string;
    term?: string;
    className?: string;
    permissionType?: string;
    status?: string;
    dateFilter?: string;
    from?: string;
    to?: string;
  }) => api.get<ApiEnvelope<PermissionRequest[]>>('/permissions', { params }),
  permission: (id: string) => api.get<ApiEnvelope<PermissionRequest>>(`/permissions/${id}`),
  createPermission: (body: {
    studentId: string;
    studentCode?: string;
    studentName: string;
    className: string;
    classId?: string;
    academicYear?: string;
    term?: string;
    permissionType: string;
    customType?: string;
    reason: string;
    destination: string;
    destinationAddress?: string;
    departureDate: string;
    departureTime: string;
    expectedReturnDate: string;
    expectedReturnTime: string;
    leavingWith: string;
    guardianName?: string;
    guardianRelationship?: string;
    guardianPhone?: string;
    authorizedPersonName?: string;
    authorizedPersonRelationship?: string;
    authorizedPersonPhone?: string;
    authorizedPersonId?: string;
    requestedBy: string;
    requestedByName?: string;
    approvalChain?: string[];
  }) => api.post<ApiEnvelope<PermissionRequest>>('/permissions', body),
  permissionAction: (
    id: string,
    action: 'approve' | 'reject' | 'cancel' | 'checkout' | 'return',
    body?: { notes?: string }
  ) => api.post<ApiEnvelope<PermissionRequest>>(`/permissions/${id}/${action}`, body ?? {}),

  // Gate Management
  gateDashboard: (gateId?: string) =>
    api.get<ApiEnvelope<GateDashboardData>>('/gate/dashboard', { params: gateId ? { gateId } : undefined }),
  gateMe: () => api.get<ApiEnvelope<GateOfficer | null>>('/gate/me'),
  gates: () => api.get<ApiEnvelope<Gate[]>>('/gate/gates'),
  createGate: (body: { name: string; code?: string; location?: string }) =>
    api.post<ApiEnvelope<Gate>>('/gate/gates', body),
  updateGate: (id: string, body: Partial<{ name: string; code: string; location: string; status: string; isDefault: boolean }>) =>
    api.patch<ApiEnvelope<Gate>>(`/gate/gates/${id}`, body),
  gateOfficers: () => api.get<ApiEnvelope<GateOfficer[]>>('/gate/officers'),
  createGateOfficer: (body: {
    fullName: string;
    email?: string;
    password: string;
    phone?: string;
    pin?: string;
    gateId?: string;
    userId?: string;
    role?: string;
  }) => api.post<ApiEnvelope<GateOfficer>>('/gate/officers', body),
  updateGateOfficer: (id: string, body: Partial<{ fullName: string; email: string; phone: string; pin: string; gateId: string; status: string; role: string }>) =>
    api.patch<ApiEnvelope<GateOfficer>>(`/gate/officers/${id}`, body),
  deleteGateOfficer: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/gate/officers/${id}`),
  gateScan: (code: string) => api.post<ApiEnvelope<GateScanResult>>('/gate/scan', { code }),
  gateTodayPermissions: () => api.get<ApiEnvelope<PermissionRequest[]>>('/gate/permissions/today'),
  gateOutside: () => api.get<ApiEnvelope<PermissionRequest[]>>('/gate/outside'),
  gateOverdue: () => api.get<ApiEnvelope<PermissionRequest[]>>('/gate/overdue'),
  gateLogs: (params?: { gateId?: string; search?: string; eventType?: string; from?: string; to?: string; limit?: number }) =>
    api.get<ApiEnvelope<GateLog[]>>('/gate/logs', { params }),
  gateCheckout: (permissionId: string, body: { gateId: string; method: string; officerId?: string; officerName?: string }) =>
    api.post<ApiEnvelope<{ permission: PermissionRequest; log: GateLog; varianceMinutes: number; varianceLabel: string }>>(
      `/gate/permissions/${permissionId}/checkout`,
      body
    ),
  gateCheckin: (permissionId: string, body: { gateId: string; method: string; officerId?: string; officerName?: string }) =>
    api.post<ApiEnvelope<{ permission: PermissionRequest; log: GateLog; varianceMinutes: number; varianceLabel: string }>>(
      `/gate/permissions/${permissionId}/checkin`,
      body
    ),
  gateEmergencyExit: (body: {
    studentId: string;
    studentName: string;
    studentCode?: string;
    className?: string;
    gateId: string;
    reason: string;
    authorizedBy: string;
    method?: string;
    officerId?: string;
    officerName?: string;
    pin?: string;
  }) => api.post<ApiEnvelope<{ log: GateLog; message: string }>>('/gate/emergency-exit', body),
  gateProcessOverdue: () => api.post<ApiEnvelope<{ count: number }>>('/gate/overdue/notify'),
};

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: string } } };
  return ax.response?.data?.message ?? fallback;
}

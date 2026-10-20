/**
 * BabyeyiWizard API scopes — mirrors BabyeyiWizard/Backend routes.
 */

export interface DeveloperScopeEndpoint {
  method: string;
  path: string;
  summary: string;
}

export interface DeveloperScopeDef {
  key: string;
  label: string;
  endpoints: DeveloperScopeEndpoint[];
}

export const BABYEYI_WIZARD_SCOPES: DeveloperScopeDef[] = [
  {
    key: 'babyeyi.read',
    label: 'Read Circulars & Verify',
    endpoints: [
      { method: 'GET', path: '/health', summary: 'Service health' },
      { method: 'GET', path: '/public/circulars/options', summary: 'Circular lookup options' },
      { method: 'GET', path: '/public/circulars', summary: 'Get circular by class/term' },
      { method: 'GET', path: '/public/circulars/list', summary: 'List approved circulars' },
      { method: 'GET', path: '/public/circulars/{id}/print', summary: 'Print circular HTML' },
      { method: 'GET', path: '/babyeyi/verify/{docId}', summary: 'Verify published document' },
      { method: 'POST', path: '/babyeyi/verify/{docId}/report', summary: 'Report verification issue' },
      { method: 'GET', path: '/dashboard', summary: 'Babyeyi dashboard' },
      { method: 'GET', path: '/babyeyi/school-info', summary: 'School info for wizard' },
      { method: 'GET', path: '/babyeyi/nesa-limit', summary: 'NESA fee limit' },
      { method: 'GET', path: '/babyeyi/academic-classes', summary: 'Academic classes' },
      { method: 'GET', path: '/babyeyi/student-requirements-catalog', summary: 'Requirements catalog' },
      { method: 'GET', path: '/babyeyi/stats', summary: 'Babyeyi stats' },
      { method: 'GET', path: '/babyeyi', summary: 'List Babyeyi documents' },
      { method: 'GET', path: '/babyeyi/{id}', summary: 'Get Babyeyi document' },
      { method: 'GET', path: '/babyeyi/{id}/qrcode', summary: 'Document QR code' },
      { method: 'GET', path: '/babyeyi/{id}/pdf', summary: 'Download PDF' },
      { method: 'GET', path: '/babyeyi/{id}/print', summary: 'Print document' },
      { method: 'GET', path: '/babyeyi/{id}/versions', summary: 'Document versions' },
      { method: 'GET', path: '/approvals', summary: 'Pending approvals' },
      { method: 'GET', path: '/analytics', summary: 'Babyeyi analytics' },
      { method: 'GET', path: '/templates', summary: 'Document templates' },
      { method: 'GET', path: '/assets', summary: 'Asset library' },
      { method: 'GET', path: '/notifications', summary: 'Notifications' },
      { method: 'GET', path: '/collaboration', summary: 'Collaboration feed' },
      { method: 'GET', path: '/academic-settings', summary: 'Academic settings' },
      { method: 'GET', path: '/settings', summary: 'Module settings' },
      { method: 'GET', path: '/nesa/circulars', summary: 'NESA review list (service)' },
      { method: 'GET', path: '/nesa/circulars/{id}', summary: 'NESA review detail (service)' },
      { method: 'GET', path: '/nesa/circulars/{id}/print', summary: 'NESA print (service)' },
    ],
  },
  {
    key: 'babyeyi.write',
    label: 'Create / Publish Babyeyi',
    endpoints: [
      { method: 'POST', path: '/babyeyi', summary: 'Create Babyeyi document' },
      { method: 'PUT', path: '/babyeyi/{id}', summary: 'Update Babyeyi document' },
      { method: 'DELETE', path: '/babyeyi/{id}', summary: 'Delete Babyeyi document' },
      { method: 'POST', path: '/babyeyi/{id}/duplicate', summary: 'Duplicate document' },
      { method: 'POST', path: '/babyeyi/{id}/publish', summary: 'Publish document' },
      { method: 'POST', path: '/babyeyi/{id}/comments', summary: 'Add comment' },
      { method: 'POST', path: '/babyeyi/bulk', summary: 'Bulk action' },
      { method: 'PATCH', path: '/babyeyi/{id}/content-i18n/rw', summary: 'Patch Kinyarwanda content' },
      { method: 'POST', path: '/babyeyi/{id}/regenerate-translations', summary: 'Regenerate translations' },
      { method: 'POST', path: '/babyeyi/{id}/approve', summary: 'Approve document' },
      { method: 'POST', path: '/babyeyi/upload-asset', summary: 'Upload asset' },
      { method: 'POST', path: '/babyeyi/{id}/versions/{versionId}/restore', summary: 'Restore version' },
      { method: 'PUT', path: '/academic-settings', summary: 'Update academic settings' },
      { method: 'PUT', path: '/settings', summary: 'Update settings' },
      { method: 'PATCH', path: '/notifications/read-all', summary: 'Mark all notifications read' },
      { method: 'PATCH', path: '/notifications/{id}/read', summary: 'Mark notification read' },
      { method: 'POST', path: '/tenant/create', summary: 'Create tenant (service)' },
      { method: 'POST', path: '/nesa/circulars/{id}/comments', summary: 'NESA comment (service)' },
      { method: 'POST', path: '/nesa/circulars/{id}/reject', summary: 'NESA reject (service)' },
      { method: 'POST', path: '/nesa/circulars/{id}/unpublish', summary: 'NESA unpublish (service)' },
      { method: 'POST', path: '/nesa/circulars/{id}/approve', summary: 'NESA approve (service)' },
    ],
  },
];

export function babyeyiPermissionConfig() {
  return {
    label: 'Babyeyi Wizard',
    permissions: BABYEYI_WIZARD_SCOPES.map(({ key, label, endpoints }) => ({
      key,
      label,
      endpoints,
    })),
  };
}

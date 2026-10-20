import { api, unwrap } from '@/services/api';
import type {
  AnalyticsData,
  ApiEnvelope,
  AssetAssignment,
  AssetFinancialDetails,
  AssetAdjustmentRow,
  AssetMaintenance,
  AssetReplacement,
  AssetRow,
  AssetTransfer,
  Category,
  DashboardSummary,
  FinancialYear,
  OpeningContext,
  PaginatedAssets,
  PaginatedList,
  RegisterMeta,
  RegisterStats,
  YearCategoryBalance,
} from '@/types';

export const assetsApi = {
  tenantEnsure: (body?: { organizationName?: string; organizationCode?: string }) =>
    api.post<ApiEnvelope<unknown>>('/tenant/ensure', body ?? {}),

  dashboard: (params?: { year?: number; category?: string; location?: string }) =>
    api.get<ApiEnvelope<DashboardSummary>>('/dashboard', {
      params: {
        ...(params?.year ? { register_year: params.year } : {}),
        ...(params?.category ? { category: params.category } : {}),
        ...(params?.location ? { location: params.location } : {}),
      },
    }),

  analytics: () => api.get<ApiEnvelope<AnalyticsData>>('/analytics'),

  meta: () => api.get<ApiEnvelope<RegisterMeta>>('/meta'),

  // Categories
  categories: () => api.get<ApiEnvelope<Category[]>>('/categories'),
  createCategory: (body: {
    name: string;
    icon?: string;
    description?: string;
    depreciationRate?: number;
    depreciation_rate?: number;
  }) => api.post<ApiEnvelope<Category>>('/categories', body),
  updateCategory: (
    id: string,
    body: Partial<{
      name: string;
      icon: string;
      description: string;
      depreciationRate: number;
      depreciation_rate: number;
    }>
  ) => api.patch<ApiEnvelope<Category>>(`/categories/${id}`, body),
  deleteCategory: (id: string) => api.delete<ApiEnvelope<Category>>(`/categories/${id}`),

  // Financial years
  financialYears: () => api.get<ApiEnvelope<FinancialYear[]>>('/financial-years'),
  activeFinancialYear: () => api.get<ApiEnvelope<FinancialYear | null>>('/financial-years/active'),
  openingPreview: (year: number) =>
    api.get<ApiEnvelope<OpeningPreviewRow[]>>('/financial-years/opening-preview', {
      params: { year },
    }),
  categoryOpening: (year: number, category: string) =>
    api.get<ApiEnvelope<YearCategoryBalance | null>>('/financial-years/category-opening', {
      params: { year, category },
    }),
  createFinancialYear: (body: Record<string, unknown>) =>
    api.post<ApiEnvelope<FinancialYear>>('/financial-years', body),
  updateFinancialYear: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiEnvelope<FinancialYear>>(`/financial-years/${id}`, body),
  closeFinancialYear: (id: string) =>
    api.patch<ApiEnvelope<FinancialYear>>(`/financial-years/${id}/close`),
  reopenFinancialYear: (id: string) =>
    api.patch<ApiEnvelope<FinancialYear>>(`/financial-years/${id}/reopen`),
  deleteFinancialYear: (id: string) => api.delete(`/financial-years/${id}`),

  // Register
  registerStats: (registerYear?: number) =>
    api.get<ApiEnvelope<RegisterStats>>('/register/stats', {
      params: registerYear != null ? { register_year: registerYear } : undefined,
    }),
  registerMeta: () => api.get<ApiEnvelope<RegisterMeta>>('/register/meta'),
  registerOpening: (params: {
    year: number;
    category: string;
    entry_mode?: string;
    edit_asset_id?: string;
  }) => api.get<ApiEnvelope<OpeningContext>>('/register/opening', { params }),
  registerList: (params?: {
    page?: number;
    limit?: number;
    register_year?: number;
    category?: string;
    asset_health_status?: string;
    q?: string;
  }) => api.get<PaginatedAssets>('/register', { params }),
  createAsset: (body: Record<string, unknown>) =>
    api.post<ApiEnvelope<AssetRow | AssetRow[]>>('/register', body),
  getAsset: (id: string) => api.get<ApiEnvelope<AssetRow>>(`/register/${id}`),
  getAssetFinancials: (id: string) =>
    api.get<ApiEnvelope<AssetFinancialDetails>>(`/register/${id}/financials`),
  listAssetAdjustments: (id: string) =>
    api.get<ApiEnvelope<AssetAdjustmentRow[]>>(`/register/${id}/adjustments`),
  canCreateAdjustments: () =>
    api.get<ApiEnvelope<{ allowed: boolean }>>('/register/adjustments/can-create'),
  createAssetAdjustment: (
    id: string,
    body: {
      adjustment_type: string;
      amount: number;
      register_year?: number;
      reason: string;
      note?: string;
      adjustment_date?: string;
    }
  ) =>
    api.post<
      ApiEnvelope<{
        adjustment: AssetAdjustmentRow;
        financials: AssetFinancialDetails;
      }>
    >(`/register/${id}/adjustments`, body),
  updateAsset: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiEnvelope<AssetRow>>(`/register/${id}`, body),
  checkIdentifiers: (params: {
    register_year: number;
    sku?: string;
    asset_code?: string;
    exclude_id?: string;
  }) =>
    api.get<ApiEnvelope<{ available: boolean; conflicts: { field: string; value: string }[] }>>(
      '/register/identifiers',
      { params }
    ),
  deleteAsset: (id: string) => api.delete(`/register/${id}`),
  importPreview: (body: {
    rows: Record<string, unknown>[];
    register_year: number;
    entry_mode?: string;
    first_time?: boolean;
  }) =>
    api.post<
      ApiEnvelope<{
        summary: {
          total: number;
          ready: number;
          duplicates: number;
          invalid: number;
          registerYear: number;
          entryMode: string;
        };
        categorySummary: Array<{
          category: string;
          year: number;
          opening: number;
          accumulated: number;
          source: string;
          readyCount: number;
        }>;
        rows: AssetImportPreviewRow[];
      }>
    >('/register/import/preview', body, { timeout: 300000 }),
  importAssets: (
    rows: Record<string, unknown>[],
    meta?: {
      register_year?: number;
      entry_mode?: string;
      first_time?: boolean;
      skip_duplicates?: boolean;
      auto_generate_sku?: boolean;
    }
  ) =>
    api.post<
      ApiEnvelope<{
        imported: number;
        skipped?: number;
        failed?: number;
        total?: number;
        errors?: Array<{ row: number; message: string }>;
        recalcErrors?: string[];
        data: AssetRow[];
      }>
    >('/register/import', { rows, ...meta }, { timeout: 600000 }),
  recalcChain: (body: { register_year?: number; category?: string; all_years?: boolean }) =>
    api.post<ApiEnvelope<{ updated?: number; groups?: unknown }>>('/register/recalc-chain', body),
  purgeTemplateSamples: () =>
    api.post<ApiEnvelope<{ deleted: number }>>('/register/purge-template-samples'),
  bulkDeleteAssets: (ids: string[]) =>
    api.post<ApiEnvelope<{ deleted: number }>>('/register/bulk-delete', { ids }),
  deleteAllRegisterAssets: (body: {
    confirm: true;
    register_year?: number;
    category?: string;
    asset_health_status?: string;
    q?: string;
  }) => api.post<ApiEnvelope<{ deleted: number }>>('/register/delete-all', body),

  // Assignments
  assignments: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedList<AssetAssignment>>('/assignments', { params }),
  createAssignment: (body: {
    assetId: string;
    assigneeName?: string;
    department?: string;
    location?: string;
    assignDate?: string;
    expectedReturnDate?: string;
    notes?: string;
  }) => api.post<ApiEnvelope<AssetAssignment>>('/assignments', body),
  returnAssignment: (
    id: string,
    body?: { returnCondition?: string; returnNotes?: string; returnDate?: string }
  ) => api.patch<ApiEnvelope<AssetAssignment>>(`/assignments/${id}/return`, body ?? {}),
  updateAssignment: (
    id: string,
    body: {
      assigneeName?: string;
      department?: string;
      location?: string;
      assignDate?: string;
      expectedReturnDate?: string;
      notes?: string;
      returnCondition?: string;
      returnNotes?: string;
      returnDate?: string;
    }
  ) => api.patch<ApiEnvelope<AssetAssignment>>(`/assignments/${id}`, body),
  deleteAssignment: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/assignments/${id}`),

  // Maintenance
  maintenance: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedList<AssetMaintenance>>('/maintenance', { params }),
  createMaintenance: (body: {
    assetId: string;
    description: string;
    provider?: string;
    priority?: string;
    dueDate?: string;
    estimatedCost?: number;
  }) => api.post<ApiEnvelope<AssetMaintenance>>('/maintenance', body),
  extendMaintenance: (id: string, body: { newDueDate: string; reason?: string }) =>
    api.patch<ApiEnvelope<AssetMaintenance>>(`/maintenance/${id}/extend`, body),
  updateMaintenance: (
    id: string,
    body: {
      description?: string;
      provider?: string;
      priority?: string;
      dueDate?: string;
      estimatedCost?: number;
      status?: string;
    }
  ) => api.patch<ApiEnvelope<AssetMaintenance>>(`/maintenance/${id}`, body),
  deleteMaintenance: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/maintenance/${id}`),

  // Transfers
  transfers: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedList<AssetTransfer>>('/transfers', { params }),
  createTransfer: (body: {
    assetId: string;
    toLocation?: string;
    toDepartment?: string;
    transferDate?: string;
    authorizedBy?: string;
    receivedBy?: string;
    reason?: string;
  }) => api.post<ApiEnvelope<AssetTransfer>>('/transfers', body),
  updateTransfer: (
    id: string,
    body: {
      toLocation?: string;
      toDepartment?: string;
      transferDate?: string;
      authorizedBy?: string;
      receivedBy?: string;
      reason?: string;
    }
  ) => api.patch<ApiEnvelope<AssetTransfer>>(`/transfers/${id}`, body),
  deleteTransfer: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/transfers/${id}`),

  // Replacements
  replacements: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedList<AssetReplacement>>('/replacements', { params }),
  createReplacement: (body: {
    oldAssetId: string;
    reason?: string;
    pendingPayload?: Record<string, unknown>;
  }) => api.post<ApiEnvelope<AssetReplacement>>('/replacements', body),
  approveReplacement: (id: string) =>
    api.post<ApiEnvelope<AssetReplacement>>(`/replacements/${id}/approve`),
  rejectReplacement: (id: string, body?: { reason?: string }) =>
    api.post<ApiEnvelope<AssetReplacement>>(`/replacements/${id}/reject`, body ?? {}),
  updateReplacement: (
    id: string,
    body: { reason?: string; pendingPayload?: Record<string, unknown> }
  ) => api.patch<ApiEnvelope<AssetReplacement>>(`/replacements/${id}`, body),
  deleteReplacement: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/replacements/${id}`),

  // Reports
  reports: () => api.get<ApiEnvelope<string[]>>('/reports'),
  report: (type: string) => api.get<ApiEnvelope<unknown>>(`/reports/${type}`),

  // Scan
  scanLookup: (params: { code?: string; id?: string }) =>
    api.get<ApiEnvelope<AssetRow>>('/scan-lookup', { params }),

  updateHealthStatus: (id: string, assetHealthStatus: string) =>
    api.patch<ApiEnvelope<AssetRow>>(`/assets/${id}/health-status`, { assetHealthStatus }),
};

export interface OpeningPreviewRow {
  category: string;
  categoryId?: string | null;
  depreciationRate: number;
  openingBalance: number;
  accumulatedDepreciation: number;
  lastYearClosing?: number;
  previewAnnualDep?: number;
}

export { unwrap };

export interface AssetImportPreviewRow {
  row: number;
  status: 'ready' | 'duplicate' | 'invalid';
  reason: string;
  assetName: string;
  category: string;
  typeRaw: string;
  registerYear: number;
  purchasePrice: number;
  location: string;
  locationLabel: string;
  sku: string;
  supplier: string;
  buildingStatus: string;
  opening: number;
  accumulatedStart: number;
  annualDep: number;
  totalBalance: number;
  netBookValue: number;
  depRate: number;
}

import { api } from '@/services/api';
import type {
  ApiEnvelope,
  LandDashboard,
  LandImportPreview,
  LandMeta,
  LandPaginated,
  LandRecord,
  LandRecordDetail,
  LandReport,
  LandReportType,
  LandSetupSummary,
} from '@/types';

export type LandListParams = {
  page?: number;
  limit?: number;
  year?: number;
  province?: string;
  district?: string;
  sector?: string;
  category?: string;
  supplier?: string;
  q?: string;
  from?: string;
  to?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
};

export type LandFormPayload = {
  year: number;
  province?: string;
  district?: string;
  sector?: string;
  cellule?: string;
  village?: string;
  type?: string;
  category?: string;
  supplier?: string;
  tax?: string;
  upi?: string;
  sku?: string;
  sku_mode?: 'auto' | 'manual';
  size?: string;
  material?: string;
  purchase_year?: number | string | null;
  purchase_month?: number | string | null;
  purchase_day?: number | string | null;
  purchase_unit_price: number | string;
};

export const landApi = {
  meta: () => api.get<ApiEnvelope<LandMeta>>('/land/meta'),

  setActiveYear: (year: number) =>
    api.post<ApiEnvelope<LandMeta>>('/land/active-year', { year }),

  setup: (year: number) =>
    api.get<ApiEnvelope<LandSetupSummary>>('/land/setup', { params: { year } }),

  saveSetup: (year: number, openingAmount: number) =>
    api.post<ApiEnvelope<LandSetupSummary>>('/land/setup', {
      year,
      opening_amount: openingAmount,
    }),

  records: (params?: LandListParams) =>
    api.get<LandPaginated>('/land/records', { params }),

  createRecord: (body: LandFormPayload) =>
    api.post<ApiEnvelope<LandRecord>>('/land/records', body),

  getRecord: (id: string) => api.get<ApiEnvelope<LandRecordDetail>>(`/land/records/${id}`),

  updateRecord: (id: string, body: Omit<LandFormPayload, 'year'>) =>
    api.patch<ApiEnvelope<LandRecord>>(`/land/records/${id}`, body),

  deleteRecord: (id: string) =>
    api.delete<ApiEnvelope<{ success: boolean; id: string }>>(`/land/records/${id}`),

  recalc: (year: number) => api.post<ApiEnvelope<unknown>>('/land/recalc', { year }),

  importPreview: (year: number, rows: Record<string, unknown>[]) =>
    api.post<ApiEnvelope<LandImportPreview>>('/land/import/preview', { year, rows }, { timeout: 300000 }),

  importCommit: (year: number, rows: Record<string, unknown>[], fileName?: string) =>
    api.post<
      ApiEnvelope<{
        batchId: string;
        imported: number;
        openingAmount: number;
        totalPurchaseValue: number;
        closingBalance: number;
      }>
    >('/land/import', { year, rows, file_name: fileName }, { timeout: 600000 }),

  importBatches: (year?: number) =>
    api.get<ApiEnvelope<unknown[]>>('/land/import/batches', {
      params: year ? { year } : undefined,
    }),

  dashboard: (params?: {
    year?: number;
    province?: string;
    district?: string;
    sector?: string;
    category?: string;
    supplier?: string;
  }) => api.get<ApiEnvelope<LandDashboard>>('/land/dashboard', { params }),

  reportTypes: () => api.get<ApiEnvelope<LandReportType[]>>('/land/reports'),

  report: (
    type: string,
    params?: {
      year?: number;
      province?: string;
      district?: string;
      sector?: string;
      category?: string;
      supplier?: string;
      from?: string;
      to?: string;
    }
  ) => api.get<ApiEnvelope<LandReport>>(`/land/reports/${type}`, { params }),

  auditLogs: (year?: number, limit?: number) =>
    api.get<ApiEnvelope<Array<Record<string, unknown>>>>('/land/audit-logs', {
      params: { ...(year ? { year } : {}), ...(limit ? { limit } : {}) },
    }),
};

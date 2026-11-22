import { api } from '@/services/api';
import type {
  ApiEnvelope,
  VehicleAuditLog,
  VehicleDashboard,
  VehicleImportPreview,
  VehicleMeta,
  VehiclePaginated,
  VehicleRecord,
  VehicleRecordDetail,
  VehicleReport,
  VehicleReportType,
  VehicleSetupSummary,
} from '@/types';

export type VehicleListParams = {
  page?: number;
  limit?: number;
  year?: number;
  location?: string;
  type?: string;
  category?: string;
  supplier?: string;
  purchase_year?: number;
  q?: string;
  from?: string;
  to?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
};

export type VehicleFormPayload = {
  year: number;
  location?: string;
  name?: string;
  label?: string;
  type?: string;
  category?: string;
  supplier?: string;
  tax?: string;
  upi?: string;
  sku?: string;
  size?: string;
  material?: string;
  purchase_year?: number | string | null;
  purchase_month?: number | string | null;
  purchase_day?: number | string | null;
  purchase_unit_price: number | string;
  sale_balance?: number | string | null;
  quantity?: number | string | null;
  dep_mode?: string;
  depreciation_rate?: number | string | null;
  useful_years?: number | string | null;
  use_setup_depreciation?: boolean;
};

export type VehicleUpdatePayload = Omit<VehicleFormPayload, 'year'>;

export type VehicleDashboardParams = {
  year?: number;
  location?: string;
  type?: string;
  category?: string;
  supplier?: string;
  purchase_year?: number;
};

export type VehicleReportParams = VehicleDashboardParams & {
  from?: string;
  to?: string;
};

export type VehicleSetupPayload = {
  year: number;
  opening_amount: number;
  accumulated_depreciation: number;
  depreciation_mode: string;
  depreciation_rate: number;
  useful_years: number;
};

export const vehicleApi = {
  meta: () => api.get<ApiEnvelope<VehicleMeta>>('/vehicles/meta'),

  setActiveYear: (year: number) =>
    api.post<ApiEnvelope<VehicleMeta>>('/vehicles/active-year', { year }),

  setup: (year: number) =>
    api.get<ApiEnvelope<VehicleSetupSummary>>('/vehicles/setup', { params: { year } }),

  saveSetup: (body: VehicleSetupPayload) =>
    api.post<ApiEnvelope<VehicleSetupSummary>>('/vehicles/setup', body),

  records: (params?: VehicleListParams) =>
    api.get<VehiclePaginated>('/vehicles/records', { params }),

  createRecord: (body: VehicleFormPayload) =>
    api.post<ApiEnvelope<VehicleRecord>>('/vehicles/records', body),

  getRecord: (id: string) => api.get<ApiEnvelope<VehicleRecordDetail>>(`/vehicles/records/${id}`),

  updateRecord: (id: string, body: VehicleUpdatePayload) =>
    api.patch<ApiEnvelope<VehicleRecord>>(`/vehicles/records/${id}`, body),

  deleteRecord: (id: string) =>
    api.delete<ApiEnvelope<{ success: boolean; id: string }>>(`/vehicles/records/${id}`),

  recalc: (year: number) => api.post<ApiEnvelope<unknown>>('/vehicles/recalc', { year }),

  importPreview: (year: number, rows: Record<string, unknown>[]) =>
    api.post<ApiEnvelope<VehicleImportPreview>>(
      '/vehicles/import/preview',
      { year, rows },
      { timeout: 300000 }
    ),

  importCommit: (year: number, rows: Record<string, unknown>[], fileName?: string) =>
    api.post<
      ApiEnvelope<{
        batchId: string;
        imported: number;
        openingAmount: number;
        totalPurchaseValue: number;
        totalSaleBalance: number;
        closingBalance: number;
      }>
    >('/vehicles/import', { year, rows, file_name: fileName }, { timeout: 600000 }),

  importBatches: (year?: number) =>
    api.get<ApiEnvelope<unknown[]>>('/vehicles/import/batches', {
      params: year ? { year } : undefined,
    }),

  dashboard: (params?: VehicleDashboardParams) =>
    api.get<ApiEnvelope<VehicleDashboard>>('/vehicles/dashboard', { params }),

  reportTypes: () => api.get<ApiEnvelope<VehicleReportType[]>>('/vehicles/reports'),

  report: (type: string, params?: VehicleReportParams) =>
    api.get<ApiEnvelope<VehicleReport>>(`/vehicles/reports/${type}`, { params }),

  auditLogs: (year?: number, limit?: number, recordId?: string) =>
    api.get<ApiEnvelope<VehicleAuditLog[]>>('/vehicles/audit-logs', {
      params: {
        ...(year ? { year } : {}),
        ...(limit ? { limit } : {}),
        ...(recordId ? { record_id: recordId } : {}),
      },
    }),
};

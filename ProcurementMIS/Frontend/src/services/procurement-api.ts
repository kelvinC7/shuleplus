import { api } from './api';
import type {
  ApiResponse, DashboardData, PurchaseRequest, PurchaseOrder,
  Supplier, SupplierSummary, Contract, Budget, BudgetSummary,
  GoodsReceiving, GrnSummary, PoReceivingContext,
  GoodsReturn, ReturnSummary, GrnReturnContext,
  Notification, Department, ProcurementCategory,
  SupplierPerformance,
} from '@/types';

async function get<T>(url: string): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url);
  return data.data;
}

async function post<T>(url: string, body?: any): Promise<T> {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data.data;
}

async function put<T>(url: string, body?: any): Promise<T> {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  return data.data;
}

async function del(url: string): Promise<void> {
  await api.delete(url);
}

export const procurementApi = {
  dashboard: {
    get: () => get<DashboardData>('/dashboard'),
  },

  purchaseRequests: {
    list: (params?: { status?: string; departmentId?: string; priority?: string; search?: string; dateFrom?: string; dateTo?: string }) =>
      get<PurchaseRequest[]>(`/purchase-requests?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<PurchaseRequest>(`/purchase-requests/${id}`),
    create: (body: any) => post<PurchaseRequest>('/purchase-requests', body),
    update: (id: string, body: any) => put<PurchaseRequest>(`/purchase-requests/${id}`, body),
    approve: (id: string, comment?: string) => put<PurchaseRequest>(`/purchase-requests/${id}/approve`, { comment }),
    reject: (id: string, reason: string) => put<PurchaseRequest>(`/purchase-requests/${id}/reject`, { reason }),
    cancel: (id: string) => put<PurchaseRequest>(`/purchase-requests/${id}/cancel`),
    remove: (id: string) => del(`/purchase-requests/${id}`),
  },

  purchaseOrders: {
    list: (params?: { status?: string; search?: string }) =>
      get<PurchaseOrder[]>(`/purchase-orders?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<PurchaseOrder>(`/purchase-orders/${id}`),
    create: (body: any) => post<PurchaseOrder>('/purchase-orders', body),
    updateStatus: (id: string, status: string) => put<PurchaseOrder>(`/purchase-orders/${id}/status`, { status }),
    updatePayment: (id: string, paymentStatus: string) => put<PurchaseOrder>(`/purchase-orders/${id}/payment`, { paymentStatus }),
    remove: (id: string) => del(`/purchase-orders/${id}`),
  },

  suppliers: {
    list: () => get<Supplier[]>('/suppliers'),
    getById: (id: string) => get<Supplier>(`/suppliers/${id}`),
    create: (body: any) => post<Supplier>('/suppliers', body),
    update: (id: string, body: any) => put<Supplier>(`/suppliers/${id}`, body),
    summary: () => get<SupplierSummary>('/suppliers/summary'),
    getPerformance: (id: string) => get<SupplierPerformance[]>(`/suppliers/${id}/performance`),
    addPerformance: (id: string, body: any) => post<SupplierPerformance>(`/suppliers/${id}/performance`, body),
  },

  contracts: {
    list: () => get<Contract[]>('/contracts'),
    getById: (id: string) => get<Contract>(`/contracts/${id}`),
    create: (body: any) => post<Contract>('/contracts', body),
    update: (id: string, body: any) => put<Contract>(`/contracts/${id}`, body),
    getExpiring: (days?: number) => get<Contract[]>(`/contracts/expiring?days=${days || 30}`),
  },

  budgets: {
    list: (year?: number) => get<Budget[]>(`/budgets${year ? `?year=${year}` : ''}`),
    getById: (id: string) => get<Budget>(`/budgets/${id}`),
    create: (body: any) => post<Budget>('/budgets', body),
    update: (id: string, body: any) => put<Budget>(`/budgets/${id}`, body),
    summary: (year?: number) => get<BudgetSummary>(`/budgets/summary${year ? `?year=${year}` : ''}`),
  },

  goodsReceivings: {
    list: (params?: Record<string, string>) =>
      get<GoodsReceiving[]>(`/goods-receivings?${new URLSearchParams(params ?? {}).toString()}`),
    summary: () => get<GrnSummary>('/goods-receivings/summary'),
    getById: (id: string) => get<GoodsReceiving>(`/goods-receivings/${id}`),
    create: (body: any) => post<GoodsReceiving>('/goods-receivings', body),
    getByPoId: (poId: string) => get<GoodsReceiving[]>(`/goods-receivings/po/${poId}`),
    poContext: (poId: string) => get<PoReceivingContext>(`/goods-receivings/po/${poId}/context`),
  },

  returns: {
    list: (params?: Record<string, string>) =>
      get<GoodsReturn[]>(`/returns?${new URLSearchParams(params ?? {}).toString()}`),
    summary: () => get<ReturnSummary>('/returns/summary'),
    getById: (id: string) => get<GoodsReturn>(`/returns/${id}`),
    create: (body: any) => post<GoodsReturn>('/returns', body),
    updateStatus: (id: string, status: string) => put<GoodsReturn>(`/returns/${id}/status`, { status }),
    grnContext: (grnId: string) => get<GrnReturnContext>(`/returns/grn/${grnId}/context`),
  },

  notifications: {
    list: () => get<Notification[]>('/notifications'),
    unreadCount: () => get<{ count: number }>('/notifications/unread-count'),
    markAsRead: (id: string) => put(`/notifications/${id}/read`),
    markAllAsRead: () => put('/notifications/read-all'),
  },

  departments: {
    list: () => get<Department[]>('/departments'),
  },

  settings: {
    getReceipt: () => get<import('@/types/settings').ProcurementReceiptSettings>('/settings/receipt'),
    updateReceipt: (body: import('@/types/settings').ProcurementReceiptSettings) =>
      put('/settings/receipt', body),
    getAcademic: () => get<import('@/lib/academic-settings').AcademicSettings>('/settings/academic'),
    updateAcademic: (body: import('@/lib/academic-settings').AcademicSettings) =>
      put('/settings/academic', body),
    getOrgProfile: () => get<import('@/types/settings').OrgSchoolProfile | null>('/settings/org-profile'),
  },

  categories: {
    list: () => get<ProcurementCategory[]>('/categories'),
  },

  analytics: {
    procurement: (params?: Record<string, string>) =>
      get<import('@/types/analytics').ProcurementAnalyticsData>(
        `/analytics/procurement?${new URLSearchParams(params).toString()}`,
      ),
    departmentSpending: (params?: Record<string, string>) =>
      get<import('@/types/analytics').DepartmentSpendingData>(
        `/analytics/department-spending?${new URLSearchParams(params).toString()}`,
      ),
    departmentDetail: (departmentId: string, params?: Record<string, string>) =>
      get<import('@/types/analytics').DepartmentDetailData>(
        `/analytics/department-spending/${departmentId}?${new URLSearchParams(params).toString()}`,
      ),
    requesterAnalysis: (params?: Record<string, string>) =>
      get<import('@/types/analytics').RequesterAnalysisData>(
        `/analytics/requester-analysis?${new URLSearchParams(params).toString()}`,
      ),
    requesterProfile: (requesterId: string, params?: Record<string, string>) =>
      get<import('@/types/analytics').RequesterProfileData>(
        `/analytics/requester-analysis/${requesterId}?${new URLSearchParams(params).toString()}`,
      ),
  },
};

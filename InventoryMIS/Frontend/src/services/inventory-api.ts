import { api } from './api';
import type {
  ApiResponse, DashboardData, ProductCategory, Product, ProductStockSummary,
  Store, StoreShelf, Supplier, StockReceiving, StockIssue, StockTransfer,
  StockAdjustment, StockRequest, PhysicalStockCount, Disposal,
  CategoryConsumption, StockMovement,
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

export const inventoryApi = {
  dashboard: {
    get: () => get<DashboardData>('/dashboard'),
  },
  analytics: {
    dashboard: () => get<DashboardData>('/analytics/dashboard'),
    categoryConsumption: () => get<CategoryConsumption[]>('/analytics/category-consumption'),
    stockMovement: () => get<StockMovement>('/analytics/stock-movement'),
  },
  categories: {
    list: () => get<ProductCategory[]>('/categories'),
    getById: (id: string) => get<ProductCategory>(`/categories/${id}`),
    create: (body: { name: string; description?: string }) => post<ProductCategory>('/categories', body),
    update: (id: string, body: Partial<ProductCategory>) => put<ProductCategory>(`/categories/${id}`, body),
    remove: (id: string) => del(`/categories/${id}`),
  },
  products: {
    list: (params?: { categoryId?: string; status?: string; search?: string }) =>
      get<Product[]>(`/products?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<Product>(`/products/${id}`),
    stockSummary: () => get<ProductStockSummary[]>('/products/stock-summary'),
    create: (body: any) => post<Product>('/products', body),
    update: (id: string, body: any) => put<Product>(`/products/${id}`, body),
    remove: (id: string) => del(`/products/${id}`),
  },
  stores: {
    list: () => get<Store[]>('/stores'),
    getById: (id: string) => get<Store>(`/stores/${id}`),
    create: (body: any) => post<Store>('/stores', body),
    update: (id: string, body: any) => put<Store>(`/stores/${id}`, body),
    remove: (id: string) => del(`/stores/${id}`),
    shelves: {
      list: (storeId: string) => get<StoreShelf[]>(`/stores/${storeId}/shelves`),
      create: (storeId: string, body: { name: string; code: string; description?: string }) =>
        post<StoreShelf>(`/stores/${storeId}/shelves`, body),
    },
  },
  suppliers: {
    list: () => get<Supplier[]>('/suppliers'),
    getById: (id: string) => get<Supplier>(`/suppliers/${id}`),
    create: (body: any) => post<Supplier>('/suppliers', body),
    update: (id: string, body: any) => put<Supplier>(`/suppliers/${id}`, body),
  },
  receivings: {
    list: (params?: {
      search?: string;
      supplierId?: string;
      storeId?: string;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.supplierId) qs.set('supplierId', params.supplierId);
      if (params?.storeId) qs.set('storeId', params.storeId);
      if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
      if (params?.dateTo) qs.set('dateTo', params.dateTo);
      const query = qs.toString();
      return get<StockReceiving[]>(`/receivings${query ? `?${query}` : ''}`);
    },
    getById: (id: string) => get<StockReceiving>(`/receivings/${id}`),
    create: (body: any) => post<StockReceiving>('/receivings', body),
    update: (id: string, body: any) => put<StockReceiving>(`/receivings/${id}`, body),
    remove: (id: string) => del(`/receivings/${id}`),
  },
  issues: {
    list: () => get<StockIssue[]>('/issues'),
    getById: (id: string) => get<StockIssue>(`/issues/${id}`),
    create: (body: any) => post<StockIssue>('/issues', body),
    approve: (id: string) => put<StockIssue>(`/issues/${id}/approve`),
    reject: (id: string, reason?: string) => put<StockIssue>(`/issues/${id}/reject`, { reason }),
  },
  transfers: {
    list: () => get<StockTransfer[]>('/transfers'),
    getById: (id: string) => get<StockTransfer>(`/transfers/${id}`),
    create: (body: any) => post<StockTransfer>('/transfers', body),
    approve: (id: string) => put<StockTransfer>(`/transfers/${id}/approve`),
    receive: (id: string) => put<StockTransfer>(`/transfers/${id}/receive`),
    reject: (id: string, reason?: string) => put<StockTransfer>(`/transfers/${id}/reject`, { reason }),
  },
  adjustments: {
    list: () => get<StockAdjustment[]>('/adjustments'),
    getById: (id: string) => get<StockAdjustment>(`/adjustments/${id}`),
    create: (body: any) => post<StockAdjustment>('/adjustments', body),
  },
  stockRequests: {
    list: (status?: string) => get<StockRequest[]>(`/stock-requests${status ? `?status=${status}` : ''}`),
    getById: (id: string) => get<StockRequest>(`/stock-requests/${id}`),
    create: (body: any) => post<StockRequest>('/stock-requests', body),
    update: (id: string, body: any) => put<StockRequest>(`/stock-requests/${id}`, body),
    remove: (id: string) => del(`/stock-requests/${id}`),
    addItem: (id: string, body: any) => post<any>(`/stock-requests/${id}/items`, body),
    updateItem: (id: string, itemId: string, body: any) => put<any>(`/stock-requests/${id}/items/${itemId}`, body),
    removeItem: (id: string, itemId: string) => del(`/stock-requests/${id}/items/${itemId}`),
    approve: (id: string) => put<StockRequest>(`/stock-requests/${id}/approve`),
    reject: (id: string, reason?: string) => put<StockRequest>(`/stock-requests/${id}/reject`, { reason }),
  },
  physicalCounts: {
    list: () => get<PhysicalStockCount[]>('/physical-counts'),
    getById: (id: string) => get<PhysicalStockCount>(`/physical-counts/${id}`),
    create: (body: any) => post<PhysicalStockCount>('/physical-counts', body),
    complete: (id: string) => put<PhysicalStockCount>(`/physical-counts/${id}/complete`),
  },
  disposals: {
    list: () => get<Disposal[]>('/disposals'),
    getById: (id: string) => get<Disposal>(`/disposals/${id}`),
    create: (body: any) => post<Disposal>('/disposals', body),
  },
};

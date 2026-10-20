import { api } from "./api";
import type {
  AcademicStudentResult,
  DashboardSummary,
  Fabric,
  FabricIssue,
  FabricPurchase,
  FabricSummary,
  OutstandingPayment,
  Payment,
  ProductionOrder,
  ReportResult,
  SchoolUniformSettings,
  StockBalance,
  StudentMeasurement,
  StudentUniformItem,
  Tailor,
  UniformCategory,
  UniformDistribution,
  DistributionReceipt,
  UniformReturn,
  ReturnAnalytics,
  UniformPackage,
  UniformProduct,
  UniformSale,
  UniformStudent,
  UniformVariant,
} from "@/types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function get<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<ApiEnvelope<T>>(url, body);
  return data.data;
}

async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiEnvelope<T>>(url, body);
  return data.data;
}

async function put<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<ApiEnvelope<T>>(url, body);
  return data.data;
}

async function del<T>(url: string): Promise<T> {
  const { data } = await api.delete<ApiEnvelope<T>>(url);
  return data.data;
}

export const uniformApi = {
  dashboard: {
    get: () => get<DashboardSummary>("/dashboard"),
  },

  settings: {
    get: () => get<SchoolUniformSettings>("/settings"),
    update: (body: Partial<SchoolUniformSettings>) =>
      patch<SchoolUniformSettings>("/settings", body),
  },

  orgProfile: {
    get: () =>
      get<{
        organizationId: string;
        schoolName: string;
        email?: string | null;
        phone?: string | null;
        poBox?: string | null;
        address?: string | null;
        logoUrl?: string | null;
        signatureUrl?: string | null;
        stampUrl?: string | null;
      } | null>("/org-profile"),
  },

  categories: {
    list: () => get<UniformCategory[]>("/categories"),
    create: (body: { name: string; description?: string }) =>
      post<UniformCategory>("/categories", body),
    update: (
      id: string,
      body: Partial<{ name: string; description?: string }>,
    ) => patch<UniformCategory>(`/categories/${id}`, body),
  },

  products: {
    list: (params?: {
      categoryId?: string;
      isActive?: boolean;
      search?: string;
    }) => get<UniformProduct[]>("/products", params),
    getById: (id: string) => get<UniformProduct>(`/products/${id}`),
    create: (body: Record<string, unknown>) =>
      post<UniformProduct>("/products", body),
    update: (id: string, body: Record<string, unknown>) =>
      patch<UniformProduct>(`/products/${id}`, body),
    remove: (id: string) => del<{ message: string }>(`/products/${id}`),
    createVariant: (productId: string, body: Record<string, unknown>) =>
      post<UniformVariant>(`/products/${productId}/variants`, body),
    updateVariant: (variantId: string, body: Record<string, unknown>) =>
      patch<UniformVariant>(`/variants/${variantId}`, body),
  },

  packages: {
    list: () => get<UniformPackage[]>("/packages"),
    create: (body: Record<string, unknown>) =>
      post<UniformPackage>("/packages", body),
    update: (id: string, body: Record<string, unknown>) =>
      patch<UniformPackage>(`/packages/${id}`, body),
  },

  stock: {
    list: (params?: { lowStockOnly?: boolean }) =>
      get<StockBalance[]>("/stock", params),
    adjust: (body: {
      variantId: string;
      type: string;
      quantity: number;
      reference?: string;
      notes?: string;
    }) =>
      post<{ movement: unknown; balance: StockBalance }>("/stock/adjust", body),
  },

  students: {
    list: (params?: { search?: string; className?: string }) =>
      get<UniformStudent[]>("/students", params),
    academicSearch: (q: string) =>
      get<AcademicStudentResult[]>("/students/academic-search", { q }),
    academicStatus: () =>
      get<{
        licensedInJwt: boolean;
        configured: boolean;
        reachable: boolean;
        studentCount: number;
      }>("/students/academic-status"),
    syncAcademic: () =>
      post<{
        fetched: number;
        created: number;
        updated: number;
        skipped: number;
        students: UniformStudent[];
      }>("/students/sync-academic", {}),
    importRows: (rows: Record<string, unknown>[]) =>
      post<{
        total: number;
        created: number;
        failed: number;
        errors: { row: number; message: string }[];
        students: UniformStudent[];
      }>("/students/import", { rows }),
    create: (body: Record<string, unknown>) =>
      post<UniformStudent>("/students", body),
    getById: (id: string) => get<UniformStudent>(`/students/${id}`),
    getProfile: (id: string) => get<UniformStudent>(`/students/${id}`),
    update: (id: string, body: Record<string, unknown>) =>
      patch<UniformStudent>(`/students/${id}`, body),
    upsertMeasurement: (id: string, body: Record<string, unknown>) =>
      put<StudentMeasurement>(`/students/${id}/measurements`, body),
    setChecklist: (
      id: string,
      items: {
        productId: string;
        variantId?: string;
        owned: boolean;
        quantity?: number;
      }[],
    ) => put<StudentUniformItem[]>(`/students/${id}/checklist`, { items }),
  },

  distributions: {
    list: (params?: { studentId?: string }) =>
      get<UniformDistribution[]>("/distributions", params),
    listReceipts: (params?: { studentId?: string; search?: string }) =>
      get<DistributionReceipt[]>("/distributions/receipts", params),
    getReceipt: (id: string) =>
      get<DistributionReceipt>(`/distributions/receipts/${id}`),
    create: (body: {
      studentId: string;
      variantId: string;
      quantity: number;
      academicYear?: string;
      status?: string;
      notes?: string;
    }) => post<UniformDistribution>("/distributions", body),
    issue: (body: {
      studentId: string;
      academicYear?: string;
      term?: string;
      notes?: string;
      status?: string;
      items: {
        variantId: string;
        quantity: number;
        unitPrice?: string | number;
      }[];
      payment?: {
        amount: string | number;
        method: string;
        discount?: string | number;
        scholarship?: string | number;
      };
    }) =>
      post<{
        distributions: UniformDistribution[];
        sale: UniformSale | null;
        distributionReceipt?: DistributionReceipt;
        receipt: {
          receiptNumber: string;
          student: UniformStudent;
          items: {
            name: string;
            size?: string | null;
            color?: string | null;
            quantity: number;
            unitPrice: number;
            total: number;
          }[];
          subtotal: number;
          discount: number;
          total: number;
          paid: number;
          balance: number;
          issuedAt: string;
          issuedBy?: string;
          notes?: string;
        };
      }>("/distributions/issue", body),
  },

  returns: {
    list: () => get<UniformReturn[]>("/returns"),
    analytics: () => get<ReturnAnalytics>("/returns/analytics"),
    create: (body: {
      receiptId: string;
      reason?: string;
      condition?: string;
      restock?: boolean;
      replaceItem?: boolean;
      exchange?: boolean;
      refundAmount?: string | number;
      notes?: string;
      lines: {
        distributionId?: string;
        variantId: string;
        quantity: number;
        reason?: string;
        exchangeVariantId?: string;
      }[];
    }) => post<UniformReturn>("/returns", body),
  },

  sales: {
    list: (params?: { studentId?: string; paymentStatus?: string }) =>
      get<UniformSale[]>("/sales", params),
    create: (body: Record<string, unknown>) =>
      post<UniformSale>("/sales", body),
    addPayment: (
      saleId: string,
      body: {
        amount: string | number;
        method: string;
        status?: string;
        notes?: string;
      },
    ) => post<Payment>(`/sales/${saleId}/payments`, body),
  },

  payments: {
    listOutstanding: () => get<OutstandingPayment[]>("/payments"),
  },

  fabrics: {
    list: () => get<Fabric[]>("/fabrics"),
    create: (body: Record<string, unknown>) => post<Fabric>("/fabrics", body),
    update: (id: string, body: Record<string, unknown>) =>
      patch<Fabric>(`/fabrics/${id}`, body),
    remove: (id: string) => del<{ message: string }>(`/fabrics/${id}`),
    summary: () => get<FabricSummary>("/fabrics/summary"),
    stockIn: (body: Record<string, unknown>) =>
      post<{ fabric: Fabric; purchase: FabricPurchase }>(
        "/fabric-stock-in",
        body,
      ),
    purchases: () => get<FabricPurchase[]>("/fabric-purchases"),
  },

  fabricIssues: {
    list: () => get<FabricIssue[]>("/fabric-issues"),
    create: (body: {
      fabricId: string;
      tailorId?: string;
      meters: string | number;
      expectedPieces?: number;
      notes?: string;
    }) => post<FabricIssue>("/fabric-issues", body),
    update: (
      id: string,
      body: {
        fabricId?: string;
        tailorId?: string;
        meters?: string | number;
        expectedPieces?: number;
        notes?: string;
      },
    ) => patch<FabricIssue>(`/fabric-issues/${id}`, body),
    remove: (id: string) => del<{ message: string }>(`/fabric-issues/${id}`),
  },

  tailors: {
    list: () => get<Tailor[]>("/tailors"),
    create: (body: Record<string, unknown>) => post<Tailor>("/tailors", body),
    update: (id: string, body: Record<string, unknown>) =>
      patch<Tailor>(`/tailors/${id}`, body),
  },

  productionOrders: {
    list: (params?: { status?: string }) =>
      get<ProductionOrder[]>("/production-orders", params),
    create: (body: Record<string, unknown>) =>
      post<ProductionOrder>("/production-orders", body),
    update: (id: string, body: Record<string, unknown>) =>
      patch<ProductionOrder>(`/production-orders/${id}`, body),
    receive: (
      id: string,
      body: {
        receivedQty: number;
        damagedQty?: number;
        unfinishedQty?: number;
        notes?: string;
      },
    ) => post<unknown>(`/production-orders/${id}/receive`, body),
  },

  reports: {
    get: <T = Record<string, unknown>>(
      type: string,
      params?: {
        dateFrom?: string;
        dateTo?: string;
        status?: string;
        search?: string;
      },
    ) => get<ReportResult<T>>(`/reports/${type}`, params),
    run: <T = Record<string, unknown>>(
      type: string,
      params?: {
        dateFrom?: string;
        dateTo?: string;
        status?: string;
        search?: string;
      },
    ) => get<ReportResult<T>>(`/reports/${type}`, params),
  },
};

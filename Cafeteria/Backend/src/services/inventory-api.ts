import { env } from '../config/env';

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  unitOfMeasure?: string;
}

interface InventoryStockRequestItem {
  productId: string;
  quantityRequested: number;
  notes?: string;
}

export interface InventoryStockRequest {
  id: string;
  requestNumber: string;
  status: string;
  departmentName?: string;
  purpose?: string;
  notes?: string;
  approvedBy?: string;
  issuedAsIssueId?: string;
  createdAt?: string;
  updatedAt?: string;
  store?: { id: string; name: string };
  items?: Array<{
    id: string;
    productId: string;
    quantityRequested: string;
    quantityApproved?: string | null;
    quantityIssued?: string | null;
    notes?: string;
    product?: { id: string; name: string; sku: string; unitOfMeasure: string };
  }>;
}

export class InventoryApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.INVENTORY_API_URL;
    this.serviceKey = env.INVENTORY_SERVICE_KEY;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.serviceKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`InventoryMIS API ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    return json.data ?? json;
  }

  async createStockRequest(organizationId: string, data: {
    departmentName: string;
    purpose?: string;
    notes?: string;
    items: InventoryStockRequestItem[];
  }): Promise<InventoryStockRequest> {
    return this.request<InventoryStockRequest>('POST', '/service/stock-requests', {
      organizationId,
      ...data,
      departmentName: data.departmentName || 'Cafeteria',
    });
  }

  async getStockRequest(organizationId: string, stockRequestId: string): Promise<InventoryStockRequest> {
    return this.request<InventoryStockRequest>('GET', `/service/stock-requests/${stockRequestId}?organizationId=${organizationId}`);
  }

  async listStockRequests(organizationId: string, status?: string): Promise<InventoryStockRequest[]> {
    const qs = status ? `?organizationId=${organizationId}&status=${status}` : `?organizationId=${organizationId}`;
    return this.request<InventoryStockRequest[]>('GET', `/service/stock-requests${qs}`);
  }

  async approveStockRequest(organizationId: string, stockRequestId: string): Promise<InventoryStockRequest> {
    return this.request<InventoryStockRequest>('PUT', `/service/stock-requests/${stockRequestId}/approve`, { organizationId });
  }

  async rejectStockRequest(organizationId: string, stockRequestId: string, reason?: string): Promise<InventoryStockRequest> {
    return this.request<InventoryStockRequest>('PUT', `/service/stock-requests/${stockRequestId}/reject`, { organizationId, reason });
  }

  async issueStockRequest(organizationId: string, stockRequestId: string): Promise<InventoryStockRequest> {
    return this.request<InventoryStockRequest>('PUT', `/service/stock-requests/${stockRequestId}/issue`, { organizationId });
  }

  async createGrnForRequest(organizationId: string, stockRequestId: string, data: {
    notes?: string;
    receivedDate?: string;
    items: Array<{ productId: string; quantity: number; unitCost?: number; batchNumber?: string }>;
  }): Promise<any> {
    return this.request('POST', `/service/stock-requests/${stockRequestId}/grn`, { organizationId, ...data });
  }

  async getGrnForRequest(organizationId: string, stockRequestId: string): Promise<any> {
    return this.request('GET', `/service/stock-requests/${stockRequestId}/grn?organizationId=${organizationId}`);
  }

  async getProducts(organizationId: string, search?: string): Promise<InventoryProduct[]> {
    const qs = search ? `?organizationId=${organizationId}&search=${encodeURIComponent(search)}` : `?organizationId=${organizationId}`;
    return this.request<InventoryProduct[]>('GET', `/service/products${qs}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl.replace('/api', '')}/api/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const inventoryApi = new InventoryApiClient();

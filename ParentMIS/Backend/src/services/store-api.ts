import { env } from '../config/env';

export interface StoreResponse {
  products: {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    imageUrl: string | null;
  }[];
  orders: {
    id: string;
    date: string;
    total: number;
    status: string;
    items: {
      id: string;
      name: string;
      quantity: number;
      price: number;
    }[];
  }[];
}

export class StoreApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.SHULEKIT_API_URL;
    this.serviceKey = env.SERVICE_API_KEY;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.serviceKey,
        'x-source-service': 'parentmis',
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`ShuleKit MIS module API ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    return json.data ?? json;
  }

  async getStore(
    organizationId: string,
    studentCode: string
  ): Promise<StoreResponse> {
    return this.request<StoreResponse>(
      `/service/store?organizationId=${encodeURIComponent(organizationId)}&studentCode=${encodeURIComponent(studentCode)}`
    );
  }

  async createOrder(
    organizationId: string,
    studentCode: string,
    input: {
      studentName: string;
      className: string;
      parentName: string;
      items: { productId: string; quantity: number }[];
    }
  ): Promise<{ id: string; total: number; status: string }> {
    return this.request(`/service/store/orders`, {
      method: 'POST',
      body: JSON.stringify({ organizationId, studentCode, ...input }),
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const storeApi = new StoreApiClient();

import { env } from '../config/env';

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  unitOfMeasure?: string | null;
  category?: { id: string; name: string } | null;
}

/**
 * Minimal InventoryMIS service client.
 * Used by Excel imports to reconcile item names with the school's inventory.
 */
export class InventoryClient {
  private baseUrl = env.INVENTORY_API_URL;
  private serviceKey = env.INVENTORY_SERVICE_KEY;

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.serviceKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`InventoryMIS API ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    return json.data ?? json;
  }

  async listProducts(organizationId: string, search?: string): Promise<InventoryProduct[]> {
    const params = new URLSearchParams({ organizationId });
    if (search) params.set('search', search);
    const data = await this.request<any[]>(`/service/products?${params.toString()}`);
    if (!Array.isArray(data)) return [];
    return data.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      unitOfMeasure: product.unitOfMeasure ?? null,
      category: product.category ?? null,
    }));
  }
}

export const inventoryClient = new InventoryClient();

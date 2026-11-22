import { env } from '../config/env';

export type CanteenPurchaseEvent = {
  organizationId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  saleId: string;
  amount: number;
  balanceAfter: number;
  items: { name: string; quantity: number }[];
};

export const parentMisClient = {
  async notifyCanteenPurchase(event: CanteenPurchaseEvent): Promise<number | null> {
    const baseUrl = env.PARENT_MIS_API_URL.replace(/\/$/, '');
    if (!baseUrl) return null;

    try {
      const response = await fetch(`${baseUrl}/webhooks/canteen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': env.SERVICE_API_KEY,
          'x-source-service': 'canteen',
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        console.warn(`[Canteen ParentMIS] webhook failed: ${response.status}`);
        return null;
      }

      const result = await response.json() as { data?: { matched?: number } };
      return result.data?.matched ?? 0;
    } catch (error) {
      console.warn('[Canteen ParentMIS] notification unavailable', error);
      return null;
    }
  },
};
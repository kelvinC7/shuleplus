import { env } from '../config/env';

export interface WalletSummary {
  id: string;
  balance: number;
  currency: string;
  cardNumber: string;
  studentName: string;
  className: string | null;
  status: string;
  lastTopUp: string | null;
  lastTopUpAmount: number | null;
  recentTransactions: {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: string;
    balanceAfter: number;
  }[];
}

export class WalletApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.CANTEEN_API_URL;
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
      throw new Error(`Canteen module API ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    return json.data ?? json;
  }

  async getWalletSummary(organizationId: string, studentCode: string): Promise<WalletSummary> {
    return this.request<WalletSummary>(
      `/service/wallet?organizationId=${encodeURIComponent(organizationId)}&studentCode=${encodeURIComponent(studentCode)}`
    );
  }

  async topUp(
    organizationId: string,
    studentCode: string,
    amount: number,
    method: string
  ): Promise<{ balance: number; currency: string }> {
    return this.request(`/service/wallet/topup`, {
      method: 'POST',
      body: JSON.stringify({ organizationId, studentCode, amount, method }),
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

export const walletApi = new WalletApiClient();

import http from 'node:http';
import https from 'node:https';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface XentriPayCollectionInput {
  email: string;
  cname: string;
  amount: number;
  cnumber: string;
  msisdn: string;
  currency: string;
  pmethod: 'momo' | 'cc';
  chargesIncluded: boolean;
  customerRef?: string;
}

export interface XentriPayCollectionInit {
  reply?: string;
  url?: string;
  success?: number;
  authkey?: string;
  tid?: string;
  refid: string;
  retcode?: number;
}

export interface XentriPayCollectionStatus {
  customerRef?: string;
  rid?: string;
  status?: string;
  updatedAt?: string;
}

export class XentriPayApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.XENTRIPAY_BASE_URL;
    this.apiKey = env.XENTRIPAY_KEY;
  }

  private headers(): Record<string, string> {
    if (!this.apiKey) {
      throw new AppError(503, 'XentriPay is not configured on this server');
    }
    return {
      'Content-Type': 'application/json',
      'X-XENTRIPAY-KEY': this.apiKey,
    };
  }

  private request(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<{ status: number; json: any }> {
    const headers = this.headers();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    if (payload) headers['Content-Length'] = String(Buffer.byteLength(payload));

    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${path}`);
      const transport = url.protocol === 'http:' ? http : https;
      const req = transport.request(
        url,
        { method, headers, timeout: 20000, family: 4 },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            let json: any = null;
            try {
              json = text ? JSON.parse(text) : null;
            } catch {
              json = { message: text };
            }
            resolve({ status: res.statusCode ?? 0, json });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error('XentriPay request timed out'));
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  async initiateCollection(input: XentriPayCollectionInput): Promise<XentriPayCollectionInit> {
    let response: { status: number; json: any };
    try {
      response = await this.request('POST', '/collections/initiate', input);
    } catch (error) {
      throw new AppError(
        502,
        `Could not reach XentriPay: ${(error as Error).message || 'network error'}`
      );
    }

    const { status, json } = response;
    if (status < 200 || status >= 300 || json?.success === 0 || !json?.refid) {
      const message =
        json?.message ?? json?.reply ?? `XentriPay rejected the collection (${status})`;
      throw new AppError(502, String(message));
    }

    return json as XentriPayCollectionInit;
  }

  async getCollectionStatus(reference: string): Promise<XentriPayCollectionStatus> {
    let response: { status: number; json: any };
    try {
      response = await this.request(
        'GET',
        `/collections/status/${encodeURIComponent(reference)}`
      );
    } catch (error) {
      throw new AppError(
        502,
        `Could not reach XentriPay: ${(error as Error).message || 'network error'}`
      );
    }

    const { status, json } = response;
    if (status < 200 || status >= 300) {
      const message = json?.message ?? `XentriPay status check failed (${status})`;
      throw new AppError(502, String(message));
    }

    return (json?.data ?? json) as XentriPayCollectionStatus;
  }
}

export const xentripayApi = new XentriPayApiClient();

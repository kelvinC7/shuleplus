import { api } from './api';

export type SmsUsage = {
  smsEnabled: boolean;
  maxSegments: number;
  segmentsUsed: number;
  remaining: number;
  quotaPeriod: string;
  delivered: number;
  failed: number;
  warnAt80?: boolean;
  warnAt90?: boolean;
};

export type SmsPreviewRecipient = {
  parentName: string | null;
  phoneMasked: string;
  studentSummary: string | null;
  messageBody: string;
  segments: number;
};

export type SmsPreviewResult = {
  recipientCount: number;
  segmentsTotal: number;
  missingContacts: number;
  duplicatePhones: number;
  preview: SmsPreviewRecipient[];
};

export type StudentDirectoryRow = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  parents: Array<{ parentId: string; fullName: string; phone: string; role: string; smsEnabled: boolean }>;
};

export type SendPayload = {
  mode: 'SELECTED_STUDENTS' | 'CUSTOM_NUMBERS' | 'BULK_CLASS' | 'BULK_SCHOOL';
  message: string;
  parentTarget?: 'FATHER' | 'MOTHER' | 'BOTH';
  className?: string;
  studentIds?: string[];
  customNumbers?: string[];
};

export const smsApi = {
  usage: () => api.get<{ data: SmsUsage }>('/sms/usage'),
  students: (params?: { q?: string; className?: string }) =>
    api.get<{ data: StudentDirectoryRow[] }>('/sms/students', { params }),
  classes: () => api.get<{ data: string[] }>('/sms/classes'),
  preview: (body: SendPayload) => api.post<{ data: SmsPreviewResult }>('/sms/preview', body),
  send: (body: SendPayload) => api.post('/sms/send', body),
  campaigns: () => api.get('/sms/campaigns'),
  recipients: (campaignId: string) => api.get(`/sms/campaigns/${campaignId}/recipients`),
  deliveryReport: (params?: {
    campaignId?: string;
    status?: string;
    student?: string;
    term?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get<{ data: DeliveryReportResult }>('/sms/delivery-report', { params }),
  parentHistory: (phoneNormalized: string) =>
    api.get<{ data: DeliveryReportRow[] }>('/sms/parent-history', { params: { phone: phoneNormalized } }),
};

export type DeliveryReportRow = {
  id: string;
  phoneNormalized?: string;
  parentName: string | null;
  phoneMasked: string;
  studentSummary: string | null;
  status: string;
  segments: number;
  failureReason: string | null;
  messageBody: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  campaign: { id: string; createdAt: string; status: string; mode: string; recipientCount: number };
};

export type DeliveryReportResult = {
  rows: DeliveryReportRow[];
  summary: {
    totalMessages: number;
    delivered: number;
    failed: number;
    pending: number;
    segments: number;
  };
};

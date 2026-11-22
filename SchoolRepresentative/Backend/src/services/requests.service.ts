import { env } from '../config/env';
import { moduleRequest } from '../clients/module.client';
import { AppError } from '../middleware/error.middleware';
import { actorOf, recordAudit } from './console.service';
import type { AuthState } from '../middleware/auth.middleware';

export type RequestSource = 'transport' | 'procurement';
export type RequestKind = 'change' | 'issue' | 'purchase';

export interface UnifiedRequest {
  id: string;
  source: RequestSource;
  kind: RequestKind;
  module: 'Transport' | 'ProcurementMIS';
  title: string;
  subtitle: string;
  requester: string;
  status: string;
  priority: string;
  amount?: number | null;
  currency?: string | null;
  date: string | null;
  description?: string;
  meta: Record<string, unknown>;
}

type ChangeRow = {
  id: string;
  type: string;
  details: string | null;
  status: string;
  createdAt: string;
  schoolResponse?: string | null;
  student?: { firstName?: string; lastName?: string; shuleCode?: string; className?: string } | null;
  parent?: { fullName?: string } | null;
};

type IssueRow = {
  id: string;
  type: string;
  details: string | null;
  status: string;
  createdAt: string;
  student?: { firstName?: string; lastName?: string; shuleCode?: string; className?: string } | null;
  parent?: { fullName?: string } | null;
};

type PurchaseRow = {
  id: string;
  requestNumber?: string;
  title?: string;
  status: string;
  totalAmount?: number | string | null;
  requestedByName?: string;
  requesterName?: string;
  department?: { name?: string } | null;
  priority?: string;
  createdAt?: string;
  description?: string | null;
};

function studentName(s?: { firstName?: string; lastName?: string; shuleCode?: string } | null) {
  if (!s) return 'Student';
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.shuleCode || 'Student';
}

function mapChange(r: ChangeRow): UnifiedRequest {
  return {
    id: r.id,
    source: 'transport',
    kind: 'change',
    module: 'Transport',
    title: `${r.type.replace(/_/g, ' ')} change request`,
    subtitle: `${studentName(r.student)}${r.student?.className ? ` · ${r.student.className}` : ''}`,
    requester: r.parent?.fullName ?? 'Parent',
    status: r.status,
    priority: r.status === 'PENDING' ? 'HIGH' : 'NORMAL',
    date: r.createdAt ?? null,
    description: r.details ?? undefined,
    meta: { schoolResponse: r.schoolResponse ?? null, type: r.type },
  };
}

function mapIssue(r: IssueRow): UnifiedRequest {
  return {
    id: r.id,
    source: 'transport',
    kind: 'issue',
    module: 'Transport',
    title: `${r.type.replace(/_/g, ' ')} report`,
    subtitle: `${studentName(r.student)}${r.student?.className ? ` · ${r.student.className}` : ''}`,
    requester: r.parent?.fullName ?? 'Parent',
    status: r.status,
    priority: r.status === 'OPEN' ? 'HIGH' : r.status === 'IN_REVIEW' ? 'MEDIUM' : 'NORMAL',
    date: r.createdAt ?? null,
    description: r.details ?? undefined,
    meta: { type: r.type },
  };
}

function mapPurchase(r: PurchaseRow): UnifiedRequest {
  const amount = r.totalAmount == null ? null : Number(r.totalAmount);
  return {
    id: r.id,
    source: 'procurement',
    kind: 'purchase',
    module: 'ProcurementMIS',
    title: r.title ?? r.requestNumber ?? 'Purchase request',
    subtitle: r.department?.name ?? r.requestNumber ?? 'Procurement',
    requester: r.requestedByName ?? r.requesterName ?? 'Staff',
    status: r.status,
    priority: r.priority ?? 'MEDIUM',
    amount: Number.isFinite(amount) ? amount : null,
    currency: 'RWF',
    date: r.createdAt ?? null,
    description: r.description ?? undefined,
    meta: { requestNumber: r.requestNumber ?? null },
  };
}

async function listTransport(organizationId: string, status?: string) {
  const [changes, issues] = await Promise.all([
    moduleRequest<ChangeRow[]>({
      service: 'ParentMIS',
      baseUrl: env.PARENTMIS_API_URL,
      path: '/service/transport/change-requests',
      organizationId,
      query: status ? { status } : undefined,
    }).catch(() => [] as ChangeRow[]),
    moduleRequest<IssueRow[]>({
      service: 'ParentMIS',
      baseUrl: env.PARENTMIS_API_URL,
      path: '/service/transport/issue-reports',
      organizationId,
      query: status ? { status } : undefined,
    }).catch(() => [] as IssueRow[]),
  ]);
  return [...changes.map(mapChange), ...issues.map(mapIssue)];
}

async function listProcurement(organizationId: string, status?: string) {
  const rows = await moduleRequest<PurchaseRow[]>({
    service: 'ProcurementMIS',
    baseUrl: env.PROCUREMENT_API_URL,
    path: '/service/purchase-requests',
    organizationId,
    query: status ? { status } : undefined,
  }).catch(() => [] as PurchaseRow[]);
  return rows.map(mapPurchase);
}

export async function listRequests(input: { organizationId: string; source?: string; status?: string }) {
  const wantTransport = !input.source || input.source === 'transport' || input.source === 'all';
  const wantProcurement = !input.source || input.source === 'procurement' || input.source === 'all';
  const [transport, procurement] = await Promise.all([
    wantTransport ? listTransport(input.organizationId, input.status) : Promise.resolve([]),
    wantProcurement ? listProcurement(input.organizationId, input.status) : Promise.resolve([]),
  ]);
  const items = [...procurement, ...transport].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const pendingStatuses = new Set(['PENDING', 'OPEN', 'IN_REVIEW', 'DEPARTMENT_HEAD_APPROVED', 'FINANCE_APPROVED', 'PROCUREMENT_APPROVED']);
  return {
    items,
    summary: {
      total: items.length,
      pending: items.filter((i) => pendingStatuses.has(i.status)).length,
      transport: transport.length,
      procurement: procurement.length,
    },
  };
}

export async function decideRequest(
  auth: AuthState,
  input: {
    organizationId: string;
    id: string;
    source: RequestSource;
    kind: RequestKind;
    action: 'APPROVE' | 'REJECT' | 'RESOLVE' | 'IN_REVIEW';
    comment?: string;
    reason?: string;
  }
) {
  const actor = actorOf(auth);
  let result: unknown;
  let summary = '';

  if (input.source === 'transport' && input.kind === 'change') {
    if (input.action !== 'APPROVE' && input.action !== 'REJECT') {
      throw new AppError(400, 'Transport change requests can be approved or rejected');
    }
    const status = input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    result = await moduleRequest({
      service: 'ParentMIS',
      baseUrl: env.PARENTMIS_API_URL,
      path: `/service/transport/change-requests/${encodeURIComponent(input.id)}`,
      organizationId: input.organizationId,
      method: 'POST',
      body: { status, schoolResponse: input.comment?.trim() || input.reason?.trim() || undefined },
    });
    summary = `${status} transport change request`;
  } else if (input.source === 'transport' && input.kind === 'issue') {
    const status =
      input.action === 'IN_REVIEW' ? 'IN_REVIEW' : input.action === 'RESOLVE' || input.action === 'APPROVE' ? 'RESOLVED' : 'CLOSED';
    // ParentMIS uses PATCH on /service/transport/issue-reports/:id; moduleRequest supports GET/POST, so use fetch directly via it? moduleRequest only GET/POST
    const url = `${env.PARENTMIS_API_URL}/service/transport/issue-reports/${encodeURIComponent(input.id)}?organizationId=${encodeURIComponent(input.organizationId)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'director-console',
        'x-organization-id': input.organizationId,
      },
      body: JSON.stringify({ status }),
      signal: AbortSignal.timeout(8_000),
    });
    const body = await res.json().catch(() => ({} as { message?: string; data?: unknown }));
    if (!res.ok) throw new AppError(res.status, (body as { message?: string }).message ?? 'ParentMIS request failed');
    result = (body as { data?: unknown }).data ?? body;
    summary = `Updated transport issue report → ${status}`;
  } else if (input.source === 'procurement' && input.kind === 'purchase') {
    if (input.action !== 'APPROVE' && input.action !== 'REJECT') {
      throw new AppError(400, 'Purchase requests can be approved or rejected');
    }
    if (input.action === 'REJECT' && !input.reason?.trim()) {
      throw new AppError(400, 'A rejection reason is required');
    }
    const endpoint = input.action === 'APPROVE' ? 'approve' : 'reject';
    // moduleRequest supports GET/POST; procurement routes registered as PUT, so direct fetch
    const url = `${env.PROCUREMENT_API_URL}/service/purchase-requests/${encodeURIComponent(input.id)}/${endpoint}?organizationId=${encodeURIComponent(input.organizationId)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'director-console',
        'x-organization-id': input.organizationId,
      },
      body: JSON.stringify({
        actorName: actor.name,
        comment: input.comment?.trim() || undefined,
        reason: input.reason?.trim() || undefined,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const body = await res.json().catch(() => ({} as { message?: string; data?: unknown }));
    if (!res.ok) throw new AppError(res.status, (body as { message?: string }).message ?? 'ProcurementMIS request failed');
    result = (body as { data?: unknown }).data ?? body;
    summary = `${input.action === 'APPROVE' ? 'Approved' : 'Rejected'} purchase request`;
  } else {
    throw new AppError(400, 'Unsupported request type');
  }

  await recordAudit({
    actor,
    action: `REQUEST_${input.action}`,
    module: input.source === 'procurement' ? 'Procurement' : 'Transport',
    targetType: input.kind,
    targetId: input.id,
    summary,
    organizationId: input.organizationId,
    meta: { comment: input.comment ?? null, reason: input.reason ?? null },
  });

  return { result, summary };
}

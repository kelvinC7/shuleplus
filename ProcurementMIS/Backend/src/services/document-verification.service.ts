import crypto from 'crypto';
import QRCode from 'qrcode';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import type { RequestVisibility } from '../utils/module-access';
import { normalizeItemName } from '../utils/item-match';

export const DOCUMENT_TYPES = [
  'PURCHASE_REQUEST',
  'PURCHASE_ORDER',
  'REQUISITION',
  'GOODS_RECEIVING',
  'GOODS_RETURN',
  'REPORT',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type Authenticity = 'VERIFIED' | 'PENDING' | 'REJECTED' | 'CANCELLED' | 'INVALID';

export interface EnsureVerificationInput {
  documentType: DocumentType;
  documentId?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface VerificationItem {
  itemName: string;
  unit?: string | null;
  quantity?: number | null;
  orderedQty?: number | null;
  receivedQty?: number | null;
  returnQty?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  reason?: string | null;
}

export interface VerificationRelated {
  type: string;
  label: string;
  reference: string;
}

interface DocumentSnapshot {
  reference: string;
  status: string;
  statusLabel: string;
  createdAt: Date | null;
  createdBy: string | null;
  department: string | null;
  requestedBy?: string;
  fields: { label: string; value: string }[];
  items: VerificationItem[];
  related: VerificationRelated[];
  authenticity: Authenticity;
}

export interface PublicVerificationResult {
  authenticity: Authenticity;
  authenticityLabel: string;
  documentType: DocumentType;
  documentTypeLabel: string;
  reference: string | null;
  status: string | null;
  statusLabel: string | null;
  organization: { name: string; logoUrl: string | null };
  createdAt: string | null;
  createdBy: string | null;
  department: string | null;
  fields: { label: string; value: string }[];
  items: VerificationItem[];
  related: VerificationRelated[];
  verifiedAt: string;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  PURCHASE_REQUEST: 'Purchase Request',
  PURCHASE_ORDER: 'Purchase Order',
  REQUISITION: 'Requisition',
  GOODS_RECEIVING: 'Goods Received Note',
  GOODS_RETURN: 'Purchase Return',
  REPORT: 'Procurement Report',
};

const AUTHENTICITY_LABELS: Record<Authenticity, string> = {
  VERIFIED: 'Verified',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  INVALID: 'Invalid',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  DEPARTMENT_HEAD_APPROVED: 'Department Head Approved',
  FINANCE_APPROVED: 'Finance Approved',
  PROCUREMENT_APPROVED: 'Procurement Approved',
  MD_APPROVED: 'Managing Director Approved',
  CONVERTED_TO_PO: 'Converted to Purchase Order',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  SENT: 'Sent to Supplier',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  PARTIALLY_DELIVERED: 'Partially Delivered',
  COMPLETED: 'Completed',
  PENDING_INSPECTION: 'Pending Inspection',
  PARTIALLY_RECEIVED: 'Partially Received',
  FULLY_RECEIVED: 'Fully Received',
  RECEIVED: 'Received',
  PENDING_APPROVAL: 'Pending Approval',
  SENT_TO_SUPPLIER: 'Sent to Supplier',
  REPLACEMENT_PENDING: 'Replacement Pending',
  REPLACED: 'Replaced',
  CREDIT_RECEIVED: 'Credit Received',
  CLOSED: 'Closed',
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getUTCDate()).padStart(2, '0')} ${
    MONTHS[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    Number(value),
  )} RWF`;
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function authenticityForStatus(documentType: DocumentType, status: string): Authenticity {
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'CANCELLED') return 'CANCELLED';

  switch (documentType) {
    case 'PURCHASE_REQUEST':
    case 'REQUISITION':
      return [
        'FINANCE_APPROVED',
        'PROCUREMENT_APPROVED',
        'MD_APPROVED',
        'CONVERTED_TO_PO',
      ].includes(status)
        ? 'VERIFIED'
        : 'PENDING';
    case 'PURCHASE_ORDER':
      return status === 'DRAFT' ? 'PENDING' : 'VERIFIED';
    case 'GOODS_RECEIVING':
      return ['DRAFT', 'PENDING_INSPECTION'].includes(status) ? 'PENDING' : 'VERIFIED';
    case 'GOODS_RETURN':
      return ['DRAFT', 'PENDING_APPROVAL'].includes(status) ? 'PENDING' : 'VERIFIED';
    case 'REPORT':
      return 'VERIFIED';
    default:
      return 'PENDING';
  }
}

function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export class DocumentVerificationService {
  verificationUrl(token: string): string {
    return `${env.PUBLIC_APP_URL}/verify/${encodeURIComponent(token)}`;
  }

  private async generateToken(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = crypto.randomBytes(24).toString('base64url');
      const exists = await prisma.documentVerification.findUnique({
        where: { token },
        select: { id: true },
      });
      if (!exists) return token;
    }
    throw new AppError(500, 'Unable to generate a verification token');
  }

  async ensure(
    organizationId: string,
    input: EnsureVerificationInput,
    visibility?: RequestVisibility,
  ): Promise<{
    documentType: DocumentType;
    documentTypeLabel: string;
    reference: string;
    token: string;
    url: string;
    qrDataUrl: string;
  }> {
    if (!isDocumentType(input.documentType)) {
      throw new AppError(400, 'Unsupported document type');
    }

    const documentType = input.documentType;
    let documentId = (input.documentId ?? '').trim();
    let reference = (input.reference ?? '').trim();
    const metadata: Record<string, unknown> | null = input.metadata ?? null;
    const metadataInput = (metadata ?? undefined) as unknown as
      | Prisma.InputJsonValue
      | undefined;

    if (documentType === 'REPORT') {
      documentId = documentId || crypto.randomUUID();
      if (!reference) {
        const now = new Date();
        reference = `RPT-${now.getFullYear().toString().slice(-2)}${String(
          now.getMonth() + 1,
        ).padStart(2, '0')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      }
      if (!metadata?.title) {
        throw new AppError(400, 'Report verification requires the report title');
      }
    } else {
      if (!documentId) throw new AppError(400, 'Document ID is required');
      const snapshot = await this.loadDocument(organizationId, documentType, documentId);
      if (!snapshot) throw new AppError(404, 'Document not found');

      if (
        visibility &&
        !visibility.canViewAll &&
        (documentType === 'PURCHASE_REQUEST' || documentType === 'REQUISITION') &&
        snapshot.requestedBy &&
        snapshot.requestedBy !== visibility.userId
      ) {
        throw new AppError(403, 'You do not have access to this document');
      }

      reference = snapshot.reference;
    }

    const existing = await prisma.documentVerification.findUnique({
      where: {
        organizationId_documentType_documentId: {
          organizationId,
          documentType,
          documentId,
        },
      },
    });

    let token = existing?.token;
    if (token) {
      await prisma.documentVerification.update({
        where: { id: existing!.id },
        data: {
          reference,
          metadata: metadataInput,
        },
      });
    } else {
      token = await this.generateToken();
      try {
        await prisma.documentVerification.create({
          data: {
            organizationId,
            documentType,
            documentId,
            reference,
            token,
            metadata: metadataInput,
          },
        });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          const raced = await prisma.documentVerification.findUnique({
            where: {
              organizationId_documentType_documentId: {
                organizationId,
                documentType,
                documentId,
              },
            },
          });
          if (!raced) throw error;
          token = raced.token;
        } else {
          throw error;
        }
      }
    }

    const url = this.verificationUrl(token!);
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 480,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    return {
      documentType,
      documentTypeLabel: DOCUMENT_TYPE_LABELS[documentType],
      reference,
      token: token!,
      url,
      qrDataUrl,
    };
  }

  async verifyPublic(
    token: string,
    request: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<PublicVerificationResult> {
    const verifiedAt = new Date().toISOString();
    const cleanToken = (token ?? '').trim();

    if (!cleanToken || cleanToken.length < 16) {
      await this.recordEvent({
        token: cleanToken,
        outcome: 'INVALID',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });
      return {
        authenticity: 'INVALID',
        authenticityLabel: AUTHENTICITY_LABELS.INVALID,
        documentType: 'PURCHASE_REQUEST',
        documentTypeLabel: DOCUMENT_TYPE_LABELS.PURCHASE_REQUEST,
        reference: null,
        status: null,
        statusLabel: null,
        organization: { name: 'ShulePlus', logoUrl: null },
        createdAt: null,
        createdBy: null,
        department: null,
        fields: [],
        items: [],
        related: [],
        verifiedAt,
      };
    }

    const verification = await prisma.documentVerification.findUnique({
      where: { token: cleanToken },
      include: { tenant: true },
    });

    if (!verification) {
      await this.recordEvent({
        token: cleanToken,
        outcome: 'INVALID',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });
      return {
        authenticity: 'INVALID',
        authenticityLabel: AUTHENTICITY_LABELS.INVALID,
        documentType: 'PURCHASE_REQUEST',
        documentTypeLabel: DOCUMENT_TYPE_LABELS.PURCHASE_REQUEST,
        reference: null,
        status: null,
        statusLabel: null,
        organization: { name: 'ShulePlus', logoUrl: null },
        createdAt: null,
        createdBy: null,
        department: null,
        fields: [],
        items: [],
        related: [],
        verifiedAt,
      };
    }

    const documentType = isDocumentType(verification.documentType)
      ? verification.documentType
      : 'PURCHASE_REQUEST';

    let snapshot: DocumentSnapshot | null = null;
    if (documentType === 'REPORT') {
      snapshot = this.reportSnapshot(
        verification.metadata,
        verification.createdAt,
        verification.reference,
      );
    } else {
      snapshot = await this.loadDocument(
        verification.organizationId,
        documentType,
        verification.documentId,
      );
    }

    if (!snapshot) {
      await this.recordEvent({
        verificationId: verification.id,
        organizationId: verification.organizationId,
        documentType,
        reference: verification.reference,
        token: cleanToken,
        outcome: 'INVALID',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });
      return {
        authenticity: 'INVALID',
        authenticityLabel: AUTHENTICITY_LABELS.INVALID,
        documentType,
        documentTypeLabel: DOCUMENT_TYPE_LABELS[documentType],
        reference: verification.reference,
        status: null,
        statusLabel: null,
        organization: {
          name: verification.tenant?.organizationName ?? 'ShulePlus',
          logoUrl: null,
        },
        createdAt: null,
        createdBy: null,
        department: null,
        fields: [],
        items: [],
        related: [],
        verifiedAt,
      };
    }

    await this.recordEvent({
      verificationId: verification.id,
      organizationId: verification.organizationId,
      documentType,
      reference: snapshot.reference,
      token: cleanToken,
      outcome: snapshot.authenticity,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    });

    return {
      authenticity: snapshot.authenticity,
      authenticityLabel: AUTHENTICITY_LABELS[snapshot.authenticity],
      documentType,
      documentTypeLabel: DOCUMENT_TYPE_LABELS[documentType],
      reference: snapshot.reference,
      status: snapshot.status,
      statusLabel: snapshot.statusLabel,
      organization: {
        name: verification.tenant?.organizationName ?? 'ShulePlus',
        logoUrl: null,
      },
      createdAt: snapshot.createdAt ? snapshot.createdAt.toISOString() : null,
      createdBy: snapshot.createdBy,
      department: snapshot.department,
      fields: snapshot.fields,
      items: snapshot.items,
      related: snapshot.related,
      verifiedAt,
    };
  }

  private reportSnapshot(
    metadata: Prisma.JsonValue | null,
    createdAt: Date,
    reference: string,
  ): DocumentSnapshot {
    const meta =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {};

    const period =
      typeof meta.period === 'string' && meta.period.trim()
        ? meta.period.trim()
        : '—';
    const generatedBy =
      typeof meta.generatedBy === 'string' && meta.generatedBy.trim()
        ? meta.generatedBy.trim()
        : '—';
    const generatedDate =
      typeof meta.generatedDate === 'string' && meta.generatedDate.trim()
        ? meta.generatedDate.trim()
        : formatDate(createdAt);
    const reportReference =
      reference?.trim() ||
      (typeof meta.reference === 'string' && meta.reference.trim()
        ? meta.reference.trim()
        : '—');

    return {
      reference: reportReference,
      status: 'GENERATED',
      statusLabel: 'Generated',
      createdAt,
      createdBy: generatedBy,
      department: null,
      authenticity: 'VERIFIED',
      fields: [
        { label: 'Report title', value: typeof meta.title === 'string' ? meta.title : '—' },
        { label: 'Reference', value: reportReference },
        { label: 'Reporting period', value: period },
        { label: 'Generated on', value: generatedDate },
        { label: 'Generated by', value: generatedBy },
      ],
      items: [],
      related: [],
    };
  }

  private async loadDocument(
    organizationId: string,
    documentType: DocumentType,
    documentId: string,
  ): Promise<DocumentSnapshot | null> {
    switch (documentType) {
      case 'PURCHASE_REQUEST':
      case 'REQUISITION':
        return this.loadPurchaseRequest(organizationId, documentId, documentType);
      case 'PURCHASE_ORDER':
        return this.loadPurchaseOrder(organizationId, documentId);
      case 'GOODS_RECEIVING':
        return this.loadGoodsReceiving(organizationId, documentId);
      case 'GOODS_RETURN':
        return this.loadGoodsReturn(organizationId, documentId);
      default:
        return null;
    }
  }

  private async loadPurchaseRequest(
    organizationId: string,
    documentId: string,
    documentType: 'PURCHASE_REQUEST' | 'REQUISITION',
  ): Promise<DocumentSnapshot | null> {
    const pr = await prisma.purchaseRequest.findFirst({
      where: { id: documentId, organizationId },
      include: {
        department: true,
        items: true,
        purchaseOrders: {
          include: {
            items: true,
            supplier: { select: { id: true, companyName: true } },
            goodsReceivings: {
              select: {
                id: true,
                grnNumber: true,
                receivedByName: true,
                status: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!pr) return null;

    const order = [...pr.purchaseOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    const orderItems = order?.items ?? [];
    const used = new Set<number>();

    const items = pr.items.map((item) => {
      const foundIndex = orderItems.findIndex(
        (candidate, candidateIndex) =>
          !used.has(candidateIndex) &&
          normalizeItemName(candidate.itemName) === normalizeItemName(item.itemName),
      );
      const orderItem = foundIndex >= 0 ? orderItems[foundIndex] : undefined;
      if (foundIndex >= 0) used.add(foundIndex);

      return {
        itemName: item.itemName,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: orderItem ? Number(orderItem.unitPrice) : null,
        totalPrice: orderItem ? Number(orderItem.totalPrice) : null,
      };
    });

    const latestGrn = pr.purchaseOrders
      .flatMap((po) => po.goodsReceivings)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const department = pr.departmentOther?.trim() || pr.department?.name || '—';
    const related: VerificationRelated[] = pr.purchaseOrders.map((po) => ({
      type: 'PURCHASE_ORDER',
      label: 'Purchase Order',
      reference: po.poNumber,
    }));

    const fields =
      documentType === 'REQUISITION'
        ? [
            { label: 'Requisition number', value: pr.prNumber },
            { label: 'Department', value: department },
            { label: 'Issued by', value: pr.requestedByName || '—' },
            { label: 'Received by', value: latestGrn?.receivedByName || '—' },
            { label: 'Needed by', value: formatDate(pr.neededDate) },
            { label: 'Status', value: statusLabel(pr.status) },
          ]
        : [
            { label: 'Request number', value: pr.prNumber },
            { label: 'Department', value: department },
            { label: 'Requester', value: pr.requestedByName || '—' },
            { label: 'Needed by', value: formatDate(pr.neededDate) },
            { label: 'Approval status', value: statusLabel(pr.status) },
          ];

    return {
      reference: pr.prNumber,
      status: pr.status,
      statusLabel: statusLabel(pr.status),
      createdAt: pr.createdAt,
      createdBy: pr.requestedByName ?? null,
      department,
      requestedBy: pr.requestedBy,
      fields,
      items,
      related,
      authenticity: authenticityForStatus(documentType, pr.status),
    };
  }

  private async loadPurchaseOrder(
    organizationId: string,
    documentId: string,
  ): Promise<DocumentSnapshot | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: documentId, organizationId },
      include: {
        supplier: { select: { id: true, companyName: true } },
        items: true,
        purchaseRequest: { include: { department: true } },
        goodsReceivings: { select: { id: true, grnNumber: true } },
      },
    });
    if (!po) return null;

    const prDepartment =
      po.purchaseRequest?.departmentOther?.trim() ||
      po.purchaseRequest?.department?.name ||
      '—';

    const related: VerificationRelated[] = [];
    if (po.purchaseRequest) {
      related.push({
        type: 'PURCHASE_REQUEST',
        label: 'Purchase Request',
        reference: po.purchaseRequest.prNumber,
      });
    }
    for (const grn of po.goodsReceivings) {
      related.push({ type: 'GOODS_RECEIVING', label: 'Goods Received Note', reference: grn.grnNumber });
    }

    return {
      reference: po.poNumber,
      status: po.status,
      statusLabel: statusLabel(po.status),
      createdAt: po.createdAt,
      createdBy: po.createdByName ?? null,
      department: prDepartment,
      fields: [
        { label: 'Purchase order number', value: po.poNumber },
        { label: 'Supplier', value: po.supplier?.companyName ?? '—' },
        { label: 'Related PR', value: po.purchaseRequest?.prNumber ?? '—' },
        { label: 'Department', value: prDepartment },
        { label: 'Order date', value: formatDate(po.orderDate) },
        { label: 'Approval status', value: statusLabel(po.status) },
        { label: 'Grand total', value: formatMoney(Number(po.totalAmount)) },
      ],
      items: po.items.map((item) => ({
        itemName: item.itemName,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      related,
      authenticity: authenticityForStatus('PURCHASE_ORDER', po.status),
    };
  }

  private async loadGoodsReceiving(
    organizationId: string,
    documentId: string,
  ): Promise<DocumentSnapshot | null> {
    const grn = await prisma.goodsReceiving.findFirst({
      where: { id: documentId, organizationId },
      include: {
        items: true,
        purchaseOrder: {
          include: {
            supplier: { select: { id: true, companyName: true } },
            items: true,
            purchaseRequest: { include: { department: true } },
          },
        },
      },
    });
    if (!grn) return null;

    const po = grn.purchaseOrder;
    const related: VerificationRelated[] = [
      { type: 'PURCHASE_ORDER', label: 'Purchase Order', reference: po.poNumber },
    ];
    if (po.purchaseRequest) {
      related.push({
        type: 'PURCHASE_REQUEST',
        label: 'Purchase Request',
        reference: po.purchaseRequest.prNumber,
      });
    }

    return {
      reference: grn.grnNumber,
      status: grn.status,
      statusLabel: statusLabel(grn.status),
      createdAt: grn.createdAt,
      createdBy: grn.receivedByName ?? null,
      department:
        po.purchaseRequest?.departmentOther?.trim() ||
        po.purchaseRequest?.department?.name ||
        '—',
      fields: [
        { label: 'GRN number', value: grn.grnNumber },
        { label: 'Related PO', value: po.poNumber },
        { label: 'Supplier', value: po.supplier?.companyName ?? '—' },
        { label: 'Receiving date', value: formatDate(grn.receivedDate) },
        { label: 'Received by', value: grn.receivedByName ?? '—' },
        { label: 'Status', value: statusLabel(grn.status) },
      ],
      items: grn.items.map((item) => ({
        itemName: item.itemName,
        orderedQty: Number(item.orderedQty),
        receivedQty: Number(item.receivedQty),
      })),
      related,
      authenticity: authenticityForStatus('GOODS_RECEIVING', grn.status),
    };
  }

  private async loadGoodsReturn(
    organizationId: string,
    documentId: string,
  ): Promise<DocumentSnapshot | null> {
    const ret = await prisma.goodsReturn.findFirst({
      where: { id: documentId, organizationId },
      include: {
        items: true,
        grn: {
          include: {
            purchaseOrder: {
              include: {
                supplier: { select: { id: true, companyName: true } },
                purchaseRequest: { include: { department: true } },
              },
            },
          },
        },
      },
    });
    if (!ret) return null;

    const po = ret.grn.purchaseOrder;
    const related: VerificationRelated[] = [
      { type: 'GOODS_RECEIVING', label: 'Goods Received Note', reference: ret.grn.grnNumber },
      { type: 'PURCHASE_ORDER', label: 'Purchase Order', reference: po.poNumber },
    ];
    if (po.purchaseRequest) {
      related.push({
        type: 'PURCHASE_REQUEST',
        label: 'Purchase Request',
        reference: po.purchaseRequest.prNumber,
      });
    }

    return {
      reference: ret.returnNumber,
      status: ret.status,
      statusLabel: statusLabel(ret.status),
      createdAt: ret.createdAt,
      createdBy: ret.createdByName ?? null,
      department:
        po.purchaseRequest?.departmentOther?.trim() ||
        po.purchaseRequest?.department?.name ||
        '—',
      fields: [
        { label: 'Return number', value: ret.returnNumber },
        { label: 'Original PO', value: po.poNumber },
        { label: 'Original GRN', value: ret.grn.grnNumber },
        { label: 'Supplier', value: po.supplier?.companyName ?? '—' },
        { label: 'Reason', value: ret.reason.replace(/_/g, ' ') },
        { label: 'Return date', value: formatDate(ret.createdAt) },
        { label: 'Approval status', value: statusLabel(ret.status) },
      ],
      items: ret.items.map((item) => ({
        itemName: item.itemName,
        receivedQty: Number(item.receivedQty),
        returnQty: Number(item.returnQty),
        reason: item.reason ?? null,
      })),
      related,
      authenticity: authenticityForStatus('GOODS_RETURN', ret.status),
    };
  }

  private async recordEvent(input: {
    verificationId?: string;
    organizationId?: string;
    documentType?: string;
    reference?: string | null;
    token: string;
    outcome: Authenticity;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      await prisma.documentVerificationEvent.create({
        data: {
          verificationId: input.verificationId,
          organizationId: input.organizationId,
          documentType: input.documentType,
          reference: input.reference ?? null,
          token: input.token || 'unknown',
          outcome: input.outcome,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch {
      /* verification auditing must never break the public response */
    }
  }
}

export const documentVerificationService = new DocumentVerificationService();

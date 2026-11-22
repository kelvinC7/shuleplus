import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseRequest,
  PurchaseRequestItem,
} from '@/types';

export interface RequisitionLine {
  item: PurchaseRequestItem;
  orderItem: PurchaseOrderItem | null;
  unitPrice: number | null;
  totalPrice: number | null;
  hasPrice: boolean;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * The purchase request to purchase order relation is one-to-one, but the API
 * exposes it as a list. Keep the newest order when more than one is present.
 */
export function getRequisitionOrder(pr: PurchaseRequest): PurchaseOrder | null {
  const orders = pr.purchaseOrders ?? [];
  if (orders.length === 0) return null;
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] ?? null;
}

function matchOrderItem(
  item: PurchaseRequestItem,
  index: number,
  orderItems: PurchaseOrderItem[],
  used: Set<number>,
): PurchaseOrderItem | null {
  const direct = orderItems[index];
  if (direct && !used.has(index) && normalize(direct.itemName) === normalize(item.itemName)) {
    used.add(index);
    return direct;
  }

  const byName = orderItems.findIndex(
    (orderItem, orderIndex) =>
      !used.has(orderIndex) &&
      normalize(orderItem.itemName) === normalize(item.itemName),
  );
  if (byName >= 0) {
    used.add(byName);
    return orderItems[byName];
  }

  if (direct && !used.has(index)) {
    used.add(index);
    return direct;
  }

  return null;
}

/**
 * Maps every request item to its purchase order item so the requisition can
 * show the unit price and total price captured through Set Order.
 */
export function requisitionLines(pr: PurchaseRequest): RequisitionLine[] {
  const orderItems = getRequisitionOrder(pr)?.items ?? [];
  const used = new Set<number>();

  return (pr.items ?? []).map((item, index) => {
    const orderItem = matchOrderItem(item, index, orderItems, used);
    const estimatedUnitPrice = Number(item.estimatedPrice ?? 0);
    const estimatedTotalPrice = Number(item.estimatedTotal ?? 0);
    const hasEstimate = estimatedUnitPrice > 0 || estimatedTotalPrice > 0;

    return {
      item,
      orderItem,
      unitPrice: orderItem ? Number(orderItem.unitPrice) : hasEstimate ? estimatedUnitPrice : null,
      totalPrice: orderItem ? Number(orderItem.totalPrice) : hasEstimate ? estimatedTotalPrice : null,
      hasPrice: orderItem !== null || hasEstimate,
    };
  });
}

export function requisitionTotal(pr: PurchaseRequest): number {
  const order = getRequisitionOrder(pr);
  const priced = requisitionLines(pr).filter(
    (line): line is RequisitionLine & { totalPrice: number } => line.totalPrice != null,
  );

  if (priced.length > 0) {
    return priced.reduce((sum, line) => sum + line.totalPrice, 0);
  }

  if (order) return Number(order.totalAmount);
  return Number(pr.totalEstimate ?? 0);
}

export function requisitionTotalQty(pr: PurchaseRequest): number {
  return (pr.items ?? []).reduce((sum, item) => sum + Number(item.quantity), 0);
}

export function hasRequisitionPricing(pr: PurchaseRequest): boolean {
  if ((pr.purchaseOrders ?? []).length > 0) return true;
  return requisitionLines(pr).some((line) => line.hasPrice);
}

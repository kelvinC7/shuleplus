export function sanitizeReceivingPayload(form: {
  storeId: string;
  supplierId: string;
  invoiceNumber: string;
  deliveryNoteNumber: string;
  notes: string;
  receivedDate: string;
  items: Array<{
    productId: string;
    quantity: number | string;
    unitCost: string;
    batchNumber: string;
    expiryDate: string;
  }>;
}) {
  const body: Record<string, unknown> = {
    storeId: form.storeId,
    receivedDate: form.receivedDate,
    items: form.items
      .filter((item) => item.productId)
      .map((item) => {
        const row: Record<string, unknown> = {
          productId: item.productId,
          quantity: Number(item.quantity),
        };
        if (item.unitCost) row.unitCost = Number(item.unitCost);
        if (item.batchNumber) row.batchNumber = item.batchNumber;
        if (item.expiryDate) row.expiryDate = item.expiryDate;
        return row;
      }),
  };

  if (form.supplierId) body.supplierId = form.supplierId;
  if (form.invoiceNumber) body.invoiceNumber = form.invoiceNumber;
  if (form.deliveryNoteNumber) body.deliveryNoteNumber = form.deliveryNoteNumber;
  if (form.notes) body.notes = form.notes;

  return body;
}

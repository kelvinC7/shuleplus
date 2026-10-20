export function sanitizeProductPayload(form: Record<string, string>) {
  const body: Record<string, unknown> = { ...form };

  for (const key of ['reorderLevel', 'quantity', 'costPrice', 'sellingPrice', 'minimumStock', 'maximumStock']) {
    const val = body[key];
    if (val === '' || val === null || val === undefined) {
      delete body[key];
    } else {
      body[key] = Number(val);
    }
  }

  for (const key of ['supplierId', 'sku', 'storeId', 'storageLocation', 'brand', 'description']) {
    if (!body[key]) delete body[key];
  }

  return body;
}

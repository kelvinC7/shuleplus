/** Asset fields used to build a scannable QR payload. */
export type AssetQrInput = {
  id: string;
  assetCode: string;
  sku?: string | null;
  serialNumber?: string | null;
  labelTag?: string | null;
  assetName?: string | null;
};

/** Structured payload — scannable and human-readable in register exports. */
export function buildAssetQrPayload(asset: AssetQrInput): string {
  const code = asset.assetCode?.trim() || asset.sku?.trim() || asset.id;
  const tag = asset.labelTag?.trim() || '';
  const sn = asset.serialNumber?.trim() || '';
  return `CODE:${code}|TAG:${tag}|SN:${sn}|ID:${asset.id}`;
}

/** Primary lookup code encoded in the QR (matches backend scanLookup). */
export function assetQrLookupCode(asset: AssetQrInput): string {
  return asset.assetCode?.trim() || asset.sku?.trim() || asset.id;
}

/** Normalize camera / manual scan input to a lookup code. */
export function parseScannedAssetCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const code =
        url.searchParams.get('code') ??
        url.searchParams.get('assetCode') ??
        url.pathname.split('/').filter(Boolean).pop();
      if (code) return decodeURIComponent(code);
    } catch {
      // fall through
    }
  }

  const structured = trimmed.match(/CODE:([^|]+)/i);
  if (structured?.[1]) return structured[1].trim();

  return trimmed;
}

export function assetQrScanUrl(asset: AssetQrInput): string {
  const code = encodeURIComponent(assetQrLookupCode(asset));
  if (typeof window === 'undefined') {
    return `/scan?code=${code}`;
  }
  const origin = window.location.origin.replace(/\/$/, '');
  return `${origin}/scan?code=${code}`;
}

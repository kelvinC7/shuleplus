'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QrCode, Search } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { QrScanner } from '@/components/qr-scanner';
import { StatusBadge } from '@/components/status-badge';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { parseScannedAssetCode } from '@/utils/asset-qr';
import { formatDate, formatRwf } from '@/utils/format';
import type { AssetRow } from '@/types';

export function ScanView() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState<AssetRow | null>(null);

  async function lookup(value?: string) {
    const q = parseScannedAssetCode(value ?? code);
    if (!q) {
      toast.error('Enter an asset code or ID');
      return;
    }
    setCode(q);
    setLoading(true);
    setAsset(null);
    try {
      const { data } = await assetsApi.scanLookup({ code: q });
      setAsset(data.data);
      toast.success('Asset found.', 'Lookup');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Asset not found'), 'Not found');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fromUrl = searchParams.get('code') ?? searchParams.get('assetCode');
    if (fromUrl) {
      setCode(fromUrl);
      void lookup(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <AssetsPageLayout>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="hr-card p-6 text-center sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-primary">
            <QrCode size={28} />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-navy">Scan & Lookup</h1>
          <p className="mt-1 text-sm text-muted">
            Scan a printed asset QR label or enter an asset code, SKU, or serial manually.
          </p>

          <div className="mt-6 text-left">
            <QrScanner onScan={(value) => void lookup(value)} disabled={loading} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void lookup();
            }}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              className="input flex-1"
              placeholder="Asset code, SKU, or scan payload"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              <Search size={16} />
              {loading ? 'Looking up…' : 'Lookup'}
            </button>
          </form>
        </div>

        {asset ? (
          <div className="hr-card space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted">{asset.assetCode}</p>
                <h2 className="text-lg font-semibold text-navy">{asset.assetName}</h2>
                <p className="text-sm text-muted">{asset.categoryName}</p>
              </div>
              <StatusBadge status={String(asset.assetHealthStatus ?? 'Used')} />
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium uppercase text-muted">Register year</dt>
                <dd className="font-medium text-navy">{asset.registerYear}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase text-muted">Location</dt>
                <dd className="font-medium text-navy">
                  {asset.locationLabel || asset.location || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase text-muted">SKU</dt>
                <dd className="font-medium text-navy">{asset.sku || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase text-muted">Purchase</dt>
                <dd className="font-medium text-navy">{formatRwf(asset.unitPrice)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase text-muted">Net book value</dt>
                <dd className="font-medium text-navy">{formatRwf(asset.netBookValue)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase text-muted">Annual dep</dt>
                <dd className="font-medium text-navy">{formatRwf(asset.annualDep)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase text-muted">Purchase date</dt>
                <dd className="font-medium text-navy">{formatDate(asset.purchaseDate)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase text-muted">Serial</dt>
                <dd className="font-medium text-navy">{asset.serialNumber || '—'}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </AssetsPageLayout>
  );
}

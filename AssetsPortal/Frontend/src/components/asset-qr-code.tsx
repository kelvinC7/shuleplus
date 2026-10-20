'use client';

import { useMemo, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Download, Printer } from 'lucide-react';
import {
  assetQrLookupCode,
  assetQrScanUrl,
  buildAssetQrPayload,
  type AssetQrInput,
} from '@/utils/asset-qr';

const NAVY = '#000435';

export function AssetQrCode({
  asset,
  size = 160,
  showActions = true,
  showCaption = true,
  className = '',
}: {
  asset: AssetQrInput;
  size?: number;
  showActions?: boolean;
  showCaption?: boolean;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const payload = useMemo(() => buildAssetQrPayload(asset), [asset]);
  const lookupCode = useMemo(() => assetQrLookupCode(asset), [asset]);
  const scanUrl = useMemo(() => assetQrScanUrl(asset), [asset]);

  function printLabel() {
    const win = window.open('', '_blank', 'width=420,height=560');
    if (!win) return;

    const svg = wrapRef.current?.querySelector('svg');
    const svgHtml = svg?.outerHTML ?? '';
    const name = asset.assetName?.trim() || lookupCode;

    win.document.write(`<!DOCTYPE html>
<html><head><title>Asset QR — ${lookupCode}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: ${NAVY}; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; max-width: 280px; }
  h1 { font-size: 14px; margin: 0 0 8px; }
  .code { font-family: monospace; font-size: 11px; color: #64748b; word-break: break-all; }
  .qr { margin: 12px 0; }
  .meta { font-size: 11px; color: #64748b; margin-top: 8px; }
</style></head><body>
  <div class="card">
    <h1>${name.replace(/</g, '&lt;')}</h1>
    <p class="code">${lookupCode.replace(/</g, '&lt;')}</p>
    <div class="qr">${svgHtml}</div>
    <p class="meta">Scan to open asset in ShulePlus Assets Portal</p>
  </div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
</body></html>`);
    win.document.close();
  }

  function downloadPng() {
    const svg = wrapRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const scale = 4;
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `asset-qr-${lookupCode.replace(/[^\w.-]+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        ref={wrapRef}
        className="rounded-xl border border-border bg-white p-3 shadow-sm"
        style={{ width: size + 24 }}
      >
        <QRCode
          value={payload}
          size={size}
          level="M"
          fgColor={NAVY}
          bgColor="#ffffff"
          title={`Asset ${lookupCode}`}
        />
      </div>

      {showCaption ? (
        <div className="mt-2 max-w-[220px] text-center">
          <p className="truncate font-mono text-xs font-semibold text-navy">{lookupCode}</p>
          {asset.assetName ? (
            <p className="mt-0.5 truncate text-[11px] text-muted">{asset.assetName}</p>
          ) : null}
          <p className="mt-1 break-all text-[10px] text-muted">{scanUrl}</p>
        </div>
      ) : null}

      {showActions ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-secondary !py-1.5 !text-xs" onClick={printLabel}>
            <Printer size={14} /> Print label
          </button>
          <button type="button" className="btn-secondary !py-1.5 !text-xs" onClick={downloadPng}>
            <Download size={14} /> Download PNG
          </button>
        </div>
      ) : null}
    </div>
  );
}

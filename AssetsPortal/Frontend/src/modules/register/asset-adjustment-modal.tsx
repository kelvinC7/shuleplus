'use client';

import { AssetsModal } from '@/components/assets-modal';
import type { AssetRow } from '@/types';
import { AssetAdjustmentForm } from '@/modules/register/asset-adjustment-form';

export function AssetAdjustmentModal({
  open,
  asset,
  onClose,
  onSaved,
}: {
  open: boolean;
  asset: AssetRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!open) return null;

  return (
    <AssetsModal
      open={open}
      title="Add manual adjustment"
      subtitle={`Record a controlled correction for ${asset.assetCode}. Original values are preserved.`}
      onClose={onClose}
    >
      <AssetAdjustmentForm
        asset={asset}
        showCancel
        onCancel={onClose}
        onSaved={onSaved}
      />
      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <button type="button" className="btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </AssetsModal>
  );
}

'use client';

import { AssetImportWizard } from '@/modules/register/asset-import-wizard';
import type { FinancialYear } from '@/types';

/** Land register import — purchase-only rows; opening from Year Setup chain. */
export function LandImportWizard(props: {
  open: boolean;
  years: FinancialYear[];
  defaultYear?: number;
  onClose: () => void;
  onImported: () => void;
}) {
  return <AssetImportWizard {...props} variant="land" />;
}

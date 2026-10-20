'use client';

import { GatePageLayout } from '@/modules/gateManager/gate-page-layout';
import { GateScannerPanel } from '@/modules/gateManager/gate-scanner-panel';

export function GateScanView() {
  return (
    <GatePageLayout title="QR / Card Scanner" subtitle="Scan student QR, permission QR, or student card">
      <GateScannerPanel mode="scan" />
    </GatePageLayout>
  );
}

export function GateCheckoutView() {
  return (
    <GatePageLayout title="Check-Out" subtitle="Verify permission and record student departure">
      <GateScannerPanel mode="checkout" />
    </GatePageLayout>
  );
}

export function GateCheckinView({ initialCode }: { initialCode?: string }) {
  return (
    <GatePageLayout title="Check-In / Returns" subtitle="Scan returning student and record actual return time">
      <GateScannerPanel mode="checkin" initialCode={initialCode} />
    </GatePageLayout>
  );
}

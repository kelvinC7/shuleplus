'use client';

import { use } from 'react';
import { DeviceDetailView } from '@/modules/devices/device-detail-view';

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DeviceDetailView deviceId={id} />;
}

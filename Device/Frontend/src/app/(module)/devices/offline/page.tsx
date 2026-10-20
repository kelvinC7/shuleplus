'use client';

import { DevicesView } from '@/modules/devices/devices-view';

export default function OfflineDevicesPage() {
  return <DevicesView statusFilter="OFFLINE" title="Offline Devices" />;
}

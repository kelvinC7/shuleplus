'use client';

import { DevicesView } from '@/modules/devices/devices-view';

export default function OnlineDevicesPage() {
  return <DevicesView statusFilter="ONLINE" title="Online Devices" />;
}

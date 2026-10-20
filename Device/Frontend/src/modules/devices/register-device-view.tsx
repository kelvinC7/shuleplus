'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { DevicePageLayout } from '@/components/device-page-layout';
import { RegisterDeviceModal } from '@/components/register-device-modal';

export function RegisterDeviceView() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.push('/devices');
  }

  return (
    <>
      <DevicePageLayout subtitle="Add a new gate reader to your school">
        <div className="hr-card flex flex-col items-center justify-center p-10 text-center">
          <p className="text-sm text-muted">Register a new RFID gate reader for your school.</p>
          <button type="button" className="btn-primary mt-4 inline-flex items-center gap-2" onClick={() => setOpen(true)}>
            <Plus size={16} /> Open Registration Form
          </button>
        </div>
      </DevicePageLayout>
      <RegisterDeviceModal
        open={open}
        onOpenChange={handleOpenChange}
        onSuccess={(id) => router.push(`/devices/${id}`)}
      />
    </>
  );
}

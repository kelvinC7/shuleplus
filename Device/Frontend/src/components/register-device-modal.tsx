'use client';

import { DeviceFormModal } from '@/components/device-form-modal';
import { RegisterDeviceForm } from '@/components/register-device-form';

interface RegisterDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (deviceId: string) => void;
}

export function RegisterDeviceModal({ open, onOpenChange, onSuccess }: RegisterDeviceModalProps) {
  return (
    <DeviceFormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Register RFID Device"
      description="Add a new gate reader to your school"
      size="xl"
    >
      <RegisterDeviceForm
        onSuccess={(id) => {
          onOpenChange(false);
          onSuccess(id);
        }}
        onCancel={() => onOpenChange(false)}
      />
    </DeviceFormModal>
  );
}

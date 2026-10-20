'use client';

import { use } from 'react';
import { RegistrationView } from '@/modules/registration/registration-view';

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RegistrationView employeeId={id} />;
}

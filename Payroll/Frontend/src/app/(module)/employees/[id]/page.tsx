'use client';

import { use } from 'react';
import { EmployeeProfileView } from '@/modules/employees/employee-profile-view';

interface Props {
  params: Promise<{ id: string }>;
}

export default function EmployeeProfilePage({ params }: Props) {
  const { id } = use(params);
  return <EmployeeProfileView staffId={id} />;
}

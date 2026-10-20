'use client';

import { use } from 'react';
import { ProfileView } from '@/modules/profile/profile-view';

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProfileView employeeId={id} />;
}

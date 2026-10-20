'use client';

import { use } from 'react';
import { RfidSchoolDetailView } from '@/components/super-admin/rfid-network/school-detail-view';

export default function RfidSchoolDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  return <RfidSchoolDetailView orgId={orgId} />;
}

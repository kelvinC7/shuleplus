'use client';

import { useParams } from 'next/navigation';
import { ReportDetailView } from '@/modules/reports/report-detail-view';

export default function ReportTypePage() {
  const params = useParams();
  const type = String(params?.type ?? '');
  return <ReportDetailView type={type} />;
}

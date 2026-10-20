import { RecordDetailView } from '@/modules/records/record-detail-view';

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordDetailView id={id} />;
}

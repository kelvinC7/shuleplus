'use client';

import { useParams } from 'next/navigation';
import { MarkEntryView } from '@/modules/assessments/mark-entry-view';

export default function MarkEntryPage() {
  const params = useParams<{ id: string }>();
  return <MarkEntryView id={params.id} />;
}

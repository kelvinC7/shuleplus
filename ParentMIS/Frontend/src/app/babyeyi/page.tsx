'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useAuth } from '@/contexts/auth-context';
import { findChild, type FoundChild } from '@/lib/parent-find-child';
import { OfficialBabyeyiPicker } from '@/components/babyeyi/official-babyeyi-picker';

export default function BabyeyiPage() {
  const { activeStudentId, linkedStudents } = useAuth();
  const student = linkedStudents.find((s) => s.id === activeStudentId);
  const [child, setChild] = useState<FoundChild | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const code = student?.shuleCode;
    if (!code) {
      setChild(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const found = await findChild(code);
    setChild(found);
    setLoading(false);
  }, [student?.shuleCode]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        variant="navy"
        eyebrow="Fees & supplies"
        title="Get Babyeyi"
        description="Official fee notice and required items for your child’s class."
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-[var(--yo-navy)]" />
        </div>
      ) : !child ? (
        <EmptyState
          icon={<FileText className="text-[var(--yo-muted)]" />}
          title="Babyeyi not available"
          description="We could not load a Babyeyi for the selected child. Try again later or contact the school."
        />
      ) : (
        <div className="hr-card rounded-[24px] p-6">
          <h2 className="mb-4 text-lg font-extrabold text-[var(--yo-navy)]">{child.name} · {child.cls}</h2>
          <OfficialBabyeyiPicker child={child} />
        </div>
      )}
    </div>
  );
}

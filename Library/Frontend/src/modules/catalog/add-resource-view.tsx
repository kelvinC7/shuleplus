'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { ResourceFormModal } from '@/components/resource-form-modal';

export default function AddResourceView() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) router.push('/catalog');
  }, [open, router]);

  return (
    <LibPageLayout
      title="Add Resource"
      subtitle="Add a new book or resource to the catalog"
      actions={
        <button onClick={() => router.push('/catalog')} className="btn-secondary">
          <ArrowLeft size={16} /> Back to Catalog
        </button>
      }
    >
      <ResourceFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => router.push('/catalog')}
      />
      {!open && (
        <div className="hr-card p-12 text-center text-muted">
          Redirecting to catalog…
        </div>
      )}
    </LibPageLayout>
  );
}

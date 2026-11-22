import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { BooksLibraryView } from '@/components/super-admin/curriculum/books-library-view';

function LibraryFallback() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-[#000435]" size={36} />
    </div>
  );
}

export default function SuperAdminCurriculumLibraryPage() {
  return (
    <Suspense fallback={<LibraryFallback />}>
      <BooksLibraryView />
    </Suspense>
  );
}

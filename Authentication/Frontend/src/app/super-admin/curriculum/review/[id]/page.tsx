import { CurriculumReviewWorkspace } from '@/components/super-admin/curriculum/curriculum-review-workspace';

export default async function SuperAdminCurriculumReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CurriculumReviewWorkspace bookId={id} />;
}

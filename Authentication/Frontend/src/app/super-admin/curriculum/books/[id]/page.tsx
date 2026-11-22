import { redirect } from 'next/navigation';

export default async function LegacyBookReviewRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/super-admin/curriculum/review/${id}`);
}

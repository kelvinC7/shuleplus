import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ studentId: string }>;
};

/** Legacy QR URL alias — redirects to canonical /v/:code route. */
export default async function LegacyQrStudentProfilePage({ params }: PageProps) {
  const { studentId } = await params;
  redirect(`/v/${encodeURIComponent(studentId)}`);
}

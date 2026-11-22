import type { Metadata } from 'next';
import { VerifyClient } from './verify-client';

export const metadata: Metadata = {
  title: 'Verify Document · ShulePlus',
  description: 'Verify the authenticity and status of a ShulePlus procurement document.',
  robots: { index: false, follow: false },
};

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <VerifyClient token={token} />;
}

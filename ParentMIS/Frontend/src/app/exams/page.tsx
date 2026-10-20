import { redirect } from 'next/navigation';

export default function ExamsPage() {
  redirect('/academic?tab=schedule');
}

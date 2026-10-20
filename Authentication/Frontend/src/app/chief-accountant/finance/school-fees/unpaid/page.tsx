import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/chief-accountant/finance/school-fees/student-accounts?fees=unpaid');
}

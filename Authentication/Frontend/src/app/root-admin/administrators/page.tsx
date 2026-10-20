import { redirect } from 'next/navigation';

export default function AdministratorsRedirect() {
  redirect('/root-admin/system-administrators');
}

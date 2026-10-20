import { RegisterEmployeeView } from '@/modules/employees/register-employee-view';

interface Props {
  searchParams: Promise<{ edit?: string }>;
}

export default async function RegisterEmployeePage({ searchParams }: Props) {
  const params = await searchParams;
  return <RegisterEmployeeView staffId={params.edit} />;
}

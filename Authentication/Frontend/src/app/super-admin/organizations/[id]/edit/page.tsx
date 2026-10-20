'use client';

import { useParams } from 'next/navigation';
import { OrganizationRegistrationWizard } from '@/components/super-admin/organization-registration-wizard';

export default function EditOrganizationPage() {
  const params = useParams();
  const organizationId = params.id as string;

  return <OrganizationRegistrationWizard mode="edit" organizationId={organizationId} />;
}

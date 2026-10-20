'use client';

import { BackButton } from '@/components/root-admin/back-button';
import { OrganizationRegistrationWizard } from '@/components/super-admin/organization-registration-wizard';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';

export default function RegisterOrganizationPage() {
  const platform = usePlatformAdmin();

  return (
    <div>
      <BackButton href={platform.organizationsPath} label="Back to Organizations" />
      <OrganizationRegistrationWizard />
    </div>
  );
}

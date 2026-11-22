'use client';

import { REGISTER_SCHOOL_URL } from '@/lib/auth-urls';
import { SchoolIcon } from './icons';
import { useSiteLanguage } from './language-provider';
import { SiteCtaButton } from './site-cta-button';

export function RegisterSchoolButton({
  className,
  fullWidth,
  variant = 'secondary',
}: {
  className?: string;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const { t } = useSiteLanguage();

  return (
    <SiteCtaButton
      href={REGISTER_SCHOOL_URL}
      variant={variant}
      fullWidth={fullWidth}
      className={className}
      icon={<SchoolIcon className="h-3.5 w-3.5" />}
    >
      {t.nav.registerSchool}
    </SiteCtaButton>
  );
}


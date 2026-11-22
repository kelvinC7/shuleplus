'use client';



import { PARENT_PORTAL_URL } from '@/lib/auth-urls';

import { UserIcon } from './icons';

import { useSiteLanguage } from './language-provider';

import { SiteCtaButton } from './site-cta-button';



export function EnterAsParentButton({

  className,

  fullWidth,

  variant = 'primary',

}: {

  className?: string;

  fullWidth?: boolean;

  variant?: 'primary' | 'secondary';

}) {

  const { t } = useSiteLanguage();



  return (

    <SiteCtaButton

      href={PARENT_PORTAL_URL}

      variant={variant}

      fullWidth={fullWidth}

      className={className}

      icon={<UserIcon className="h-3.5 w-3.5" />}

    >

      {t.nav.enterAsParent}

    </SiteCtaButton>

  );

}



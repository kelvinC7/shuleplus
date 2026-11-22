import { useMemo } from 'react';
import { GOVERNMENT_NAV } from '@/government/config/nav';
import { canAccessHref, primaryGovPersona, resolveGovPersonas, type GovPersonaSlug } from '@/government/config/roles';
import type { PortalNavItem } from '@/shared/config/portal-nav';
import { useGovernmentAuth } from '@/contexts/government-auth-context';

/** Sidebar links hidden per persona (workspaces still reachable from dashboard). */
const SIDEBAR_HIDDEN_BY_PERSONA: Partial<Record<GovPersonaSlug, string[]>> = {
  intake_reviewer: ['/government/review-queue', '/government/intake', '/government/monitoring'],
  education_reviewer: ['/government/review-queue', '/government/education-review', '/government/monitoring'],
  district_education_officer: ['/government/review-queue', '/government/education-review', '/government/monitoring'],
  sector_education_inspector: ['/government/review-queue', '/government/education-review', '/government/monitoring'],
  transport_reviewer: [
    '/government/review-queue',
    '/government/safety',
    '/government/checkpoint',
    '/government/monitoring',
  ],
  final_approval_officer: ['/government/review-queue', '/government/monitoring'],
};

export function useGovernmentNav(): PortalNavItem[] {
  const { user } = useGovernmentAuth();
  const personas = useMemo(() => resolveGovPersonas(user?.roles ?? []), [user?.roles]);

  return useMemo(() => {
    const persona = primaryGovPersona(personas);
    const hidden = new Set(SIDEBAR_HIDDEN_BY_PERSONA[persona] ?? []);

    const isHidden = (href?: string) => Boolean(href && hidden.has(href));

    return GOVERNMENT_NAV.map((item) => {
      if (item.children?.length) {
        const children = item.children.filter(
          (c) => canAccessHref(c.href, personas, user) && !isHidden(c.href)
        );
        if (children.length === 0) return null;
        return { ...item, children };
      }
      if (item.href && (!canAccessHref(item.href, personas, user) || isHidden(item.href))) return null;
      return item;
    }).filter(Boolean) as PortalNavItem[];
  }, [personas, user]);
}

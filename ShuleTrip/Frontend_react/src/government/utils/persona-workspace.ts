import type { JwtUser } from '@/shared/jwt';
import {
  canAccessHref,
  primaryGovPersona,
  resolveGovPersonas,
  roleDefinition,
  type GovPersonaSlug,
} from '@/government/config/roles';

const PRIMARY_WORKSPACE: Record<GovPersonaSlug, { label: string; href: string }> = {
  super_admin: { label: 'Action queue', href: '/government/review-queue' },
  national_administrator: { label: 'Action queue', href: '/government/review-queue' },
  intake_reviewer: { label: 'Applications', href: '/government/applications' },
  education_reviewer: { label: 'Applications', href: '/government/applications' },
  transport_reviewer: { label: 'Applications', href: '/government/applications' },
  checkpoint_inspector: { label: 'Checkpoint', href: '/government/checkpoint' },
  final_approval_officer: { label: 'Final approval', href: '/government/final-approval' },
  monitoring_officer: { label: 'Monitoring', href: '/government/monitoring' },
  district_education_officer: { label: 'Education', href: '/government/education-review' },
  sector_education_inspector: { label: 'Education', href: '/government/education-review' },
  organization_admin: { label: 'Action queue', href: '/government/review-queue' },
};

export function primaryWorkspaceForUser(user: JwtUser | null): { label: string; href: string } {
  const personas = resolveGovPersonas(user?.roles ?? []);
  const persona = primaryGovPersona(personas);
  const preferred = PRIMARY_WORKSPACE[persona] ?? PRIMARY_WORKSPACE.monitoring_officer;
  if (canAccessHref(preferred.href, personas, user)) return preferred;
  if (canAccessHref('/government/review-queue', personas, user)) {
    return { label: 'Action queue', href: '/government/review-queue' };
  }
  return { label: 'Applications', href: '/government/applications' };
}

export function governmentAccountSubtitle(user: JwtUser | null): string {
  const personas = resolveGovPersonas(user?.roles ?? []);
  const persona = primaryGovPersona(personas);
  const roleLabel = roleDefinition(persona).label;
  const who = user?.name?.trim() || user?.email?.trim() || 'Government account';
  return `${who} · ${roleLabel}`;
}

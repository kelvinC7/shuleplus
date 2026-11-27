import type { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';
import { useAuth } from '@/contexts/auth-context';

/**
 * Part-1 IAM data isolation: organization-wide configuration (classes,
 * subjects, grading scales, report settings) is owned by the Academic module
 * head / organization users. A plain module USER sees a clear explanation
 * instead of controls the backend would reject anyway.
 */
export function OrgWideOnly({ children }: { children: ReactNode }) {
  const { ready, seeAll } = useAuth();

  if (!ready) return null;

  if (!seeAll) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', mt: 2 }}>
        <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
          This is organization-wide academic configuration. Only an Academic
          module head or an organization user can change it. You can still view
          your own academic records.
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}

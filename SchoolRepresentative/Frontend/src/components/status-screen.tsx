'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { brand } from '@/theme/theme';

/* ---------- vector illustrations (inline SVG, no icon fonts) ---------- */

export function SessionIllustration({ size = 220 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 240 196" fill="none" role="img" aria-label="Session expired">
      <circle cx="120" cy="100" r="80" fill={brand.navy} fillOpacity="0.045" />
      <ellipse cx="120" cy="100" rx="96" ry="38" stroke={brand.navy} strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="3 7" strokeLinecap="round" transform="rotate(-18 120 100)" />
      {/* padlock */}
      <path d="M97 98V80a23 23 0 0 1 46 0v18" stroke={brand.navy} strokeWidth="10" strokeLinecap="round" />
      <rect x="82" y="96" width="76" height="62" rx="16" fill={brand.navy} />
      <circle cx="120" cy="123" r="8" fill={brand.primary} />
      <rect x="117" y="127" width="6" height="16" rx="3" fill={brand.primary} />
      {/* clock badge */}
      <circle cx="176" cy="64" r="19" fill="#fff" stroke={brand.primary} strokeWidth="5" />
      <path d="M176 54v11l7 4" stroke={brand.navy} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* accents */}
      <circle cx="54" cy="70" r="5" fill={brand.primary} />
      <circle cx="46" cy="132" r="3" fill={brand.navy} fillOpacity="0.25" />
      <circle cx="198" cy="140" r="4" fill={brand.navy} fillOpacity="0.2" />
      <circle cx="84" cy="40" r="2.5" fill={brand.primary} fillOpacity="0.7" />
    </svg>
  );
}

export function ErrorIllustration({ size = 220 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 240 196" fill="none" role="img" aria-label="Something went wrong">
      <circle cx="120" cy="100" r="80" fill={brand.navy} fillOpacity="0.045" />
      <ellipse cx="120" cy="100" rx="96" ry="38" stroke={brand.navy} strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="3 7" strokeLinecap="round" transform="rotate(18 120 100)" />
      {/* window */}
      <rect x="66" y="62" width="108" height="80" rx="14" fill="#fff" stroke={brand.navy} strokeWidth="6" />
      <path d="M66 82h108" stroke={brand.navy} strokeWidth="6" />
      <circle cx="82" cy="72" r="3" fill={brand.primary} />
      <circle cx="93" cy="72" r="3" fill={brand.navy} fillOpacity="0.3" />
      {/* alert */}
      <circle cx="120" cy="113" r="16" fill={brand.primary} />
      <path d="M120 105v9" stroke={brand.navy} strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="121" r="2.4" fill={brand.navy} />
      {/* accents */}
      <circle cx="52" cy="64" r="5" fill={brand.primary} />
      <circle cx="196" cy="62" r="3" fill={brand.navy} fillOpacity="0.25" />
      <circle cx="190" cy="148" r="4.5" fill={brand.primary} fillOpacity="0.8" />
      <circle cx="48" cy="140" r="3" fill={brand.navy} fillOpacity="0.2" />
    </svg>
  );
}

/* ---------- minimalist full-screen status layout ---------- */

export const pillButtonSx = {
  borderRadius: 999,
  px: 4,
  py: 1.35,
  minWidth: 220,
  fontSize: 14,
  fontWeight: 700,
} as const;

export function StatusScreen({
  illustration,
  title,
  message,
  actions,
  footnote,
}: {
  illustration: ReactNode;
  title: string;
  message: string;
  actions?: ReactNode;
  footnote?: string;
}) {
  return (
    <Box
      role="alert"
      sx={{
        minHeight: '100dvh',
        bgcolor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        py: 6,
        animation: 'fade-in 0.3s ease both',
      }}
    >
      <Box sx={{ mb: 3 }}>{illustration}</Box>
      <Typography
        component="h1"
        sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, color: brand.navy, letterSpacing: '-0.02em' }}
      >
        {title}
      </Typography>
      <Typography sx={{ mt: 1.25, maxWidth: 340, fontSize: 14, lineHeight: 1.65, color: brand.muted }}>
        {message}
      </Typography>
      {actions ? (
        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>{actions}</Box>
      ) : null}
      {footnote ? (
        <Typography sx={{ mt: 6, fontSize: 11, letterSpacing: '0.04em', color: 'text.disabled' }}>{footnote}</Typography>
      ) : null}
    </Box>
  );
}

export function PrimaryPill(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="contained"
      color="secondary"
      size="large"
      {...props}
      sx={{ ...pillButtonSx, ...(props.sx as object) }}
    />
  );
}

export function TextPill(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="large"
      {...props}
      sx={{ borderRadius: 999, px: 3, fontSize: 13, fontWeight: 600, color: brand.muted, ...(props.sx as object) }}
    />
  );
}

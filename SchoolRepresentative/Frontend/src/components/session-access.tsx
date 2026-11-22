'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useConsole } from '@/contexts/console-context';
import { brand } from '@/theme/theme';
import {
  ErrorIllustration,
  PrimaryPill,
  SessionIllustration,
  StatusScreen,
  TextPill,
} from '@/components/status-screen';

/**
 * Shown when there is no valid session (no token, expired, rejected by the API).
 * If the backend itself is unreachable, a calm connection-error variant is shown instead.
 */
export function SessionAccessDeniedScreen({
  error,
  expired = true,
}: {
  error?: string | null;
  /** true = session problem; false = the console could not be reached */
  expired?: boolean;
}) {
  const { reload } = useConsole();

  if (!expired && error) {
    return (
      <StatusScreen
        illustration={<ErrorIllustration />}
        title="Can’t reach the console"
        message={error}
        actions={
          <>
            <PrimaryPill onClick={() => void reload()}>Try again</PrimaryPill>
            <TextPill href="/login">Go to login</TextPill>
          </>
        }
        footnote="Shule+ Director Console"
      />
    );
  }

  return (
    <StatusScreen
      illustration={<SessionIllustration />}
      title="Session expired"
      message="For your security you’ve been signed out. Sign in again to pick up where you left off."
      actions={<PrimaryPill href="/login">Sign in again</PrimaryPill>}
      footnote="Shule+ Director Console"
    />
  );
}

/** Minimal loading screen: no card, no box — just the mark and a thin progress line. */
export function SessionLoadingScreen({ label = 'Verifying session…' }: { label?: string }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/yellow-icon.png"
        alt=""
        draggable={false}
        style={{ width: 44, height: 44, objectFit: 'contain', animation: 'sessionPulse 1.6s ease-in-out infinite' }}
      />
      <Box sx={{ width: 96, height: 3, borderRadius: 999, bgcolor: 'rgba(0,4,53,0.08)', overflow: 'hidden' }}>
        <Box
          sx={{
            width: '40%',
            height: '100%',
            borderRadius: 999,
            bgcolor: brand.primary,
            animation: 'sessionSlide 1.2s ease-in-out infinite',
          }}
        />
      </Box>
      <Typography sx={{ fontSize: 12, color: brand.muted, letterSpacing: '0.02em' }}>{label}</Typography>
      <style>{`
        @keyframes sessionSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
        @keyframes sessionPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .55; transform: scale(.94); } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>
    </Box>
  );
}

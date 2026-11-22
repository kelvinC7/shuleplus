'use client';

import { SessionAccessDeniedScreen } from '@/components/session-access';
import { ErrorIllustration, PrimaryPill, StatusScreen, TextPill } from '@/components/status-screen';
import { friendlyErrorMessage } from '@/services/api';

const SESSION_RE = /sign in through shule|jwt|token|session|unauthori/i;

/**
 * Full-screen, minimalist error screen (name kept for existing imports).
 * Session-type failures are routed to the session screen automatically.
 */
export function ErrorDialog({
  title = 'Unable to load',
  message,
  onRetry,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
}) {
  if (SESSION_RE.test(message ?? '') || /session/i.test(title)) {
    return <SessionAccessDeniedScreen />;
  }
  return (
    <StatusScreen
      illustration={<ErrorIllustration />}
      title={title}
      message={friendlyErrorMessage(message, 'We could not load this page. Please try again.')}
      actions={
        <>
          {onRetry ? <PrimaryPill onClick={onRetry}>Try again</PrimaryPill> : null}
          <TextPill href="/login">Go to login</TextPill>
        </>
      }
      footnote="Shule+ Director Console"
    />
  );
}

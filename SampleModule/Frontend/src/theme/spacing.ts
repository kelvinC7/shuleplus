/**
 * ShulePlus Design System — Spacing tokens (8px system).
 * Matches Tailwind's default scale; use Tailwind spacing utilities in JSX.
 */

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  4: '16px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export type SpacingKey = keyof typeof spacing;

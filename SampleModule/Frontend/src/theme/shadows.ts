/**
 * ShulePlus Design System — Shadow tokens.
 * `soft`/`softLg`/`glowPrimary` map to utility classes in globals.css.
 */

export const shadows = {
  sm: '0 1px 2px rgba(0, 4, 53, 0.05)',
  soft: '0 1px 2px rgba(0, 4, 53, 0.04), 0 4px 12px -2px rgba(0, 4, 53, 0.08)',
  softLg: '0 2px 4px rgba(0, 4, 53, 0.05), 0 12px 32px -8px rgba(0, 4, 53, 0.14)',
  glowPrimary: '0 1px 2px rgba(0, 4, 53, 0.08), 0 6px 20px -6px rgba(252, 176, 56, 0.55)',
  xl: '0 20px 48px -12px rgba(0, 4, 53, 0.22)',
} as const;

/** Semantic usage → class name. */
export const shadowUsage = {
  card: 'shadow-soft',
  dialog: 'shadow-soft-lg',
  button: 'shadow-glow-primary',
} as const;

export type ShadowKey = keyof typeof shadows;

/**
 * ShulePlus Design System — Color tokens
 *
 * These mirror the CSS custom properties defined in `globals.css`.
 * Prefer Tailwind semantic classes (bg-primary, text-success, ...) in JSX.
 * Use these constants only when you need a raw value (charts, canvas, inline
 * styles, emails, etc.).
 */

export const brand = {
  primary: '#FCB038',
  primaryHover: '#E09A20',
  secondary: '#000435',
  secondaryLight: '#0A0F5C',
} as const;

export const semantic = {
  success: '#16A34A',
  warning: '#F59E0B',
  destructive: '#DC2626',
  info: '#2563EB',
} as const;

export const surface = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  foreground: '#000435',
  mutedForeground: '#64748B',
} as const;

/** Status → color mapping used by StatusBadge and tables across modules. */
export const status = {
  active: semantic.success,
  approved: '#059669',
  completed: semantic.info,
  pending: semantic.warning,
  rejected: semantic.destructive,
  inactive: surface.mutedForeground,  
} as const;

export const colors = {
  ...brand,
  ...semantic,
  ...surface,
} as const;

export type StatusKey = keyof typeof status;

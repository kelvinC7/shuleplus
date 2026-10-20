/** ShulePlus design system tokens — shared across all microservice frontends */

export const colors = {
  primary: '#FCB038',
  primaryHover: '#E09A20',
  navy: '#000435',
  navyLight: '#0A0F5C',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  muted: '#64748B',
  border: '#E2E8F0',
  danger: '#EF4444',
  success: '#FCB038',
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const shadow = {
  sm: '0 1px 3px rgba(0, 4, 53, 0.04)',
  md: '0 4px 12px rgba(0, 4, 53, 0.08)',
  lg: '0 12px 32px rgba(0, 4, 53, 0.12)',
} as const;

export const typography = {
  display: 'font-montserrat text-4xl font-bold tracking-tight text-foreground',
  heading: 'font-montserrat text-2xl font-bold text-foreground',
  title: 'font-montserrat text-lg font-semibold text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  body: 'text-sm text-foreground',
  caption: 'text-xs text-muted-foreground',
} as const;

export const animation = {
  fade: 'animate-in fade-in duration-200',
  slide: 'animate-in slide-in-from-bottom-2 duration-300',
  scale: 'animate-in zoom-in-95 duration-200',
} as const;

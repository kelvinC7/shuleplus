/**
 * ShulePlus Design System - Typography tokens
 * Font family: Montserrat. Keep to this scale; do not invent new sizes.
 */

export const typography = {
  fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif",

  sizes: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
    "5xl": "48px",
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  /** Named roles → Tailwind classes. Backing store for <Typography> components. */
  roles: {
    displayLarge: "text-5xl font-bold tracking-tight",
    display: "text-4xl font-bold tracking-tight",
    pageTitle: "text-3xl font-bold tracking-tight",
    sectionTitle: "text-2xl font-semibold",
    cardTitle: "text-xl font-semibold",
    subtitle: "text-lg font-medium",
    body: "text-base font-normal",
    secondary: "text-sm font-normal",
    small: "text-xs font-normal",
    caption: "text-[11px] font-medium tracking-wide",
    label: "text-sm font-medium",
  },
} as const;

export type TypographyRole = keyof typeof typography.roles;

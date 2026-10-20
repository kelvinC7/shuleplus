/**
 * ShulePlus Design System - Border radius tokens.
 * Backed by CSS variables in globals.css (--radius-input, --radius-card,...).
 */

export const radius = {
  input: "10px",
  button: "10px",
  card: "16px",
  cardLarge: "20px",
  dialog: "16px",
  pill: "9999px",
} as const;

export type RadiusKey = keyof typeof radius;

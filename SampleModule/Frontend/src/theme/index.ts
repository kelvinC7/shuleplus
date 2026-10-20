/**
 * ShulePlus Design System — central token export.
 *
 * Import from a single place:
 *   import { theme, colors, typography, status } from '@/theme';
 *
 * In a multi-microservice setup this folder is the candidate to extract into a
 * shared package (e.g. `@shuleplus/ui/theme`) so every module shares one source
 * of truth for colors, type, spacing, radius, and shadows.
 */

import { colors, brand, semantic, surface, status } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows, shadowUsage } from './shadows';

export { colors, brand, semantic, surface, status } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';
export { radius } from './radius';
export { shadows, shadowUsage } from './shadows';

export type { StatusKey } from './colors';
export type { TypographyRole } from './typography';
export type { SpacingKey } from './spacing';
export type { RadiusKey } from './radius';
export type { ShadowKey } from './shadows';

export const theme = {
  colors,
  brand,
  semantic,
  surface,
  status,
  typography,
  spacing,
  radius,
  shadows,
  shadowUsage,
} as const;

export default theme;

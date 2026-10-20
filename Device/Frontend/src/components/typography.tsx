import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * ShulePlus Design System — Typography components.
 *
 * Use these instead of repeating text-size/weight classes so the whole ERP
 * shares one type scale. Each accepts `className` for spacing/color overrides
 * and an `as` prop to change the rendered element where semantics require it.
 */

type TypographyProps = {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

function createTypography(
  defaultElement: React.ElementType,
  baseClass: string,
  displayName: string
) {
  function Component({ as, className, children, ...props }: TypographyProps) {
    const Element = as ?? defaultElement;
    return (
      <Element className={cn(baseClass, className)} {...props}>
        {children}
      </Element>
    );
  }
  Component.displayName = displayName;
  return Component;
}

/** 48px / 700 — hero / marketing */
export const DisplayLarge = createTypography('h1', 'text-5xl leading-tight font-bold tracking-tight text-foreground', 'DisplayLarge');
/** 36px / 700 */
export const Display = createTypography('h1', 'text-4xl leading-tight font-bold tracking-tight text-foreground', 'Display');
/** 30px / 700 — page title */
export const PageTitle = createTypography('h1', 'text-3xl leading-tight font-bold tracking-tight text-foreground', 'PageTitle');
/** 24px / 600 — section heading */
export const SectionTitle = createTypography('h2', 'text-2xl leading-snug font-semibold text-foreground', 'SectionTitle');
/** 20px / 600 — card heading */
export const CardHeading = createTypography('h3', 'text-xl leading-snug font-semibold text-foreground', 'CardHeading');
/** 18px / 500 */
export const Subtitle = createTypography('p', 'text-lg font-medium text-foreground', 'Subtitle');
/** 16px / 400 — body copy */
export const BodyText = createTypography('p', 'text-base font-normal text-foreground', 'BodyText');
/** 14px / 400 — secondary copy */
export const SecondaryText = createTypography('p', 'text-sm font-normal text-muted-foreground', 'SecondaryText');
/** 11px / 500 — captions, eyebrows */
export const Caption = createTypography('span', 'text-[11px] font-medium tracking-wide text-muted-foreground', 'Caption');

/** Form field label — 14px / 500 */
export const FieldLabel = createTypography('label', 'text-sm font-medium text-foreground', 'FieldLabel');
/** Helper text under inputs — 12px / 400 */
export const HelperText = createTypography('p', 'text-xs font-normal text-muted-foreground', 'HelperText');
/** Error text under inputs — 12px / 400 */
export const ErrorText = createTypography('p', 'text-xs font-normal text-destructive', 'ErrorText');

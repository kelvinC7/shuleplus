export const MAIN_SCROLL_ID = 'shulechat-main-scroll';

export function getMainScrollEl(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.getElementById(MAIN_SCROLL_ID) ?? undefined;
}

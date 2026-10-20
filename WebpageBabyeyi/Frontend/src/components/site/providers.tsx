'use client';

import { LanguageProvider } from './language-provider';

export function SiteProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

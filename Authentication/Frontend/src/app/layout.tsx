import type { Metadata } from 'next';
import Script from 'next/script';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShulePlus - Sign In',
  description: 'ShulePlus Identity & Access Management',
  icons: {
    icon: '/yellow-icon.png',
    shortcut: '/yellow-icon.png',
    apple: '/yellow-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === 'development' ? (
          <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
        ) : null}
      </body>
    </html>
  );
}

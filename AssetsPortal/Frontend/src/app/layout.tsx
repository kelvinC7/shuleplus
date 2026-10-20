import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { AssetsProviders } from '@/components/assets-providers';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Assets Portal · ShulePlus',
  description: 'Fixed assets management module',
  icons: {
    icon: '/yellow-icon.png',
    shortcut: '/yellow-icon.png',
    apple: '/yellow-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        <AssetsProviders>
          <TokenBootstrapSuspense />
          {children}
        </AssetsProviders>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

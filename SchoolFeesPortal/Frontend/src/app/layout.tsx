import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { FeesProviders } from '@/components/fees-providers';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'School Fees · ShulePlus',
  description: 'Student fee collection, billing, payments & financial analytics',
  icons: {
    icon: '/yellow-icon1.png',
    shortcut: '/yellow-icon1.png',
    apple: '/yellow-icon1.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        <FeesProviders>
          <TokenBootstrapSuspense />
          {children}
        </FeesProviders>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

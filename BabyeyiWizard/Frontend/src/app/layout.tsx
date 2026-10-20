import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { BabyeyiProviders } from '@/components/babyeyi-providers';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'Babyeyi Wizard · ShulePlus',
  description: 'Create, manage and publish official school circulars',
  icons: {
    icon: '/yellow-icon.png',
    shortcut: '/yellow-icon.png',
    apple: '/yellow-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${montserrat.className} antialiased`}>
        <BabyeyiProviders>
          <TokenBootstrapSuspense />
          {children}
        </BabyeyiProviders>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { TransportProviders } from '@/components/transport-providers';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'Smart Transport · ShulePlus',
  description: 'RFID boarding, live trips, GPS and student safety',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        <TransportProviders>
          <TokenBootstrapSuspense />
          {children}
        </TransportProviders>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

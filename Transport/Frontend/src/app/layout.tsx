import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { PwaRegister } from '@/components/pwa-register';
import { TransportProviders } from '@/components/transport-providers';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'ShulePlus Transport',
  description: 'RFID boarding, live trips, GPS and student safety',
  applicationName: 'ShulePlus Transport',
  icons: {
    icon: [
      { url: '/yellow-icon.png', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Transport',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  themeColor: '#000435',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        <TransportProviders>
          <PwaRegister />
          <TokenBootstrapSuspense />
          {children}
        </TransportProviders>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

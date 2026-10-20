import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { PayrollProviders } from '@/components/payroll-providers';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'Payroll Center · ShulePlus',
  description: 'Rwanda-compliant payroll management',
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
        <PayrollProviders>
          <TokenBootstrapSuspense />
          {children}
        </PayrollProviders>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

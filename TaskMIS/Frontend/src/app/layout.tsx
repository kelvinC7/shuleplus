import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'Task & Workflow Center · ShulePlus',
  description: 'Task & Workflow Management module',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        <TokenBootstrapSuspense />
        {children}
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

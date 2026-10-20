import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { BudgetProviders } from '@/components/budget-providers';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'School Budget · ShulePlus',
  description: 'School budget planning, allocation, and usage tracking',
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
        <BudgetProviders>
          <TokenBootstrapSuspense />
          {children}
        </BudgetProviders>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

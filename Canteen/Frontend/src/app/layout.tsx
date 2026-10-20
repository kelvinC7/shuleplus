import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import Script from 'next/script';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from 'sonner';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'ShuleCanteen · School Ecosystem',
  description: 'Student card wallets, POS sales, suppliers and deliveries for school canteens.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className={outfit.variable}>
        <TokenBootstrapSuspense />
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="bottom-right" richColors closeButton />
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

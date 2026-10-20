import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Digital Attendance · ShulePlus',
  description: 'Gate devices, live scans, and attendance',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/yellow-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} font-sans`}>
      <body className="font-montserrat antialiased">
        <TooltipProvider>
          <TokenBootstrapSuspense />
          {children}
        </TooltipProvider>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

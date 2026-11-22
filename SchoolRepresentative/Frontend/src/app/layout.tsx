import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { ConsoleProvider } from '@/contexts/console-context';
import { PwaRegister } from '@/components/pwa-register';
import { TokenAutoRefresh } from '@/components/token-auto-refresh';
import { Toaster } from 'sonner';
import ThemeRegistry from '@/theme/ThemeRegistry';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'Director Console · Shule+',
  description: 'Executive monitoring, approvals and decision layer for group directors',
  applicationName: 'Director Console',
  appleWebApp: {
    capable: true,
    title: 'Director Console',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/yellow-icon.png',
    shortcut: '/yellow-icon.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#08132A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        <ThemeRegistry>
          <PwaRegister />
          <TokenAutoRefresh />
          <ConsoleProvider>{children}</ConsoleProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeRegistry>
      </body>
    </html>
  );
}

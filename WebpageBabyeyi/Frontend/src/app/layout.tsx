import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { SiteProviders } from '@/components/site/providers';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'babyeyi.rw · Parents Convenience',
  description:
    'Schools, Sorted. Discover the right school. Explore programmes. Get your Babyeyi. Connect with schools. Enrol with ease. Pay securely. Your entire school journey, sorted.',
  icons: {
    icon: [{ url: '/babyeyi-icon.png', type: 'image/png' }],
    apple: [{ url: '/babyeyi-icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-sans antialiased">
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}

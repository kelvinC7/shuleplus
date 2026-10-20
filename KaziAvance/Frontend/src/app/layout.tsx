import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { PortalRedirect } from "@/components/portal-redirect";
import { TokenBootstrapSuspense } from "@/components/token-bootstrap";

export const metadata: Metadata = {
  title: "KaziAdvance Admin",
  description: "Modern salary advance management for organization administrators.",
  icons: {
    icon: "/yellow-icon.png",
    shortcut: "/yellow-icon.png",
    apple: "/yellow-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TokenBootstrapSuspense />
        <Suspense fallback={null}>
          <PortalRedirect />
        </Suspense>
        {children}
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

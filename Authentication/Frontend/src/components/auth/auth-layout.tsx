import Image from 'next/image';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="auth-bg min-h-screen">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy">
              <Image
                src="/logo.svg"
                alt="ShulePlus"
                width={40}
                height={40}
                className="h-10 w-10"
                priority
              />
            </div>
            <h1 className="font-montserrat text-2xl font-bold text-navy">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-muted font-poppins-regular">{subtitle}</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface/95 p-8 shadow-xl backdrop-blur-sm">
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            &copy; {new Date().getFullYear()} ShulePlus by Babyeyi. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-sm font-poppins-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

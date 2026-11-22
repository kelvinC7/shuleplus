import { Link } from 'react-router-dom';
import { WelcomeHeader } from '@/components/welcome/welcome-header';

const COPY = {
  about: {
    title: 'About ShuleTrip',
    body: 'ShuleTrip is Rwanda\'s digital platform for planning, approving and monitoring educational school trips. We connect schools, parents and government authorities with transparent workflows, digital consent and real-time trip visibility.',
  },
  features: {
    title: 'Features',
    body: 'School trip registration wizards, document vaults, parent consent, transport safety checks, government review queues, QR verification, live monitoring dashboards and audit-ready reports — built for nursery through TVET.',
  },
  contact: {
    title: 'Contact Us',
    body: 'Reach the ShuleTrip team for onboarding help, verification status or technical support. We respond within one business day.',
  },
} as const;

export default function MarketingSubpage({ variant }: { variant: keyof typeof COPY }) {
  const { title, body } = COPY[variant];
  return (
    <div className="min-h-screen bg-white">
      <WelcomeHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-extrabold text-navy">{title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-600">{body}</p>
        {variant === 'contact' ? (
          <ul className="mt-8 space-y-2 text-sm font-semibold text-navy">
            <li>Email: support@shuleplus.rw</li>
            <li>Phone: +250 788 123 456</li>
            <li>Hours: Mon–Fri, 8:00–17:00 CAT</li>
          </ul>
        ) : null}
        <Link to="/" className="mt-10 inline-flex text-sm font-bold text-amber-800 hover:underline">
          ← Back to welcome
        </Link>
      </main>
    </div>
  );
}

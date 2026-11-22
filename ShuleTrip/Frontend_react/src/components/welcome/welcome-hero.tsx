import { Link } from 'react-router-dom';
import { Bus, CalendarPlus, FileCheck, Mail, Phone, School, ShieldCheck } from 'lucide-react';

const CONTACT_EMAIL = 'info@edupoto.com';
const CONTACT_PHONE = '+250 793 903 844'; 

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: 'Safe & Secure Trips' },
  { icon: FileCheck, title: 'Digital Parent Consent' },
  { icon: Bus, title: 'Smart Trip Monitoring' },
];

const STEPS = [
  {
    icon: School,
    title: 'Register your school',
    text: 'Create your school account in minutes and add your teachers and staff.',
  },
  {
    icon: CalendarPlus,
    title: 'Plan the trip',
    text: 'Set the destination, date, transport and budget, then submit it for approval.',
  },
  {
    icon: FileCheck,
    title: 'Parents give consent',
    text: 'Parents review the trip details and approve digitally, with no paper forms.',
  },
  {
    icon: Bus,
    title: 'Travel & monitor',
    text: 'Follow the trip from departure to return, with authorities kept in the loop.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">How it works</p>
          <h2 className="mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-extrabold leading-tight tracking-tight text-navy">
            From planning to return in four simple steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            One platform for schools, parents and authorities, so every trip is organised and transparent.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span
                aria-hidden
                className="absolute right-5 top-4 text-5xl font-extrabold leading-none text-navy/5"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber/20 text-navy">
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <h3 className="mt-5 text-base font-bold text-navy">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex justify-center">
          <Link
            to="/register"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-amber px-8 text-sm font-bold text-navy shadow-[0_10px_28px_rgba(252,176,56,0.4)] transition hover:-translate-y-0.5 sm:w-auto"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="scroll-mt-20 bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-10">
        <div className="grid gap-10 text-center md:grid-cols-[1.2fr_1fr] md:text-left lg:gap-16">
          <div>
            <p className="text-lg font-extrabold tracking-tight">ShuleTrip</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70 md:mx-0">
              Safe journeys and smarter school trips, connecting schools, parents and authorities on one secure
              platform.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold md:justify-start">
              <Link to="/register" className="text-white/80 transition hover:text-amber">
                Register
              </Link>
              <Link to="/login" className="text-white/80 transition hover:text-amber">
                Login
              </Link>
              <Link to={{ pathname: '/', hash: 'how-it-works' }} className="text-white/80 transition hover:text-amber">
                How it works
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber">Contact us</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-3 text-white/85 transition hover:text-amber"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10">
                    <Mail className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-3 text-white/85 transition hover:text-amber"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10">
                    <Phone className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  {CONTACT_PHONE}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} ShuleTrip. All rights reserved.</p>
          <p>
            Managed by <span className="font-bold text-white">Edupoto</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function WelcomeHero() {
  return (
    <>
      <section id="home" className="relative flex flex-col overflow-hidden lg:block scroll-mt-20">
        <img
          src="/my_bg_amber.jpeg"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden
        />
        {/* Readability: strong white wash on mobile (top to bottom), soft left fade on desktop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/60 lg:bg-gradient-to-r lg:from-white/95 lg:via-white/60 lg:to-transparent"
        />

        {/* Text content */}
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:grid lg:min-h-[min(100vh,820px)] lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-10 lg:py-20">
          <div className="text-center lg:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
              Smart school trip management
            </p>
            <h1 className="mt-4 text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[1.1] tracking-tight text-navy">
              Safe Journeys. <span className="block sm:inline">Smarter School Trips.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg lg:mx-0">
              Plan, manage and monitor educational trips with confidence. ShuleTrip connects schools, parents and
              government authorities through one secure digital platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-amber px-7 text-sm font-bold text-navy shadow-[0_10px_28px_rgba(252,176,56,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(252,176,56,0.45)]"
              >
                Register Your School
              </Link>
              <Link
                to="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border-2 border-navy bg-white/80 px-7 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
              >
                Login to ShuleTrip
              </Link>
            </div>
            <p className="mt-4 text-center text-sm text-slate-600 lg:text-left">
              Government official?{' '}
              <Link to="/login?portal=government" className="font-bold text-navy hover:underline">
                Sign in here
              </Link>
            </p>

            <ul className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
              {HIGHLIGHTS.map(({ icon: Icon, title }) => (
                <li
                  key={title}
                  className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/90 px-3.5 py-2 text-xs font-bold text-navy shadow-sm sm:text-[13px]"
                >
                  <Icon className="h-4 w-4 text-amber-800" strokeWidth={2.2} />
                  {title}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Image: rounded card on mobile, full-height right panel on desktop */}
        <div className="relative px-4 pb-12 sm:px-6 lg:absolute lg:inset-y-0 lg:right-0 lg:left-1/2 lg:p-0">
          <div className="mx-auto max-w-md overflow-hidden rounded-3xl shadow-[0_24px_48px_rgba(0,4,53,0.18)] sm:max-w-lg lg:h-full lg:max-w-none lg:rounded-none lg:rounded-l-[56px] lg:shadow-[-24px_0_60px_rgba(0,4,53,0.18)]">
            <img
              src="/shuletrip-bg.png"
              alt="Students and school bus"
              width={960}
              height={720}
              className="block aspect-[4/3] h-full w-full object-cover object-center lg:aspect-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </section>

      <HowItWorks />
      <SiteFooter />
    </>
  );
}
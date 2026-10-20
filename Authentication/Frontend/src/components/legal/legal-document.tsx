import Image from 'next/image';
import Link from 'next/link';

export interface LegalSubSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  subSections?: LegalSubSection[];
}

interface LegalDocumentProps {
  eyebrow: string;
  title: string;
  effectiveDate?: string;
  lastUpdated: string;
  summary: string;
  sections: LegalSection[];
}

export function LegalDocument({
  eyebrow,
  title,
  effectiveDate,
  lastUpdated,
  summary,
  sections,
}: LegalDocumentProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-10 border-b border-navy/10 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Shule+ home">
            <Image
              src="/logo.png"
              alt="Shule+"
              width={160}
              height={48}
              style={{ width: 'auto', height: 'auto' }}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-soft transition-all hover:border-primary/40 hover:bg-white hover:shadow-md"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy/5 transition-transform group-hover:-translate-x-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </span>
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="mx-auto max-w-3xl">
          <p className="font-montserrat text-xs font-bold uppercase tracking-[0.25em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-montserrat text-3xl font-black text-navy sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm font-poppins-medium text-muted">
            {effectiveDate && (
              <>
                <span className="text-navy">Effective date:</span> {effectiveDate}
                <span className="mx-2 text-navy/30">|</span>
              </>
            )}
            <span className="text-navy">Last updated:</span> {lastUpdated}
          </p>
          <p className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 px-5 py-4 text-[15px] font-poppins-regular leading-relaxed text-navy/90">
            {summary}
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 rounded-2xl border border-navy/10 bg-white p-5">
              <p className="font-montserrat text-xs font-bold uppercase tracking-widest text-navy/50">
                On this page
              </p>
              <ul className="mt-4 space-y-2.5">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-[13px] font-poppins-medium text-muted transition-colors hover:text-primary"
                    >
                      <span className="mr-1.5 text-navy/30">{i + 1}.</span>
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0">
            <div className="space-y-10">
              {sections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 rounded-2xl border border-navy/10 bg-white p-6 sm:p-8"
                >
                  <h2 className="font-montserrat text-xl font-bold text-navy">
                    <span className="mr-2 text-primary">{i + 1}.</span>
                    {section.heading}
                  </h2>

                  {section.paragraphs?.map((p, j) => (
                    <p
                      key={j}
                      className="mt-4 text-[14.5px] font-poppins-regular leading-relaxed text-navy/80"
                    >
                      {p}
                    </p>
                  ))}

                  {section.bullets && (
                    <ul className="mt-4 space-y-2">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="flex gap-3 text-[14.5px] font-poppins-regular leading-relaxed text-navy/80">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.subSections?.map((sub) => (
                    <div key={sub.heading} className="mt-6">
                      <h3 className="font-montserrat text-base font-semibold text-navy">
                        {sub.heading}
                      </h3>
                      {sub.paragraphs?.map((p, j) => (
                        <p
                          key={j}
                          className="mt-3 text-[14.5px] font-poppins-regular leading-relaxed text-navy/80"
                        >
                          {p}
                        </p>
                      ))}
                      {sub.bullets && (
                        <ul className="mt-3 space-y-2">
                          {sub.bullets.map((b, j) => (
                            <li key={j} className="flex gap-3 text-[14.5px] font-poppins-regular leading-relaxed text-navy/80">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-navy/10 bg-white px-6 py-6 sm:flex-row">
              <p className="text-center text-sm font-poppins-medium text-navy/70 sm:text-left">
                Have questions about this document?
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/privacy"
                  className="rounded-full border border-navy/15 px-4 py-2 text-xs font-poppins-semibold text-navy transition-colors hover:border-primary hover:text-primary"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="rounded-full border border-navy/15 px-4 py-2 text-xs font-poppins-semibold text-navy transition-colors hover:border-primary hover:text-primary"
                >
                  Terms &amp; Conditions
                </Link>
                <Link
                  href="/user-data-access"
                  className="rounded-full border border-navy/15 px-4 py-2 text-xs font-poppins-semibold text-navy transition-colors hover:border-primary hover:text-primary"
                >
                  User Data &amp; Access
                </Link>
              </div>
            </div>
          </article>
        </div>
      </main>

      <footer className="border-t border-navy/10 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 sm:flex-row sm:px-8">
          <p className="text-xs font-poppins-regular tracking-wider text-muted uppercase">
            © {new Date().getFullYear()} SHULEPLUS. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-5 text-xs font-poppins-medium text-muted">
            <Link href="/privacy" className="hover:text-primary">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary">
              Terms
            </Link>
            <Link href="/user-data-access" className="hover:text-primary">
              User Data &amp; Access
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Container, Reveal } from "./ui/Primitives";
import { orgTypes } from "@/lib/data";

export function TrustedOrgs() {
  const loop = [...orgTypes, ...orgTypes];

  return (
    <section className="overflow-hidden bg-white py-20">
      <Container>
        <Reveal className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-navy-700/50">
            Trusted across every kind of organization
          </p>
        </Reveal>
      </Container>

      <div className="marquee-shell relative mt-10 mask-fade-x">
        <div className="marquee-track gap-4 px-6">
          {loop.map((org, i) => (
            <div
              key={`${org.name}-${i}`}
              className="flex min-w-[190px] shrink-0 items-center gap-3 rounded-2xl border border-navy-900/[0.06] bg-mist-50 px-5 py-4 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft">
                <org.icon className="h-5 w-5 text-navy-800" strokeWidth={1.75} />
              </span>
              <span className="font-display text-sm font-semibold text-navy-900">
                {org.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

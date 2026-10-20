import { Container, Reveal } from "./ui/Primitives";
import { Counter } from "./ui/Counter";
import { stats } from "@/lib/data";

const featured = stats.slice(0, 4);

export function Stats() {
  return (
    <section className="border-y border-navy-900/[0.06] bg-white/70 py-12 backdrop-blur-sm">
      <Container>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {featured.map((s, i) => (
            <Reveal key={s.label} index={i}>
              <div className="rounded-2xl border border-navy-900/[0.06] bg-white px-4 py-5 text-center shadow-soft">
                <p className="font-display text-3xl font-semibold tracking-tight text-navy-900">
                  <Counter
                    value={s.value}
                    suffix={s.suffix}
                    decimals={s.label === "Uptime" ? 2 : 0}
                  />
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-navy-700/55">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

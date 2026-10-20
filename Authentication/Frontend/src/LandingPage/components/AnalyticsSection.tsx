'use client';

import { Container, Reveal } from './ui/Primitives';
import { Counter } from './ui/Counter';
import { motion } from 'framer-motion';

const kpis = [
  { value: 50000, suffix: '+', label: 'Students' },
  { value: 400, suffix: '+', label: 'Schools' },
  { value: 98, suffix: '%', label: 'Performance' },
  { value: 50, suffix: 'M+', label: 'Transactions', decimals: 0 },
];

const bars = [38, 52, 44, 68, 58, 76, 62, 84, 70, 92, 78, 88, 74, 96];

export function AnalyticsSection() {
  return (
    <section id="analytics" className="relative overflow-hidden bg-[#EEF1F6] py-20 lg:py-28">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <Reveal>
            <p className="max-w-md text-pretty text-lg leading-relaxed text-navy-900 sm:text-xl">
              Animated collection trends, live counters and executive KPIs — built for finance boards
              and school leaders.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-2xl bg-white px-5 py-6 sm:px-6 sm:py-7">
                  <p className="font-display text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
                    <Counter value={k.value} suffix={k.suffix} decimals={k.decimals ?? 0} />
                  </p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-700/45">
                    {k.label}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal index={1}>
            <div className="rounded-[28px] bg-white p-6 sm:p-8 lg:p-10">
              <div className="flex h-56 items-end gap-1.5 sm:h-64 sm:gap-2.5">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    className="relative flex-1 overflow-hidden rounded-t-xl"
                    style={{
                      background:
                        'linear-gradient(180deg, #FCB038 0%, #F59E0B 45%, rgba(255,255,255,0) 100%)',
                    }}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

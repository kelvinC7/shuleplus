"use client";

import { motion } from "framer-motion";
import { TrendingUp, Bell, Sparkles } from "lucide-react";
import { Container, Reveal, SectionHeading } from "./ui/Primitives";

const bars = [38, 62, 48, 74, 56, 88, 64, 92, 70, 98, 80, 100];
const donutSegments = [
  { color: "#6366f1", value: 34 },
  { color: "#10b981", value: 26 },
  { color: "#fcb038", value: 22 },
  { color: "#8b5cf6", value: 18 },
];

const donutSegmentsWithOffset = donutSegments.reduce<
  { color: string; value: number; offset: number }[]
>((acc, seg) => {
  const prevOffset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].value : 0;
  acc.push({ ...seg, offset: prevOffset });
  return acc;
}, []);

export function DashboardShowcase() {
  return (
    <section id="solutions" className="bg-white py-24 lg:py-32">
      <Container>
        <SectionHeading
          eyebrow="Live Dashboards"
          title="Every metric your leadership team actually looks at."
          description="Student analytics, financial reports, payroll statistics, procurement and attendance — rendered as living dashboards, not static exports."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {/* Big chart card */}
          <Reveal index={0} className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-3xl border border-navy-900/[0.07] bg-gradient-to-br from-navy-900 to-navy-800 p-7 shadow-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-white/50">
                    Financial Reports
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-white">
                    $4.82M <span className="text-sm font-medium text-emerald-accent">+18.4%</span>
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <TrendingUp className="h-4.5 w-4.5 text-amber-400" />
                </span>
              </div>

              <div className="mt-8 flex h-40 items-end gap-2.5">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.04, ease: "easeOut" }}
                    className={`flex-1 rounded-t-md ${
                      i === bars.length - 1
                        ? "bg-gradient-to-t from-amber-500 to-amber-300"
                        : "bg-white/12"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-between font-mono text-[10px] text-white/35">
                <span>JAN</span>
                <span>JUN</span>
                <span>DEC</span>
              </div>
            </div>
          </Reveal>

          {/* Donut + attendance stack */}
          <div className="flex flex-col gap-6">
            <Reveal index={1}>
              <div className="rounded-3xl border border-navy-900/[0.07] bg-mist-50 p-6 shadow-soft">
                <p className="font-mono text-[11px] uppercase tracking-wide text-navy-700/50">
                  Payroll Statistics
                </p>
                <div className="mt-4 flex items-center gap-5">
                  <svg viewBox="0 0 42 42" className="h-24 w-24 -rotate-90">
                    <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#e6ebf2" strokeWidth="5" />
                    {donutSegmentsWithOffset.map((seg) => (
                      <circle
                        key={seg.color}
                        cx="21"
                        cy="21"
                        r="15.9"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="5"
                        strokeDasharray={`${seg.value} ${100 - seg.value}`}
                        strokeDashoffset={-seg.offset}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div className="space-y-1.5">
                    {donutSegments.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11.5px] text-navy-700/70">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.value}% dept. {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal index={2}>
              <div className="rounded-3xl border border-navy-900/[0.07] bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-navy-700/50">
                    Real-Time Alerts
                  </p>
                  <Bell className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-3 space-y-2.5">
                  {[
                    { icon: Sparkles, text: "AI flagged 3 budget variances" },
                    { icon: TrendingUp, text: "Attendance up 4.2% this week" },
                  ].map((n, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl bg-mist-50 px-3 py-2.5">
                      <n.icon className="h-3.5 w-3.5 shrink-0 text-indigo-accent" />
                      <span className="text-[12px] text-navy-700/75">{n.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { Container, Reveal, SectionHeading } from "./ui/Primitives";
import { coreServices, connectedServices, accentMap } from "@/lib/data";

const RADIUS = 178;

function nodePosition(index: number, total: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * RADIUS;
  const y = Math.sin(angle) * RADIUS;
  return { x, y, angle };
}

export function Architecture() {
  return (
    <section id="developers" className="relative overflow-hidden bg-navy-900 py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-grid absolute inset-0 text-white opacity-[0.06]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.06] blur-3xl" />
      </div>

      <Container className="relative grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Platform Architecture"
            tone="dark"
            title="A true microservices core, not a monolith with new paint."
            description="Every suite is an independently deployable service, talking through one gateway, one identity layer, and one event bus — so new modules ship without touching what already works."
          />

          <div className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {coreServices.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
              >
                <s.icon className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={1.8} />
                <span className="text-[12px] font-medium text-navy-100/85">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Radial diagram */}
        <div className="relative mx-auto flex h-[460px] w-full max-w-[460px] items-center justify-center overflow-hidden">
          <svg
            className="absolute inset-0 h-full w-full mask-fade-b"
            viewBox="-230 -230 460 460"
          >
            {connectedServices.map((_, i) => {
              const { x, y } = nodePosition(i, connectedServices.length);
              return (
                <line
                  key={i}
                  x1={0}
                  y1={0}
                  x2={x}
                  y2={y}
                  stroke="rgba(252,176,56,0.35)"
                  strokeWidth="1.2"
                  strokeDasharray="5 7"
                  className="animate-dash"
                />
              );
            })}
            <circle cx={0} cy={0} r={64} fill="none" stroke="rgba(255,255,255,0.08)" />
            <circle cx={0} cy={0} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" />
          </svg>

          {/* Center hub */}
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex h-28 w-28 flex-col items-center justify-center rounded-3xl glass-dark shadow-glow-amber"
          >
            <Network className="h-6 w-6 text-amber-400" strokeWidth={1.75} />
            <span className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-white/70">
              API Gateway
            </span>
          </motion.div>

          {/* Orbit nodes */}
          {connectedServices.map((s, i) => {
            const { x, y } = nodePosition(i, connectedServices.length);
            const a = accentMap[s.accent];
            return (
              <Reveal
                key={s.name}
                index={i}
                className="absolute z-10"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl glass-dark ring-1 ${a.ring}`}
                  >
                    <s.icon className={`h-4.5 w-4.5 ${a.text}`} strokeWidth={1.9} />
                  </span>
                  <span className="whitespace-nowrap font-mono text-[9.5px] uppercase tracking-wide text-white/60">
                    {s.name}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

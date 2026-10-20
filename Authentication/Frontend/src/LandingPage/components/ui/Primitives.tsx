"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1240px] px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function Reveal({
  children,
  className = "",
  index = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={revealVariants}
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
        tone === "light"
          ? "border-navy-900/10 bg-navy-900/[0.03] text-navy-700"
          : "border-white/15 bg-white/5 text-amber-300"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "light",
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  return (
    <div className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-5 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1] ${
          tone === "dark" ? "text-white" : "text-navy-900"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 text-pretty text-base leading-relaxed ${
            tone === "dark" ? "text-navy-100/70" : "text-navy-700/70"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}

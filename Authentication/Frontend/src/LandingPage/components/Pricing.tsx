"use client";

import { useState } from "react";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Container, Reveal, SectionHeading } from "./ui/Primitives";

const tiers = [
  {
    name: "Starter",
    desc: "For a single organization getting off spreadsheets.",
    monthly: 49,
    annual: 39,
    featured: false,
    features: [
      "Up to 500 users",
      "Education & HR suites",
      "Standard reporting",
      "Email support",
      "1 organization",
    ],
  },
  {
    name: "Professional",
    desc: "For growing institutions running multiple sites.",
    monthly: 149,
    annual: 119,
    featured: true,
    features: [
      "Up to 5,000 users",
      "All product suites",
      "AI Insights & Reports",
      "Priority support",
      "Up to 5 organizations",
      "API & webhooks access",
    ],
  },
  {
    name: "Enterprise",
    desc: "For networks and government-scale deployments.",
    monthly: null,
    annual: null,
    featured: false,
    features: [
      "Unlimited users",
      "All suites + Marketplace",
      "Dedicated success manager",
      "Custom SLAs & 99.99% uptime",
      "Unlimited organizations",
      "Custom microservice builds",
    ],
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  return (
    <section id="pricing" className="bg-mist-50 py-24 lg:py-32">
      <Container>
        <div className="flex flex-col items-center gap-6 text-center">
          <SectionHeading
            eyebrow="Pricing"
            align="center"
            title="Pricing that scales from one campus to a national network."
            description="Every plan includes core platform services — authentication, notifications and analytics — at no extra cost."
          />

          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-navy-900/10 bg-white p-1 shadow-soft">
            {(["Monthly", "Annual"] as const).map((label) => {
              const isAnnual = label === "Annual";
              const active = annual === isAnnual;
              return (
                <button
                  key={label}
                  onClick={() => setAnnual(isAnnual)}
                  className={`relative rounded-full px-5 py-2 text-[13px] font-semibold transition-colors ${
                    active ? "text-white" : "text-navy-700/60"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 -z-10 rounded-full bg-navy-900" />
                  )}
                  {label}
                  {isAnnual && (
                    <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                      -20%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <Reveal key={tier.name} index={i}>
              <div
                className={`relative flex h-full flex-col rounded-3xl p-7 ${
                  tier.featured
                    ? "border border-amber-400/40 bg-navy-900 shadow-lift"
                    : "border border-navy-900/[0.07] bg-white shadow-soft"
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-7 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-navy-900">
                    <Sparkles className="h-3 w-3" /> Most Popular
                  </span>
                )}
                <h3
                  className={`font-display text-xl font-semibold ${
                    tier.featured ? "text-white" : "text-navy-900"
                  }`}
                >
                  {tier.name}
                </h3>
                <p
                  className={`mt-1.5 text-[13px] ${
                    tier.featured ? "text-navy-100/60" : "text-navy-700/60"
                  }`}
                >
                  {tier.desc}
                </p>

                <div className="mt-6">
                  {tier.monthly ? (
                    <p className={`font-display text-4xl font-semibold ${tier.featured ? "text-white" : "text-navy-900"}`}>
                      ${annual ? tier.annual : tier.monthly}
                      <span className={`text-sm font-medium ${tier.featured ? "text-navy-100/50" : "text-navy-700/50"}`}>
                        /org/mo
                      </span>
                    </p>
                  ) : (
                    <p className={`font-display text-4xl font-semibold ${tier.featured ? "text-white" : "text-navy-900"}`}>
                      Custom
                    </p>
                  )}
                </div>

                <ul className="mt-7 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2.5 text-[13.5px] ${
                        tier.featured ? "text-navy-100/80" : "text-navy-700/75"
                      }`}
                    >
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          tier.featured ? "text-amber-400" : "text-emerald-accent"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.monthly ? "#get-started" : "#demo"}
                  className={`group mt-8 flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-[13.5px] font-semibold transition-transform hover:-translate-y-0.5 ${
                    tier.featured
                      ? "bg-amber-500 text-navy-900"
                      : "border border-navy-900/12 text-navy-900"
                  }`}
                >
                  {tier.monthly ? "Start Free Trial" : "Book Demo"}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

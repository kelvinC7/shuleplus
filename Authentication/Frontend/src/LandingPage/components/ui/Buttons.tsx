import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type BtnSize = "sm" | "md" | "lg";

const sizes: Record<BtnSize, string> = {
  sm: "px-4 py-2 text-[13px] gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-7 py-3.5 text-[15px] gap-2",
};

export function LoginButton({
  size = "md",
  className = "",
}: {
  size?: BtnSize;
  className?: string;
}) {
  return (
    <Link
      href="/login"
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-navy-900/10 bg-white font-semibold text-navy-900 shadow-soft transition-all hover:border-amber-400/50 hover:shadow-lift ${sizes[size]} ${className}`}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-amber-50/0 via-amber-50/80 to-amber-50/0 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="relative">Login</span>
    </Link>
  );
}

export function GetStartedButton({
  size = "md",
  className = "",
  href = "#get-started",
}: {
  size?: BtnSize;
  className?: string;
  href?: string;
}) {
  return (
    <a
      href={href}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-navy-900 font-semibold text-white shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-18px_rgba(0,4,53,0.45)] ${sizes[size]} ${className}`}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/25 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="relative">Get Started</span>
      <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

export function PrimaryButton({
  children,
  className = "",
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-lift transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

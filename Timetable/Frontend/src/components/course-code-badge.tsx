export function CourseCodeBadge({ code, className = '' }: { code: string; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-lg bg-navy px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-primary ${className}`}
    >
      {code}
    </span>
  );
}

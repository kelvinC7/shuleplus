export function DirectoryShell() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      <div className="h-10 bg-ink-900/90" />
      <div className="h-16 border-b border-ink-100 bg-white" />
      <div className="bg-gradient-to-b from-sky-600 to-sky-700 px-4 py-20">
        <div className="site-container mx-auto max-w-3xl space-y-4">
          <div className="h-4 w-48 rounded-full bg-white/20" />
          <div className="h-10 w-full rounded-full bg-white/20" />
          <div className="h-10 w-full rounded-full bg-white/20" />
        </div>
      </div>
      <div className="site-container mx-auto grid gap-7 px-4 py-14 lg:grid-cols-[256px_1fr]">
        <div className="hidden h-[520px] rounded-[22px] bg-ink-100 lg:block" />
        <div className="grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-lg:grid-cols-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-ink-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

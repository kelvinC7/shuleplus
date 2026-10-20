'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightIcon, CloseIcon, HeartIcon, InfoIcon } from './icons';
import { cn } from '@/lib/utils';

type FeedCategory = 'news' | 'deals' | 'jobs';

interface FeedItem {
  id: string;
  category: FeedCategory;
  tag: string;
  title: string;
  desc: string;
  price?: string;
  meta: string;
  seed: string;
  cta?: string;
}

const FEED_ITEMS: FeedItem[] = [
  {
    id: 'excella-job',
    category: 'jobs',
    tag: 'Jobs',
    title: 'Excella School  Early Years teacher needed',
    desc: 'Recruiting a qualified Early Years teacher for Nursery classes starting Term 1, 2027. Apply by Aug 22.',
    meta: 'Excella School · 4d ago',
    seed: 'rsd-excella-job',
  },
  {
    id: 'stignatius-exam',
    category: 'news',
    tag: 'News',
    title: 'St. Ignatius School  entrance exam schedule released',
    desc: 'Entrance assessments for Senior 1 and Senior 4 intake will run every Saturday through August 30, 2026.',
    meta: 'St. Ignatius School · 6d ago',
    seed: 'rsd-stignatius-exam',
  },
  {
    id: 'three-new-schools',
    category: 'news',
    tag: 'News',
    title: '3 new private schools just added',
    desc: 'Excella School, Riviera High School and St. Ignatius School are now verified on the directory.',
    meta: 'Directory team · 2h ago',
    seed: 'rsd-iprc',
  },
  {
    id: 'fee-waivers',
    category: 'deals',
    tag: 'Deals',
    title: 'Fee waivers for the 2027 intake',
    desc: 'Selected private schools are waiving registration fees for early applicants across all levels.',
    meta: 'Admissions desk · 4h ago',
    seed: 'rsd-feewaiver',
  },
  {
    id: 'reb-pass-rates',
    category: 'news',
    tag: 'News',
    title: 'REB releases new A-Level pass rates',
    desc: 'Compare pass rates across combinations and provinces for the latest exam sitting.',
    meta: 'REB · 6h ago',
    seed: 'rsd-reb',
  },
  {
    id: 'greenhills-intake',
    category: 'news',
    tag: 'News',
    title: 'Green Hills Academy  2027 intake now open',
    desc: 'Applications open for Nursery through A-Level, Cambridge & IB pathways. Entrance assessments run weekly.',
    meta: 'Green Hills Academy · 2d ago',
    seed: 'rsd-greenhills',
  },
  {
    id: 'kps-discount',
    category: 'deals',
    tag: 'Deals',
    title: 'Early-bird discount at Kigali Parents School',
    desc: '10% off first-term fees for registrations completed before September 1.',
    meta: 'Kigali Parents School · 2d ago',
    seed: 'rsd-kps',
  },
  {
    id: 'riviera-matron',
    category: 'jobs',
    tag: 'Jobs',
    title: 'Riviera High School  Boarding house matron needed',
    desc: 'Riviera High School is hiring a boarding house matron for the 2027 academic year. Apply by Aug 28.',
    meta: 'Riviera High School · 1d ago',
    seed: 'rsd-tvetdeadline',
  },
  {
    id: 'shulekit',
    category: 'deals',
    tag: 'Deals',
    title: 'Shulekit  complete school starter kit',
    desc: 'Exercise books, pens, a geometry set and a durable school bag, bundled in one affordable kit.',
    price: 'From RWF 12,000',
    meta: 'babyeyi Marketplace · Just added',
    seed: 'rsd-shulekit',
    cta: 'Order Now',
  },
];

const TABS: { key: 'all' | FeedCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'news', label: 'News' },
  { key: 'deals', label: 'Deals' },
  { key: 'jobs', label: 'Jobs' },
];

const TAG_CLASSES: Record<FeedCategory, string> = {
  news: 'bg-white/20 text-white',
  deals: 'bg-magenta-500 text-white',
  jobs: 'bg-amber-500 text-[#402A00]',
};

interface YoinfoWidgetProps {
  open: boolean;
  onToggle: () => void;
}

export function YoinfoWidget({ open, onToggle }: YoinfoWidgetProps) {
  const [filter, setFilter] = useState<'all' | FeedCategory>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = filter === 'all' ? FEED_ITEMS : FEED_ITEMS.filter((i) => i.category === filter);

  useEffect(() => {
    if (!open || paused) return;
    const timer = setInterval(() => {
      const el = feedRef.current;
      if (!el || !el.clientHeight) return;
      const count = el.children.length;
      if (!count) return;
      const next = (indexRef.current + 1) % count;
      indexRef.current = next;
      el.scrollTo({ top: next * el.clientHeight, behavior: 'smooth' });
    }, 4500);
    return () => clearInterval(timer);
  }, [open, paused]);

  const handleFeedScroll = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const el = feedRef.current;
      if (!el || !el.clientHeight) return;
      const idx = Math.round(el.scrollTop / el.clientHeight);
      indexRef.current = Math.max(0, Math.min(el.children.length - 1, idx));
    }, 150);
  }, []);

  function pickFilter(key: 'all' | FeedCategory) {
    setFilter(key);
    indexRef.current = 0;
    requestAnimationFrame(() => feedRef.current?.scrollTo({ top: 0 }));
  }

  function toggleSaved(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      {/* Launcher  stacked above the Umuhuza chat button */}
      <button
        type="button"
        aria-label={open ? 'Close babyeyi Info updates' : 'Open babyeyi Info updates'}
        onClick={onToggle}
        className="fixed bottom-[100px] right-7 z-[621] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-br from-magenta-400 to-magenta-600 text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.03] max-sm:bottom-[84px] max-sm:right-4"
      >
        {!open && (
          <span className="absolute -right-[3px] -top-[3px] flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-medium text-[#402A00] ring-[2.5px] ring-white">
            !
          </span>
        )}
        {open ? <CloseIcon className="h-[25px] w-[25px]" /> : <InfoIcon className="h-[25px] w-[25px]" />}
      </button>

      {/* Phone-frame panel */}
      {open && (
        <div
          className="fixed bottom-7 right-7 z-[622] h-[560px] max-h-[calc(100vh-120px)] w-[300px] animate-pop-in rounded-[40px] border-[9px] border-[#0C0C14] bg-[#0C0C14] shadow-lg max-sm:bottom-20 max-sm:right-4 max-sm:h-[440px] max-sm:w-[260px]"
          role="dialog"
          aria-label="babyeyi Info  school news, deals and jobs"
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[31px] bg-magenta-950">
            {/* Notch */}
            <span className="z-10 h-[18px] w-[88px] shrink-0 self-center rounded-b-[14px] bg-[#0C0C14]" />

            {/* Head */}
            <div className="shrink-0 px-4 pb-0 pt-2">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-magenta-500 text-base font-medium text-white">
                    i
                  </span>
                  <div>
                    <b className="block text-[14.5px] font-medium leading-tight text-white">yoInfo</b>
                    <span className="block text-[10px] font-medium text-magenta-200">stay in the loop</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-2 pb-1 pl-2 pt-1 text-[10.5px] font-medium tracking-[0.04em] text-white">
                    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-green-400" />
                    Live
                  </span>
                  <button
                    type="button"
                    aria-label="Close yoInfo"
                    onClick={onToggle}
                    className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                  >
                    <CloseIcon className="h-[13px] w-[13px]" />
                  </button>
                </div>
              </div>
              <p className="mb-2 mt-1 text-[10.5px] font-medium text-magenta-200">
                School directory news and promotions
              </p>

              {/* Tabs */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => pickFilter(t.key)}
                    className={cn(
                      'whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors',
                      filter === t.key ? 'bg-magenta-500 text-white' : 'bg-white/10 text-white hover:bg-white/20',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed */}
            <div
              ref={feedRef}
              onScroll={handleFeedScroll}
              onPointerEnter={() => setPaused(true)}
              onPointerLeave={() => setPaused(false)}
              onTouchStart={() => setPaused(true)}
              className="no-scrollbar relative flex-1 snap-y snap-mandatory overflow-y-scroll overscroll-contain"
            >
              {items.map((item) => (
                <article
                  key={item.id}
                  className="relative flex h-full w-full snap-start items-end overflow-hidden bg-cover bg-center"
                  style={{ backgroundImage: `url('https://picsum.photos/seed/${item.seed}/500/900')` }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-[rgba(43,10,36,0.05)] via-[rgba(43,10,36,0.25)] to-[rgba(28,6,23,0.95)] [background-size:100%_100%]"
                  />

                  <button
                    type="button"
                    aria-label="Save this update"
                    aria-pressed={savedIds.has(item.id)}
                    onClick={() => toggleSaved(item.id)}
                    className={cn(
                      'absolute right-3.5 top-3.5 z-[3] flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] text-white backdrop-blur-[2px] transition-colors',
                      savedIds.has(item.id)
                        ? 'border-magenta-500 bg-magenta-500 [&_svg]:fill-white'
                        : 'border-white/30 bg-[#2b0a24]/55 hover:bg-[#2b0a24]/75',
                    )}
                  >
                    <HeartIcon className="h-4 w-4" filled={false} />
                  </button>

                  <div className="relative z-[2] w-full p-[18px] pb-[26px] text-white">
                    <span
                      className={cn(
                        'mb-2 inline-block rounded-full px-2.5 py-[5px] text-[9.5px] font-medium uppercase tracking-[0.04em]',
                        TAG_CLASSES[item.category],
                      )}
                    >
                      {item.tag}
                    </span>
                    <h4 className="mb-[7px] line-clamp-2 text-[17px] font-medium leading-snug">{item.title}</h4>
                    <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-white/85">{item.desc}</p>
                    {item.price && <div className="mb-2 text-[13.5px] font-medium text-amber-300">{item.price}</div>}
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="text-[10px] font-medium uppercase tracking-[0.03em] text-white/55">
                        {item.meta}
                      </span>
                      {item.cta && (
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 px-3.5 py-2 text-[10.5px] font-medium uppercase tracking-[0.03em] text-[#402A00] transition-all hover:-translate-y-px hover:bg-amber-300"
                        >
                          {item.cta}
                          <ArrowRightIcon className="h-[11px] w-[11px]" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Swipe hint */}
            <span className="pointer-events-none absolute bottom-[18px] left-0 right-0 z-[2] flex items-center justify-center gap-1 text-[9px] font-medium tracking-[0.08em] text-white/45 uppercase">
              Swipe for more
            </span>

            {/* Home indicator */}
            <span className="mx-auto mb-2 mt-auto h-1 w-[84px] shrink-0 rounded-full bg-white/40" />
          </div>
        </div>
      )}
    </>
  );
}

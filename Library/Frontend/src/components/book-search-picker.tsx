'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Loader2, Search, X } from 'lucide-react';
import { libApi } from '@/services/lib-api';
import { FormField } from '@/components/lib-modal';

export type BookCopySelection = {
  id: string;
  barcode: string;
  libraryId: string;
  title: string;
  author?: string;
};

type BookCopyPickerProps = {
  value: BookCopySelection | null;
  onChange: (copy: BookCopySelection | null) => void;
  disabled?: boolean;
};

export function BookCopyPicker({ value, onChange, disabled }: BookCopyPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookCopySelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await libApi.searchCopies(q);
      const copies = (data.copies ?? []).map((c: {
        id: string;
        barcode: string;
        libraryId: string;
        resource?: { title?: string; author?: string };
      }) => ({
        id: c.id,
        barcode: c.barcode,
        libraryId: c.libraryId,
        title: c.resource?.title ?? 'Unknown',
        author: c.resource?.author,
      }));
      setResults(copies);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-slate-50/80 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <BookOpen size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-navy">{value.title}</p>
            <p className="font-mono text-xs text-muted">{value.barcode}</p>
          </div>
          {!disabled && (
            <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-navy">
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <>
          <FormField label="Search Book Copy" required>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder="Barcode, title, or ISBN…"
                disabled={disabled}
                onFocus={() => { setOpen(true); search(''); }}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              />
              {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
            </div>
          </FormField>
          {open && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border/60 bg-white shadow-lg">
              {loading ? (
                <p className="px-4 py-3 text-sm text-muted">Searching available copies…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">No available copies found</p>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onChange(c); setQuery(''); setOpen(false); }}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-slate-50 last:border-0"
                  >
                    <BookOpen size={16} className="shrink-0 text-navy" />
                    <div>
                      <p className="text-sm font-semibold text-navy">{c.title}</p>
                      <p className="font-mono text-xs text-muted">{c.barcode}{c.author ? ` · ${c.author}` : ''}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type BookResourceSelection = {
  id: string;
  title: string;
  author?: string;
  availableCopies: number;
};

type BookResourcePickerProps = {
  value: BookResourceSelection | null;
  onChange: (resource: BookResourceSelection | null) => void;
  disabled?: boolean;
};

export function BookResourcePicker({ value, onChange, disabled }: BookResourcePickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookResourceSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await libApi.searchResources(q);
      setResults(data.resources ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-slate-50/80 px-4 py-3">
          <BookOpen size={18} className="text-navy" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-navy">{value.title}</p>
            <p className="text-xs text-muted">{value.availableCopies} available</p>
          </div>
          {!disabled && (
            <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-navy">
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <>
          <FormField label="Search Book" required>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder="Title, author, or ISBN…"
                disabled={disabled}
                onFocus={() => setOpen(true)}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              />
              {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
            </div>
          </FormField>
          {open && query.length >= 1 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border/60 bg-white shadow-lg">
              {loading ? (
                <p className="px-4 py-3 text-sm text-muted">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">No books found</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { onChange(r); setQuery(''); setOpen(false); }}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-slate-50 last:border-0"
                  >
                    <BookOpen size={16} className="shrink-0 text-navy" />
                    <div>
                      <p className="text-sm font-semibold text-navy">{r.title}</p>
                      <p className="text-xs text-muted">{[r.author, `${r.availableCopies} available`].filter(Boolean).join(' · ')}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

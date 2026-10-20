'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Copy, Eye, Pencil } from 'lucide-react';
import { fetchTemplates } from '@/services/babyeyi-api';
import type { Template } from '@/types';

const CATEGORIES = ['Primary School', 'Secondary School', 'TVET', 'Boarding', 'Private', 'Government', 'Government Aided', 'International'];

export function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    void fetchTemplates().then(setTemplates);
  }, []);

  const filtered = templates.filter((t) => !filter || t.schoolType.toLowerCase().includes(filter.toLowerCase()) || t.category.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter('')} className={`rounded-full px-3 py-1 text-xs font-semibold ${!filter ? 'bg-primary text-navy' : 'bg-navy/5 text-muted'}`}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} type="button" onClick={() => setFilter(c)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === c ? 'bg-primary text-navy' : 'bg-navy/5 text-muted'}`}>{c}</button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <article key={t.id} className="hr-card hr-card-hover overflow-hidden">
            <div className="flex h-32 items-center justify-center bg-gradient-to-br from-navy/5 to-primary/10">
              <p className="text-sm font-bold text-navy/40">{t.category}</p>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-navy">{t.name}</h3>
                {t.isFavorite && <Star size={16} className="fill-primary text-primary" />}
              </div>
              <p className="mt-1 text-xs text-muted">{t.schoolType} · Used {t.usageCount}×</p>
              <p className="mt-2 text-sm text-muted">{t.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-xs"><Eye size={14} /> Preview</button>
                <Link href="/create" className="btn-primary text-xs">Use</Link>
                <button type="button" className="btn-secondary text-xs"><Copy size={14} /> Duplicate</button>
                <button type="button" className="btn-secondary text-xs"><Pencil size={14} /> Edit</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

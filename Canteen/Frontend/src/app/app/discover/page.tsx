'use client';

import Link from 'next/link';
import { Building2, MapPin, Phone } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import type { Supplier } from '@/types';

export default function DiscoverPage() {
  const { data, loading, error } = useApi<Supplier[]>('/suppliers');
  const [q, setQ] = useState('');

  const active = (data ?? []).filter((s) => s.status === 'ACTIVE');
  const filtered = q
    ? active.filter(
        (s) =>
          s.companyName.toLowerCase().includes(q.toLowerCase()) ||
          (s.category ?? '').toLowerCase().includes(q.toLowerCase()) ||
          (s.district ?? '').toLowerCase().includes(q.toLowerCase())
      )
    : active;

  return (
    <div>
      <PageHeader title="Discover suppliers" description="Browse the approved supplier marketplace." />

      <div className="mb-6 max-w-sm">
        <Input placeholder="Search by name, category or district…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No suppliers found" description="Try a different search." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-md">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logoUrl} alt={s.companyName} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">{s.companyName}</CardTitle>
                    {s.category ? <p className="text-xs text-muted">{s.category}</p> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted">
                {s.district ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {s.province ? `${s.province}, ` : ''}
                    {s.district}
                  </p>
                ) : null}
                {s.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> {s.phone}
                  </p>
                ) : null}
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="success">Approved</Badge>
                  <Link href={`/app/purchases/new?supplier=${s.id}`} className="text-sm font-medium text-primary hover:underline">
                    Place an order →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

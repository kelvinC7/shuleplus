'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { formatDateTime } from '@/lib/format';
import type { OnboardingRequest } from '@/types';

function TrackForm() {
  const params = useSearchParams();
  const [id, setId] = useState(params.get('id') ?? '');
  const [result, setResult] = useState<OnboardingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl = params.get('id');
    if (fromUrl) setId(fromUrl);
  }, [params]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await api.get(`/public/applications/${encodeURIComponent(id.trim())}`);
      setResult(data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not find this application.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-lg">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-bold text-navy">Track your application</h1>
          <p className="mt-1 text-sm text-muted">Enter the application ID you received after registering.</p>
          <form onSubmit={search} className="mt-4 flex gap-2">
            <Input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Application ID"
            />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4" /> {loading ? '…' : 'Search'}
            </Button>
          </form>

          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

          {result ? (
            <div className="mt-6 space-y-3 rounded-lg border border-border bg-muted/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-navy">{result.entityType} application</p>
                <StatusBadge status={result.status} />
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">School code</dt>
                  <dd className="font-medium">{result.schoolCode ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Live</dt>
                  <dd className="font-medium">{result.isLive ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Submitted</dt>
                  <dd className="font-medium">{formatDateTime(result.createdAt)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrackPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-6">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
      <Suspense fallback={null}>
        <TrackForm />
      </Suspense>
    </div>
  );
}

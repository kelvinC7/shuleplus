'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { api } from '@/services/api';

export default function RegisterCanteenPage() {
  const router = useRouter();
  const [form, setForm] = useState({ schoolName: '', schoolCode: '', contactName: '', contactPhone: '', contactEmail: '' });
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/register/canteen', form);
      toast.success('Canteen registration submitted');
      router.push(`/track?id=${data.data.id}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Register canteen" description="Onboard a school canteen onto the platform." />
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>School name *</Label>
              <Input required value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} />
            </div>
            <div>
              <Label>School code *</Label>
              <Input required value={form.schoolCode} onChange={(e) => set('schoolCode', e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Contact name *</Label>
                <Input required value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input required value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Register canteen'}
              </Button>
              <Link href="/app/canteens">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

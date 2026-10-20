'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Label } from '@/components/ui/input';
import { api } from '@/services/api';
import type { Supplier } from '@/types';

export default function RegisterDriverPage() {
  const router = useRouter();
  const { data: suppliers } = useApi<Supplier[]>('/suppliers');
  const [form, setForm] = useState({ fullName: '', phone: '', vehicleType: '', plateNumber: '', idNumber: '', supplierId: '' });
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplierId) return toast.error('Select a supplier');
    setSubmitting(true);
    try {
      const { data } = await api.post('/drivers/register', form);
      toast.success(`Driver registered — temporary password: ${data.data.account.tempPassword ?? 'sent via SMS'}`);
      router.push('/app/fleet');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Register driver" description="Create a driver account linked to a supplier." />
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Supplier *</Label>
              <Select required value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)}>
                <option value="">Select supplier…</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Full name *</Label>
                <Input required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <Label>Vehicle type</Label>
                <Select value={form.vehicleType} onChange={(e) => set('vehicleType', e.target.value)}>
                  <option value="">Select…</option>
                  <option>Motorcycle</option>
                  <option>Van</option>
                  <option>Pickup</option>
                  <option>Truck</option>
                  <option>Bicycle</option>
                </Select>
              </div>
              <div>
                <Label>Plate number</Label>
                <Input value={form.plateNumber} onChange={(e) => set('plateNumber', e.target.value)} />
              </div>
              <div>
                <Label>National ID</Label>
                <Input value={form.idNumber} onChange={(e) => set('idNumber', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Registering…' : 'Register driver'}
              </Button>
              <Link href="/app/fleet">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

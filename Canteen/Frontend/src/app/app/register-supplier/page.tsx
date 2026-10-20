'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Label } from '@/components/ui/input';
import { api } from '@/services/api';

export default function RegisterSupplierPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    companyName: '',
    category: '',
    tinNumber: '',
    contactPerson: '',
    phone: '',
    email: '',
    province: '',
    district: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/suppliers/register', form);
      toast.success('Supplier registered and pending approval');
      router.push(`/app/suppliers/${data.data.id}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Register supplier"
        description="Create a new supplier record. The supplier will need approval before going live."
      />
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Business name *</Label>
                <Input required value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
              </div>
              <div>
                <Label>Company name</Label>
                <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">Select…</option>
                  <option>Groceries</option>
                  <option>Fruits & Vegetables</option>
                  <option>Bakery</option>
                  <option>Meat & Poultry</option>
                  <option>Dairy</option>
                  <option>Beverages</option>
                  <option>Snacks</option>
                  <option>Other</option>
                </Select>
              </div>
              <div>
                <Label>TIN number</Label>
                <Input value={form.tinNumber} onChange={(e) => set('tinNumber', e.target.value)} />
              </div>
              <div>
                <Label>Contact person *</Label>
                <Input required value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Province</Label>
                  <Input value={form.province} onChange={(e) => set('province', e.target.value)} />
                </div>
                <div>
                  <Label>District</Label>
                  <Input value={form.district} onChange={(e) => set('district', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Registering…' : 'Register supplier'}
              </Button>
              <Link href="/app/suppliers">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

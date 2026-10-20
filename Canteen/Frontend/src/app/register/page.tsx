'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<'supplier' | 'canteen'>(
    params.get('tab') === 'canteen' ? 'canteen' : 'supplier'
  );
  const [submitting, setSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

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
    description: '',
    schoolName: '',
    schoolCode: '',
  });

  useEffect(() => {
    const t = params.get('tab');
    if (t === 'canteen' || t === 'supplier') setTab(t);
  }, [params]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (tab === 'supplier') {
        const { data } = await api.post('/register/supplier', {
          businessName: form.businessName,
          companyName: form.companyName,
          category: form.category,
          tinNumber: form.tinNumber,
          contactPerson: form.contactPerson,
          phone: form.phone,
          email: form.email,
          province: form.province,
          district: form.district,
        });
        toast.success('Supplier application submitted!');
        setApplicationId((data.data?.id as string) ?? null);
        if (!data.data?.id) {
          setForm({ ...form, businessName: '' });
        }
      } else {
        const { data } = await api.post('/register/canteen', {
          schoolName: form.schoolName,
          schoolCode: form.schoolCode,
          contactName: form.contactPerson,
          contactPhone: form.phone,
          contactEmail: form.email,
        });
        toast.success('Canteen registration submitted!');
        setApplicationId((data.data?.id as string) ?? null);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (applicationId) {
    return (
      <Card className="mx-auto mt-8 max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="mt-4 text-xl font-bold text-navy">Application received!</h2>
          <p className="mt-2 text-sm text-muted">
            Your application has been submitted for review. Track its status anytime.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/track?id=${applicationId}`}>
              <Button variant="default">Track status</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back to home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-lg">
      <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-white p-1.5 shadow-sm border border-border">
        {(['supplier', 'canteen'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === t ? 'bg-primary text-navy' : 'text-muted hover:text-navy'
            )}
          >
            {t === 'supplier' ? 'Supplier' : 'Canteen'}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tab === 'supplier' ? 'Supplier registration' : 'Canteen registration'}</CardTitle>
          <CardDescription>
            {tab === 'supplier'
              ? 'Apply to supply canteens across ShulePlus schools.'
              : 'Register your school canteen on the ShulePlus platform.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {tab === 'supplier' ? (
              <>
                <div>
                  <Label>Business name *</Label>
                  <Input required value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="e.g. Fresh Foods Ltd" />
                </div>
                <div>
                  <Label>Company name</Label>
                  <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                      <option>Cleaning Supplies</option>
                      <option>Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label>TIN number</Label>
                    <Input value={form.tinNumber} onChange={(e) => set('tinNumber', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Contact person *</Label>
                  <Input required value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone *</Label>
                    <Input required value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="07XXXXXXXX" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  </div>
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
                <div>
                  <Label>About your business</Label>
                  <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>School name *</Label>
                  <Input required value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} />
                </div>
                <div>
                  <Label>School code *</Label>
                  <Input required value={form.schoolCode} onChange={(e) => set('schoolCode', e.target.value)} />
                </div>
                <div>
                  <Label>Contact name *</Label>
                  <Input required value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone *</Label>
                    <Input required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-6">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <UtensilsCrossed className="h-4 w-4 text-navy" />
          </span>
          <span className="font-bold text-navy">Canteen MIS</span>
        </div>
      </div>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}

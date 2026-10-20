'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, BadgeCheck, Ban, Plus, UserPlus } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingScreen, Spinner } from '@/components/shared/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { formatRwf, formatDate, initials } from '@/lib/format';
import type { Supplier, SupplierProduct } from '@/types';

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: supplier, loading, error, reload } = useApi<Supplier>(`/suppliers/${id}`);
  const { data: products, loading: productsLoading, reload: reloadProducts } = useApi<SupplierProduct[]>(
    `/suppliers/${id}/products`
  );

  const [staffOpen, setStaffOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [staff, setStaff] = useState<{ name: string; phone: string; email: string; role: string }[]>([
    { name: '', phone: '', email: '', role: 'staff' },
  ]);
  const [product, setProduct] = useState({ name: '', category: '', unit: 'kg', price: '', description: '' });

  async function approve() {
    try {
      await api.post('/suppliers/approve', { supplierId: id });
      toast.success('Supplier approved');
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed');
    }
  }

  async function suspend() {
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier suspended');
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed');
    }
  }

  async function provisionStaff() {
    const list = staff.filter((s) => s.name && s.phone);
    if (list.length === 0) return toast.error('Add at least one staff member');
    try {
      const res = await api.post('/suppliers/provision-staff', { supplierId: id, staffList: list });
      toast.success(`${res.data.data.accounts.length} account(s) created`);
      setStaffOpen(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Provisioning failed');
    }
  }

  async function addProduct() {
    if (!product.name || !product.price) return toast.error('Name and price are required');
    try {
      await api.post(`/suppliers/${id}/products`, { ...product, price: Number(product.price) });
      toast.success('Product added');
      setProductOpen(false);
      setProduct({ name: '', category: '', unit: 'kg', price: '', description: '' });
      reloadProducts();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add product');
    }
  }

  if (loading) return <LoadingScreen />;
  if (error || !supplier) return <div className="text-center text-sm text-danger">Supplier not found.</div>;

  return (
    <div>
      <Link href="/app/suppliers" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Suppliers
      </Link>

      <PageHeader
        title={supplier.companyName}
        description={`${supplier.supplierCode} · ${supplier.category ?? 'General'}`}
        actions={
          supplier.status === 'PENDING' ? (
            <Button onClick={approve}>
              <BadgeCheck /> Approve supplier
            </Button>
          ) : supplier.status === 'ACTIVE' ? (
            <Button variant="danger" onClick={suspend}>
              <Ban /> Suspend
            </Button>
          ) : (
            <Button onClick={approve}>
              <BadgeCheck /> Reactivate
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                {initials(supplier.companyName)}
              </span>
              <div>
                <p className="font-semibold text-navy">{supplier.companyName}</p>
                <StatusBadge status={supplier.status} />
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <Row label="Business name" value={supplier.businessName} />
              <Row label="Contact person" value={supplier.contactPerson} />
              <Row label="Phone" value={supplier.phone} />
              <Row label="Email" value={supplier.email} />
              <Row label="TIN" value={supplier.tinNumber} />
              <Row label="Location" value={supplier.district ? `${supplier.district}, ${supplier.province}` : null} />
              <Row label="Approved" value={supplier.approvedAt ? formatDate(supplier.approvedAt) : null} />
            </dl>
            <Button variant="outline" className="mt-5 w-full" onClick={() => setStaffOpen(true)}>
              <UserPlus /> Provision staff
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Products</CardTitle>
            <Button size="sm" onClick={() => setProductOpen(true)}>
              <Plus /> Add product
            </Button>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (products?.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No products yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Product</TH>
                    <TH>Category</TH>
                    <TH>Unit</TH>
                    <TH>Price</TH>
                  </TR>
                </THead>
                <TBody>
                  {products?.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-medium text-navy">{p.name}</TD>
                      <TD>{p.category ?? '—'}</TD>
                      <TD>{p.unit ?? '—'}</TD>
                      <TD className="font-semibold">{formatRwf(p.price)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={staffOpen} onClose={() => setStaffOpen(false)} title="Provision supplier staff">
        <div className="space-y-4">
          {staff.map((s, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
              <Input placeholder="Full name" value={s.name} onChange={(e) => {
                const next = [...staff]; next[i] = { ...next[i]!, name: e.target.value }; setStaff(next);
              }} />
              <Input placeholder="Phone" value={s.phone} onChange={(e) => {
                const next = [...staff]; next[i] = { ...next[i]!, phone: e.target.value }; setStaff(next);
              }} />
              <Input placeholder="Email" value={s.email} onChange={(e) => {
                const next = [...staff]; next[i] = { ...next[i]!, email: e.target.value }; setStaff(next);
              }} />
              <Input placeholder="Role" value={s.role} onChange={(e) => {
                const next = [...staff]; next[i] = { ...next[i]!, role: e.target.value }; setStaff(next);
              }} />
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={() => setStaff((s) => [...s, { name: '', phone: '', email: '', role: 'staff' }])}>
            + Add staff member
          </Button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStaffOpen(false)}>Cancel</Button>
          <Button onClick={provisionStaff}>Create accounts</Button>
        </div>
      </Dialog>

      <Dialog open={productOpen} onClose={() => setProductOpen(false)} title="Add product">
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={product.unit} onChange={(e) => setProduct({ ...product, unit: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Price (RWF) *</Label>
            <Input type="number" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setProductOpen(false)}>Cancel</Button>
          <Button onClick={addProduct}>Add product</Button>
        </div>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-navy">{value ?? '—'}</dd>
    </div>
  );
}

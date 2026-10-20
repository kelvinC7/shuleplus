'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/lib/use-api';
import { postData } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import type { Driver } from '@/types';

export default function SupplierDriversPage() {
  const { profile } = useAuth();
  const supplierId = profile?.supplierId ?? '';
  const { data, loading, error, reload } = useApi<Driver[]>(supplierId ? `/drivers/supplier/${supplierId}` : null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', vehicleType: '', plateNumber: '', idNumber: '' });
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<{ phone: string; tempPassword?: string } | null>(null);

  async function register() {
    if (!form.fullName || !form.phone) return toast.error('Full name and phone are required');
    setSaving(true);
    try {
      const driver = await postData<Driver & { account?: { phone: string; tempPassword?: string } }>('/drivers/register', {
        fullName: form.fullName,
        phone: form.phone,
        vehicleType: form.vehicleType || undefined,
        plateNumber: form.plateNumber || undefined,
        idNumber: form.idNumber || undefined,
        supplierId,
      });
      setAccount({ phone: form.phone, tempPassword: driver.account?.tempPassword });
      setOpen(false);
      setForm({ fullName: '', phone: '', vehicleType: '', plateNumber: '', idNumber: '' });
      reload();
      toast.success('Driver registered');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed');
    } finally {
      setSaving(false);
    }
  }

  if (!supplierId) {
    return <EmptyState title="No supplier profile" description="You need a supplier account to manage drivers." />;
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Drivers assigned to your deliveries."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Register driver
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<Truck className="h-10 w-10" />} title="No drivers yet" description="Register a driver to start dispatching orders." />
      ) : (
        <Card>
          <CardContent className="pt-0">
            <Table>
              <THead>
                <TR>
                  <TH>Driver</TH>
                  <TH>Phone</TH>
                  <TH>Vehicle</TH>
                  <TH>Plate</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {data?.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium text-navy">{d.fullName}</TD>
                    <TD className="text-muted">{d.phone}</TD>
                    <TD className="text-muted">{d.vehicleType ?? '—'}</TD>
                    <TD className="text-muted">{d.plateNumber ?? '—'}</TD>
                    <TD>
                      <Badge variant={d.isAvailable ? 'success' : 'muted'}>
                        {d.isAvailable ? 'Available' : 'On delivery'}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Register driver"
        description="An account is created for them in ShulePlus."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={register} disabled={saving}>{saving ? 'Registering…' : 'Register'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Full name *</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vehicle type</Label>
              <Input value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} placeholder="Motorcycle" />
            </div>
            <div>
              <Label>Plate number</Label>
              <Input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>National ID (optional)</Label>
            <Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
          </div>
        </div>
      </Dialog>

      {account ? (
        <Dialog
          open
          onClose={() => setAccount(null)}
          title="Driver account created"
          description="Share these sign-in details with the driver."
          footer={<Button onClick={() => setAccount(null)}>Done</Button>}
        >
          <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
            <p>
              <span className="text-muted">Phone: </span>
              <strong className="text-navy">{account.phone}</strong>
            </p>
            <p>
              <span className="text-muted">Temporary password: </span>
              <strong className="text-navy">{account.tempPassword ?? '—'}</strong>
            </p>
            <p className="pt-1 text-xs text-muted">They log in on the ShulePlus dashboard and open the Canteen module.</p>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

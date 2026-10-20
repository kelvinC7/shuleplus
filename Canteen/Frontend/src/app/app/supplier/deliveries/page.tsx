'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import type { Delivery, Driver, PurchaseOrder } from '@/types';

export default function SupplierDeliveriesPage() {
  const { profile } = useAuth();
  const supplierId = profile?.supplierId ?? '';
  const { data, loading, error, reload } = useApi<Delivery[]>(supplierId ? `/deliveries/supplier/${supplierId}` : null);
  const { data: drivers } = useApi<Driver[]>(supplierId ? `/drivers/supplier/${supplierId}` : null);
  const { data: orders } = useApi<PurchaseOrder[]>(supplierId ? `/orders/supplier/${supplierId}` : null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ driverId: '', orderIds: [] as string[], destination: '', schoolCode: '' });
  const [saving, setSaving] = useState(false);

  const confirmed = (orders ?? []).filter((o) => o.status === 'CONFIRMED' && !o.deliveryId);

  async function create() {
    if (!form.driverId) return toast.error('Select a driver');
    if (form.orderIds.length === 0) return toast.error('Select at least one order');
    setSaving(true);
    try {
      await api.post('/deliveries', {
        driverId: form.driverId,
        supplierId,
        orderIds: form.orderIds,
        destination: form.destination || undefined,
        destinationSchoolCode: form.schoolCode || undefined,
      });
      toast.success('Delivery created — orders marked dispatched');
      setOpen(false);
      setForm({ driverId: '', orderIds: [], destination: '', schoolCode: '' });
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Creation failed');
    } finally {
      setSaving(false);
    }
  }

  if (!supplierId) {
    return <EmptyState title="No supplier profile" description="You need a supplier account to manage deliveries." />;
  }

  return (
    <div>
      <PageHeader
        title="Deliveries"
        description="Shipments created from your confirmed orders."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Create delivery
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
        <EmptyState icon={<Truck className="h-10 w-10" />} title="No deliveries yet" description="Bundle confirmed orders into a delivery." />
      ) : (
        <Card>
          <CardContent className="pt-0">
            <Table>
              <THead>
                <TR>
                  <TH>Delivery</TH>
                  <TH>Driver</TH>
                  <TH>Orders</TH>
                  <TH>Destination</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {data?.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium text-navy">{d.deliveryCode}</TD>
                    <TD className="text-muted">
                      {(drivers ?? []).find((dr) => dr.id === d.driverId)?.fullName ?? '—'}
                    </TD>
                    <TD className="text-muted">{(d.orderIds ?? []).length}</TD>
                    <TD className="text-muted">{d.destination ?? d.destinationSchoolCode ?? '—'}</TD>
                    <TD>
                      <StatusBadge status={d.status} />
                    </TD>
                    <TD className="text-muted">{formatDateTime(d.createdAt)}</TD>
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
        title="Create delivery"
        description={`${confirmed.length} confirmed order(s) ready`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving || confirmed.length === 0}>{saving ? 'Creating…' : 'Create delivery'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Driver *</Label>
            <Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
              <option value="">Choose an available driver…</option>
              {(drivers ?? [])
                .filter((d) => d.isAvailable)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} {d.vehicleType ? `· ${d.vehicleType}` : ''}
                  </option>
                ))}
            </Select>
          </div>

          {confirmed.length > 0 ? (
            <div>
              <Label>Orders *</Label>
              <div className="space-y-1.5">
                {confirmed.map((o) => {
                  const checked = form.orderIds.includes(o.id);
                  return (
                    <label key={o.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setForm({
                            ...form,
                            orderIds: checked ? form.orderIds.filter((id) => id !== o.id) : [...form.orderIds, o.id],
                          })
                        }
                      />
                      <span className="flex-1 font-medium text-navy">{o.orderNumber}</span>
                      <span className="text-muted">{o.supplierName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">No confirmed orders to dispatch yet.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Destination</Label>
              <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            </div>
            <div>
              <Label>School code</Label>
              <Input value={form.schoolCode} onChange={(e) => setForm({ ...form, schoolCode: e.target.value })} />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Wallet } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { formatRwf, formatDateTime } from '@/lib/format';
import type { CashoutRequest } from '@/types';

export default function CashoutPage() {
  const { data: balance, loading: balanceLoading } = useApi<{ totalSales: number; totalCashouts: number; availableBalance: number }>('/cashouts/balance');
  const { data: history, loading: historyLoading, reload } = useApi<CashoutRequest[]>('/cashouts/history');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', method: 'bank', phone: '', note: '' });
  const [saving, setSaving] = useState(false);

  async function request() {
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      await api.post('/cashouts', {
        amount: Number(form.amount),
        method: form.method,
        phone: form.phone,
        note: form.note,
      });
      toast.success('Cashout request submitted');
      setOpen(false);
      setForm({ amount: '', method: 'bank', phone: '', note: '' });
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Request failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Cashout"
        description="Request a payout of your canteen balance."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Banknote /> Request cashout
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Total balance"
          value={balanceLoading ? '…' : formatRwf(balance?.totalSales ?? 0)}
          icon={Wallet}
          accent="info"
        />
        <StatCard
          title="Available for cashout"
          value={balanceLoading ? '…' : formatRwf(balance?.availableBalance ?? 0)}
          icon={Banknote}
          accent="success"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Cashout history</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (history?.length ?? 0) === 0 ? (
            <EmptyState title="No cashouts yet" description="Your payout requests will appear here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Amount</TH>
                  <TH>Method</TH>
                  <TH>Status</TH>
                  <TH>Requested</TH>
                </TR>
              </THead>
              <TBody>
                {history?.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-semibold">{formatRwf(c.amount)}</TD>
                    <TD className="capitalize">{c.method}</TD>
                    <TD>
                      <StatusBadge status={c.status} />
                    </TD>
                    <TD className="text-muted">{formatDateTime(c.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Request cashout"
        description={`Available: ${formatRwf(balance?.availableBalance ?? 0)}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={request} disabled={saving}>{saving ? 'Submitting…' : 'Submit request'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Amount (RWF) *</Label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label>Payout method</Label>
            <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="bank">Bank transfer</option>
              <option value="mtn">MTN MoMo</option>
              <option value="airtel">Airtel Money</option>
            </Select>
          </div>
          <div>
            <Label>Account / phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Account number or mobile money number" />
          </div>
          <div>
            <Label>Note</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

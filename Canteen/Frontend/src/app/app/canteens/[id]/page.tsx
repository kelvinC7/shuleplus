'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, UserPlus, Wallet as WalletIcon } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api, getData, postData } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingScreen, Spinner } from '@/components/shared/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { formatRwf } from '@/lib/format';
import type { Tenant, Wallet } from '@/types';

export default function CanteenDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: tenant, loading, error } = useApi<Tenant>(`/canteen/school-stats/${id}`);
  const { data: wallets, loading: walletsLoading, reload: reloadWallets } = useApi<Wallet[]>(
    tenant ? '/wallets' : null
  );
  const scopedWallets = wallets?.filter((w) => w.organizationId === tenant?.organizationId) ?? [];

  const [stats, setStats] = useState<{ walletCount: number; saleCount: number; menuCount: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [staff, setStaff] = useState<{ name: string; phone: string; email: string; role: string }[]>([
    { name: '', phone: '', email: '', role: 'OPERATOR' },
  ]);
  const [operator, setOperator] = useState({ fullName: '', phone: '', email: '', role: 'OPERATOR' });

  useEffect(() => {
    if (!id) return;
    getData<{ walletCount: number; saleCount: number; menuCount: number }>(`/canteen/school-stats/${id}`)
      .then(setStats)
      .catch(() => undefined);
  }, [id]);

  async function syncStudents() {
    if (!tenant) return;
    setSyncing(true);
    try {
      const res = await postData<{ created: number; updated: number; total: number }>('/canteen/sync', {
        schoolCode: tenant.schoolCode ?? tenant.organizationCode ?? undefined,
      });
      toast.success(`Synced ${res.total} students (${res.created} new, ${res.updated} updated)`);
      reloadWallets();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function provisionStaff() {
    try {
      const list = staff.filter((s) => s.name && s.phone);
      if (list.length === 0) return toast.error('Add at least one staff member');
      const res = await postData<{ accounts: Array<{ name: string; tempPassword?: string }> }>(
        '/canteen/provision-staff',
        { staffList: list, schoolCode: tenant?.schoolCode ?? undefined }
      );
      toast.success(`${res.accounts.length} account(s) created`);
      setStaffOpen(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Provisioning failed');
    }
  }

  async function configureOperator() {
    try {
      await postData('/canteen/configure-operator', {
        ...operator,
        schoolCode: tenant?.schoolCode ?? undefined,
      });
      toast.success('Operator configured');
      setOperatorOpen(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Configuration failed');
    }
  }

  if (loading) return <LoadingScreen />;
  if (error || !tenant)
    return (
      <div className="text-center text-sm text-danger">
        Could not load canteen. <Link href="/app/canteens" className="text-primary">Back to canteens</Link>
      </div>
    );

  return (
    <div>
      <Link href="/app/canteens" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Canteens
      </Link>

      <PageHeader
        title={tenant.organizationName}
        description={`${tenant.schoolCode ?? tenant.organizationCode ?? 'No code'} · ${tenant.status}`}
        actions={
          <>
            <Button variant="outline" onClick={syncStudents} disabled={syncing}>
              {syncing ? <Spinner /> : <RefreshCw />} Sync students
            </Button>
            <Button variant="outline" onClick={() => setOperatorOpen(true)}>
              <UserPlus /> Configure operator
            </Button>
            <Button onClick={() => setStaffOpen(true)}>
              <UserPlus /> Provision staff
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Student wallets" value={stats?.walletCount ?? 0} icon={WalletIcon} accent="info" />
        <StatCard title="Sales" value={stats?.saleCount ?? 0} />
        <StatCard title="Menu items" value={stats?.menuCount ?? 0} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Student wallets</CardTitle>
        </CardHeader>
        <CardContent>
          {walletsLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (scopedWallets?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No wallets yet. Click “Sync students” to pull the roster from Academic.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Student</TH>
                  <TH>Card</TH>
                  <TH>Class</TH>
                  <TH>Balance</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {scopedWallets?.map((w) => (
                  <TR key={w.id}>
                    <TD className="font-medium text-navy">{w.fullName}</TD>
                    <TD className="font-mono text-xs">{w.cardCode}</TD>
                    <TD>{w.className ?? '—'}</TD>
                    <TD className="font-semibold">{formatRwf(w.balanceRwf)}</TD>
                    <TD>
                      <StatusBadge status={w.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={staffOpen} onClose={() => setStaffOpen(false)} title="Provision canteen staff">
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
              <Input placeholder="Role (e.g. OPERATOR)" value={s.role} onChange={(e) => {
                const next = [...staff]; next[i] = { ...next[i]!, role: e.target.value }; setStaff(next);
              }} />
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStaff((s) => [...s, { name: '', phone: '', email: '', role: 'OPERATOR' }])}
          >
            + Add staff member
          </Button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStaffOpen(false)}>Cancel</Button>
          <Button onClick={provisionStaff}>Create accounts</Button>
        </div>
      </Dialog>

      <Dialog open={operatorOpen} onClose={() => setOperatorOpen(false)} title="Configure canteen operator">
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={operator.fullName} onChange={(e) => setOperator({ ...operator, fullName: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={operator.phone} onChange={(e) => setOperator({ ...operator, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={operator.email} onChange={(e) => setOperator({ ...operator, email: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOperatorOpen(false)}>Cancel</Button>
          <Button onClick={configureOperator}>Configure</Button>
        </div>
      </Dialog>
    </div>
  );
}

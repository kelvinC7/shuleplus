'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Backpack,
  CheckCircle2,
  ClipboardList,
  Package,
  ShoppingBag,
  Truck,
  Wallet,
} from 'lucide-react';
import { shulekitAdminApi } from '@/lib/shulekit-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  ShuleKitDataPanel,
  ShuleKitPageShell,
  ShuleKitStatCard,
  ShuleKitTable,
} from './shulekit-page-shell';

export function ShuleKitDashboardView({
  title = 'Dashboard',
  description = 'Platform overview for orders, revenue, kits, and stock.',
}: {
  title?: string;
  description?: string;
} = {}) {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shulekitAdminApi
      .dashboard()
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const totals = data?.totals ?? {};

  return (
    <ShuleKitPageShell title={title} description={description}>
      {loading ? (
        <ShuleKitDataPanel loading loadingLabel="Loading dashboard…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ShuleKitStatCard icon={<ClipboardList className="h-4 w-4" />} label="Orders" value={totals.orders ?? 0} tone="navy" />
            <ShuleKitStatCard
              icon={<Wallet className="h-4 w-4" />}
              label="Revenue (FRW)"
              value={Number(totals.revenue ?? 0).toLocaleString()}
              tone="amber"
            />
            <ShuleKitStatCard icon={<Package className="h-4 w-4" />} label="Pending orders" value={totals.pendingOrders ?? 0} tone="sky" />
            <ShuleKitStatCard icon={<Truck className="h-4 w-4" />} label="Pending deliveries" value={totals.pendingDeliveries ?? 0} tone="rose" />
            <ShuleKitStatCard icon={<Backpack className="h-4 w-4" />} label="Standard kits sold" value={totals.standardOrders ?? 0} tone="navy" />
            <ShuleKitStatCard icon={<ShoppingBag className="h-4 w-4" />} label="Custom kits sold" value={totals.customOrders ?? 0} tone="sky" />
            <ShuleKitStatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Delivered" value={totals.deliveredOrders ?? 0} tone="emerald" />
            <ShuleKitStatCard icon={<AlertTriangle className="h-4 w-4" />} label="Low stock products" value={totals.lowStockProducts ?? 0} tone="amber" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-navy">Top products</h2>
              <ShuleKitDataPanel>
                <ShuleKitTable headers={['Product', 'Qty', 'Revenue']} empty={!data?.topProducts?.length} emptyLabel="No product sales yet.">
                  {(data?.topProducts ?? []).map((p: any) => (
                    <tr key={p.title} className="border-t border-border hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-navy">{p.title}</td>
                      <td className="px-4 py-3">{p.quantity}</td>
                      <td className="px-4 py-3 font-medium text-navy">{Number(p.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </ShuleKitTable>
              </ShuleKitDataPanel>
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-navy">By district</h2>
              <ShuleKitDataPanel>
                <ShuleKitTable headers={['District', 'Orders', 'Revenue']} empty={!data?.byDistrict?.length} emptyLabel="No district data yet.">
                  {(data?.byDistrict ?? []).map((d: any) => (
                    <tr key={d.district} className="border-t border-border hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-navy">{d.district}</td>
                      <td className="px-4 py-3">{d.orders}</td>
                      <td className="px-4 py-3 font-medium text-navy">{Number(d.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </ShuleKitTable>
              </ShuleKitDataPanel>
            </div>
          </div>
        </>
      )}
    </ShuleKitPageShell>
  );
}

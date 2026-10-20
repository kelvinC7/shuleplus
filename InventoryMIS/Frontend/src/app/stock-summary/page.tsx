'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { ProductStockSummary } from '@/types';
import { AlertTriangle, AlertCircle, Package } from 'lucide-react';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';

export default function StockSummaryPage() {
  const [items, setItems] = useState<ProductStockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.products.stockSummary().then(setItems).finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    if (status === 'OUT_OF_STOCK') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Out of Stock</span>;
    if (status === 'LOW_STOCK') return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700"><AlertTriangle className="h-3 w-3 mr-1" />Low Stock</span>;
    return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"><Package className="h-3 w-3 mr-1" />In Stock</span>;
  };

  const lowStockCount = items.filter(i => i.status === 'LOW_STOCK').length;
  const outOfStockCount = items.filter(i => i.status === 'OUT_OF_STOCK').length;
  const nearExpiryCount = items.filter(i => i.hasNearExpiry).length;
  const expiredCount = items.filter(i => i.hasExpired).length;

  const exportColumns: ExportColumn[] = [
    { header: 'Product', accessor: 'product' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Status', accessor: 'status' },
    { header: 'Total Stock', accessor: 'totalStock' },
    { header: 'Near Expiry', accessor: 'nearExpiry' },
    { header: 'Expired', accessor: 'expired' },
  ];

  const exportData = items.map(item => ({
    product: item.name,
    sku: item.sku,
    status: item.status,
    totalStock: `${item.totalStock} ${item.unitOfMeasure}`,
    nearExpiry: item.hasNearExpiry ? 'Yes' : 'No',
    expired: item.hasExpired ? 'Yes' : 'No',
  }));

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stock Summary</h1>
            <p className="text-sm text-muted-foreground">Real-time stock levels across all products</p>
          </div>
          <div className="flex gap-2 pt-4 items-center justify-between sm:pt-0">
            <ExportDropdown title="Stock Summary" columns={exportColumns} data={exportData} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Items</p>
            <p className="mt-2 text-2xl font-bold">{items.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Low Stock</p>
            <p className="mt-2 text-2xl font-bold text-yellow-600">{lowStockCount}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Out of Stock</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{outOfStockCount}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Near Expiry / Expired</p>
            <p className="mt-2 text-2xl font-bold text-orange-600">{nearExpiryCount} / {expiredCount}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Total Stock</th>
                <th className="text-center px-4 py-3 font-medium">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.sku}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{item.totalStock} {item.unitOfMeasure}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.hasNearExpiry && <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Expiring</span>}
                      {item.hasExpired && <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expired</span>}
                      {!item.hasNearExpiry && !item.hasExpired && <span className="text-xs text-muted-foreground">-</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No stock data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

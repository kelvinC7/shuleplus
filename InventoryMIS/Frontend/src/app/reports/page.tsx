'use client';

import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { ProductStockSummary, StockReceiving, StockIssue, StockTransfer, StockAdjustment, Disposal, StockRequest } from '@/types';
import { AlertTriangle, AlertCircle, Package, Calendar } from 'lucide-react';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type TabKey = 'stock' | 'receivings' | 'issues' | 'transfers' | 'adjustments' | 'disposals' | 'requests';

export default function ReportsPage() {
  const [items, setItems] = useState<ProductStockSummary[]>([]);
  const [receivings, setReceivings] = useState<StockReceiving[]>([]);
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('stock');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    Promise.all([
      inventoryApi.products.stockSummary(),
      inventoryApi.receivings.list(),
      inventoryApi.issues.list(),
      inventoryApi.transfers.list(),
      inventoryApi.adjustments.list(),
      inventoryApi.disposals.list(),
      inventoryApi.stockRequests.list(),
    ]).then(([s, r, i, t, a, d, sr]) => {
      setItems(s);
      setReceivings(r);
      setIssues(i);
      setTransfers(t);
      setAdjustments(a);
      setDisposals(d);
      setRequests(sr);
    }).finally(() => setLoading(false));
  }, []);

  const isWithinRange = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr).getTime();
    if (dateFrom && d < new Date(dateFrom).getTime()) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59').getTime()) return false;
    return true;
  };

  const filteredReceivings = useMemo(() => receivings.filter(r => isWithinRange(r.receivedDate || r.createdAt)), [receivings, dateFrom, dateTo]);
  const filteredIssues = useMemo(() => issues.filter(i => isWithinRange(i.createdAt)), [issues, dateFrom, dateTo]);
  const filteredTransfers = useMemo(() => transfers.filter(t => isWithinRange(t.createdAt)), [transfers, dateFrom, dateTo]);
  const filteredAdjustments = useMemo(() => adjustments.filter(a => isWithinRange(a.adjustmentDate || a.createdAt)), [adjustments, dateFrom, dateTo]);
  const filteredDisposals = useMemo(() => disposals.filter(d => isWithinRange(d.disposalDate || d.createdAt)), [disposals, dateFrom, dateTo]);
  const filteredRequests = useMemo(() => requests.filter(r => isWithinRange(r.createdAt)), [requests, dateFrom, dateTo]);

  const statusBadge = (status: string) => {
    if (status === 'OUT_OF_STOCK') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Out of Stock</span>;
    if (status === 'LOW_STOCK') return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700"><AlertTriangle className="h-3 w-3 mr-1" />Low Stock</span>;
    return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"><Package className="h-3 w-3 mr-1" />In Stock</span>;
  };

  const lowStockCount = items.filter(i => i.status === 'LOW_STOCK').length;
  const outOfStockCount = items.filter(i => i.status === 'OUT_OF_STOCK').length;
  const nearExpiryCount = items.filter(i => i.hasNearExpiry).length;
  const expiredCount = items.filter(i => i.hasExpired).length;

  const issueStatusBadge = (status: string) => {
    if (status === 'APPROVED') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>;
    if (status === 'REJECTED') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Rejected</span>;
    if (status === 'ISSUED') return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Issued</span>;
    return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>;
  };

  const transferStatusBadge = (status: string) => {
    if (status === 'APPROVED') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>;
    if (status === 'REJECTED') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Rejected</span>;
    if (status === 'RECEIVED') return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Received</span>;
    return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>;
  };

  const adjustmentReasonBadge = (reason: string) => {
    if (reason === 'DAMAGE') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Damage</span>;
    if (reason === 'LOSS') return <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Loss</span>;
    if (reason === 'FOUND') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Found</span>;
    if (reason === 'CORRECTION') return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Correction</span>;
    return <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{reason}</span>;
  };

  const disposalReasonBadge = (reason: string) => {
    if (reason === 'EXPIRED') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expired</span>;
    if (reason === 'DAMAGED') return <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Damaged</span>;
    if (reason === 'OBSOLETE') return <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Obsolete</span>;
    if (reason === 'RECALL') return <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Recall</span>;
    return <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{reason}</span>;
  };

  const exportColumnsMap: Record<TabKey, ExportColumn[]> = {
    stock: [
      { header: 'Product', accessor: 'product' },
      { header: 'SKU', accessor: 'sku' },
      { header: 'Status', accessor: 'status' },
      { header: 'Total Stock', accessor: 'totalStock' },
      { header: 'Near Expiry', accessor: 'nearExpiry' },
      { header: 'Expired', accessor: 'expired' },
    ],
    receivings: [
      { header: 'GRN #', accessor: 'grnNumber' },
      { header: 'Supplier', accessor: 'supplier' },
      { header: 'Store', accessor: 'store' },
      { header: 'Items', accessor: 'items' },
      { header: 'Invoice', accessor: 'invoice' },
      { header: 'Date', accessor: 'date' },
    ],
    issues: [
      { header: 'Issue #', accessor: 'issueNumber' },
      { header: 'Issued To', accessor: 'issuedTo' },
      { header: 'Status', accessor: 'status' },
      { header: 'Items', accessor: 'items' },
      { header: 'Date', accessor: 'date' },
    ],
    transfers: [
      { header: 'Transfer #', accessor: 'transferNumber' },
      { header: 'From', accessor: 'from' },
      { header: 'To', accessor: 'to' },
      { header: 'Status', accessor: 'status' },
      { header: 'Items', accessor: 'items' },
      { header: 'Date', accessor: 'date' },
    ],
    adjustments: [
      { header: 'Adjustment #', accessor: 'adjustmentNumber' },
      { header: 'Reason', accessor: 'reason' },
      { header: 'Items', accessor: 'items' },
      { header: 'Date', accessor: 'date' },
      { header: 'Notes', accessor: 'notes' },
    ],
    disposals: [
      { header: 'Disposal #', accessor: 'disposalNumber' },
      { header: 'Reason', accessor: 'reason' },
      { header: 'Method', accessor: 'method' },
      { header: 'Items', accessor: 'items' },
      { header: 'Date', accessor: 'date' },
      { header: 'Notes', accessor: 'notes' },
    ],
    requests: [
      { header: 'Request #', accessor: 'requestNumber' },
      { header: 'Department', accessor: 'department' },
      { header: 'Status', accessor: 'status' },
      { header: 'Items', accessor: 'items' },
      { header: 'Date', accessor: 'date' },
    ],
  };

  const exportDataMap: Record<TabKey, Record<string, unknown>[]> = {
    stock: items.map(item => ({
      product: item.name,
      sku: item.sku,
      status: item.status,
      totalStock: `${item.totalStock} ${item.unitOfMeasure}`,
      nearExpiry: item.hasNearExpiry ? 'Yes' : 'No',
      expired: item.hasExpired ? 'Yes' : 'No',
    })),
    receivings: filteredReceivings.map(r => ({
      grnNumber: r.grnNumber,
      supplier: r.supplier?.name || '-',
      store: r.store?.name || '-',
      items: r._count?.items ?? 0,
      invoice: r.invoiceNumber || '-',
      date: new Date(r.receivedDate).toLocaleDateString(),
    })),
    issues: filteredIssues.map(issue => ({
      issueNumber: issue.issueNumber,
      issuedTo: issue.issuedToName || issue.issuedTo || '-',
      status: issue.status,
      items: issue._count?.items ?? 0,
      date: new Date(issue.createdAt).toLocaleDateString(),
    })),
    transfers: filteredTransfers.map(t => ({
      transferNumber: t.transferNumber,
      from: t.fromStore?.name || '-',
      to: t.toStore?.name || '-',
      status: t.status,
      items: t._count?.items ?? 0,
      date: new Date(t.createdAt).toLocaleDateString(),
    })),
    adjustments: filteredAdjustments.map(adj => ({
      adjustmentNumber: adj.adjustmentNumber,
      reason: adj.reason,
      items: adj._count?.items ?? 0,
      date: new Date(adj.adjustmentDate).toLocaleDateString(),
      notes: adj.notes || '-',
    })),
    disposals: filteredDisposals.map(d => ({
      disposalNumber: d.disposalNumber,
      reason: d.reason,
      method: d.disposalMethod || '-',
      items: d._count?.items ?? 0,
      date: new Date(d.disposalDate).toLocaleDateString(),
      notes: d.notes || '-',
    })),
    requests: filteredRequests.map(r => ({
      requestNumber: r.requestNumber,
      department: r.departmentName || '-',
      status: r.status,
      items: r._count?.items ?? 0,
      date: new Date(r.createdAt).toLocaleDateString(),
    })),
  };

  const tabTitles: Record<TabKey, string> = {
    stock: 'Stock Summary',
    receivings: 'Stock Receivings',
    issues: 'Stock Issues',
    transfers: 'Stock Transfers',
    adjustments: 'Stock Adjustments',
    disposals: 'Disposals',
    requests: 'Stock Requests',
  };

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">Inventory reports and analytics</p>
          </div>
          <div className="flex gap-2 pt-4 items-center justify-between sm:pt-0">
            <ExportDropdown title={tabTitles[activeTab]} columns={exportColumnsMap[activeTab]} data={exportDataMap[activeTab]} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              Clear
            </button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)}>
          <TabsList variant="line" className="overflow-x-auto">
            <TabsTrigger value="stock">Stock Summary</TabsTrigger>
            <TabsTrigger value="receivings">Receivings</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
            <TabsTrigger value="disposals">Disposals</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="stock">
            <div className="space-y-4 mt-4">
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
          </TabsContent>

          <TabsContent value="receivings">
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Receivings</p>
                  <p className="mt-2 text-2xl font-bold">{filteredReceivings.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Items Received</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">{filteredReceivings.reduce((s, r) => s + (r._count?.items ?? 0), 0)}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suppliers Involved</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{new Set(filteredReceivings.map(r => r.supplierId).filter(Boolean)).size}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">GRN #</th>
                      <th className="text-left px-4 py-3 font-medium">Supplier</th>
                      <th className="text-left px-4 py-3 font-medium">Store</th>
                      <th className="text-center px-4 py-3 font-medium">Items</th>
                      <th className="text-center px-4 py-3 font-medium">Invoice</th>
                      <th className="text-center px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceivings.map(r => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.grnNumber}</td>
                        <td className="px-4 py-3">{r.supplier?.name || '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.store?.name || '-'}</td>
                        <td className="px-4 py-3 text-center">{r._count?.items ?? 0}</td>
                        <td className="px-4 py-3 text-center">{r.invoiceNumber || '-'}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{new Date(r.receivedDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredReceivings.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No receivings found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="issues">
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Issues</p>
                  <p className="mt-2 text-2xl font-bold">{filteredIssues.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                  <p className="mt-2 text-2xl font-bold text-yellow-600">{filteredIssues.filter(i => i.status === 'PENDING').length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{filteredIssues.filter(i => i.status === 'APPROVED').length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issued</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">{filteredIssues.filter(i => i.status === 'ISSUED').length}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">Issue #</th>
                      <th className="text-left px-4 py-3 font-medium">Issued To</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-center px-4 py-3 font-medium">Items</th>
                      <th className="text-center px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map(issue => (
                      <tr key={issue.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{issue.issueNumber}</td>
                        <td className="px-4 py-3">{issue.issuedToName || issue.issuedTo || '-'}</td>
                        <td className="px-4 py-3 text-center">{issueStatusBadge(issue.status)}</td>
                        <td className="px-4 py-3 text-center">{issue._count?.items ?? 0}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{new Date(issue.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredIssues.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No issues found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transfers">
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Transfers</p>
                  <p className="mt-2 text-2xl font-bold">{filteredTransfers.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                  <p className="mt-2 text-2xl font-bold text-yellow-600">{filteredTransfers.filter(t => t.status === 'PENDING').length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{filteredTransfers.filter(t => t.status === 'RECEIVED').length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rejected</p>
                  <p className="mt-2 text-2xl font-bold text-red-600">{filteredTransfers.filter(t => t.status === 'REJECTED').length}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">Transfer #</th>
                      <th className="text-left px-4 py-3 font-medium">From</th>
                      <th className="text-left px-4 py-3 font-medium">To</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-center px-4 py-3 font-medium">Items</th>
                      <th className="text-center px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map(t => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{t.transferNumber}</td>
                        <td className="px-4 py-3">{t.fromStore?.name || '-'}</td>
                        <td className="px-4 py-3">{t.toStore?.name || '-'}</td>
                        <td className="px-4 py-3 text-center">{transferStatusBadge(t.status)}</td>
                        <td className="px-4 py-3 text-center">{t._count?.items ?? 0}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredTransfers.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No transfers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="adjustments">
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Adjustments</p>
                  <p className="mt-2 text-2xl font-bold">{filteredAdjustments.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Damage / Loss</p>
                  <p className="mt-2 text-2xl font-bold text-red-600">{filteredAdjustments.filter(a => a.reason === 'DAMAGE' || a.reason === 'LOSS').length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Found / Correction</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{filteredAdjustments.filter(a => a.reason === 'FOUND' || a.reason === 'CORRECTION').length}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">Adjustment #</th>
                      <th className="text-center px-4 py-3 font-medium">Reason</th>
                      <th className="text-center px-4 py-3 font-medium">Items</th>
                      <th className="text-center px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdjustments.map(adj => (
                      <tr key={adj.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{adj.adjustmentNumber}</td>
                        <td className="px-4 py-3 text-center">{adjustmentReasonBadge(adj.reason)}</td>
                        <td className="px-4 py-3 text-center">{adj._count?.items ?? 0}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{new Date(adj.adjustmentDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{adj.notes || '-'}</td>
                      </tr>
                    ))}
                    {filteredAdjustments.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No adjustments found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="disposals">
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Disposals</p>
                  <p className="mt-2 text-2xl font-bold">{filteredDisposals.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expired / Damaged</p>
                  <p className="mt-2 text-2xl font-bold text-red-600">{filteredDisposals.filter(d => d.reason === 'EXPIRED' || d.reason === 'DAMAGED').length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Items Disposed</p>
                  <p className="mt-2 text-2xl font-bold text-orange-600">{filteredDisposals.reduce((s, d) => s + (d._count?.items ?? 0), 0)}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">Disposal #</th>
                      <th className="text-center px-4 py-3 font-medium">Reason</th>
                      <th className="text-center px-4 py-3 font-medium">Method</th>
                      <th className="text-center px-4 py-3 font-medium">Items</th>
                      <th className="text-center px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisposals.map(d => (
                      <tr key={d.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{d.disposalNumber}</td>
                        <td className="px-4 py-3 text-center">{disposalReasonBadge(d.reason)}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{d.disposalMethod || '-'}</td>
                        <td className="px-4 py-3 text-center">{d._count?.items ?? 0}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{new Date(d.disposalDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{d.notes || '-'}</td>
                      </tr>
                    ))}
                    {filteredDisposals.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No disposals found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Requests</p>
                  <p className="mt-2 text-2xl font-bold">{filteredRequests.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                  <p className="mt-2 text-2xl font-bold text-yellow-600">{filteredRequests.filter(r => r.status === 'PENDING').length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{filteredRequests.filter(r => r.status === 'APPROVED').length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issued</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">{filteredRequests.filter(r => r.status === 'ISSUED').length}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">Request #</th>
                      <th className="text-left px-4 py-3 font-medium">Department</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-center px-4 py-3 font-medium">Items</th>
                      <th className="text-center px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map(r => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.requestNumber}</td>
                        <td className="px-4 py-3">{r.departmentName || '-'}</td>
                        <td className="px-4 py-3 text-center">{issueStatusBadge(r.status)}</td>
                        <td className="px-4 py-3 text-center">{r._count?.items ?? 0}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No requests found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

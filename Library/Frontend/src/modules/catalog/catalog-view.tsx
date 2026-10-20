'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, BookOpen } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibDataTable } from '@/components/lib-data-table';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ResourceFormModal } from '@/components/resource-form-modal';
import { LibModal } from '@/components/lib-modal';
import { libApi } from '@/services/lib-api';
import type { BookResource, PaginationMeta } from '@/types';

export default function CatalogView() {
  const [resources, setResources] = useState<BookResource[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ total: 0, available: 0, borrowed: 0, categories: 0 });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BookResource | null>(null);
  const [viewing, setViewing] = useState<BookResource | null>(null);
  const [viewDetail, setViewDetail] = useState<BookResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const data = await libApi.getResources(params.toString());
      setResources(data.resources ?? data.items ?? []);
      setMeta(data.pagination ?? { page, pageSize: 20, total: 0, totalPages: 0 });
      setStats({
        total: data.stats?.total ?? data.pagination?.total ?? 0,
        available: data.stats?.available ?? 0,
        borrowed: data.stats?.borrowed ?? 0,
        categories: data.stats?.categories ?? 0,
      });
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openView = async (r: BookResource) => {
    setViewing(r);
    try {
      const detail = await libApi.getResource(r.id);
      setViewDetail(detail);
    } catch {
      setViewDetail(r);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await libApi.deleteResource(deleteTarget.id);
      setDeleteTarget(null);
      load(meta.page);
    } catch {
      /* handled by api */
    } finally {
      setDeleting(false);
    }
  };

  const detail = viewDetail ?? viewing;

  return (
    <LibPageLayout
      title="All Resources"
      subtitle="Browse and manage the complete book catalog"
      actions={
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary">
          <Plus size={16} /> Add Resource
        </button>
      }
      kpis={[
        { label: 'Total Copies', value: stats.total, icon: <BookOpen size={20} /> },
        { label: 'Available', value: stats.available, icon: <BookOpen size={20} /> },
        { label: 'Borrowed', value: stats.borrowed, icon: <BookOpen size={20} /> },
        { label: 'Categories', value: stats.categories, icon: <BookOpen size={20} /> },
      ]}
      toolbar={
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder="Search by title, author, ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      }
    >
      <ResourceFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => load(meta.page)}
        editing={editing}
      />

      <LibModal
        open={Boolean(viewing)}
        onClose={() => { setViewing(null); setViewDetail(null); }}
        title={detail?.title ?? 'Resource Details'}
        subtitle={detail?.author ? `by ${detail.author}` : undefined}
        size="lg"
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs font-bold uppercase text-muted">ISBN</p><p className="font-medium text-navy">{detail.isbn ?? '—'}</p></div>
              <div><p className="text-xs font-bold uppercase text-muted">Status</p><StatusBadge status={detail.status} /></div>
              <div><p className="text-xs font-bold uppercase text-muted">Publisher</p><p className="text-navy">{detail.publisher ?? '—'}</p></div>
              <div><p className="text-xs font-bold uppercase text-muted">Year</p><p className="text-navy">{detail.publicationYear ?? '—'}</p></div>
              <div><p className="text-xs font-bold uppercase text-muted">Category</p><p className="text-navy">{detail.category?.name ?? '—'}</p></div>
              <div><p className="text-xs font-bold uppercase text-muted">Subject</p><p className="text-navy">{detail.subject?.name ?? '—'}</p></div>
              <div><p className="text-xs font-bold uppercase text-muted">Copies</p><p className="font-semibold text-navy">{detail.availableCopies}/{detail.totalCopies} available</p></div>
              <div><p className="text-xs font-bold uppercase text-muted">Shelf</p><p className="text-navy">{detail.shelf ? `${detail.shelf.building} · ${detail.shelf.section} · ${detail.shelf.shelf}` : '—'}</p></div>
            </div>
            {detail.description && (
              <div>
                <p className="text-xs font-bold uppercase text-muted">Description</p>
                <p className="mt-1 text-navy">{detail.description}</p>
              </div>
            )}
            {detail.copies && detail.copies.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-muted">Copy Barcodes</p>
                <div className="flex flex-wrap gap-2">
                  {detail.copies.map((c) => (
                    <span key={c.id} className="badge bg-slate-100 font-mono text-[11px] text-navy">{c.barcode}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setViewing(null); setViewDetail(null); }} className="btn-secondary">Close</button>
              <button
                type="button"
                onClick={() => { setEditing(detail); setFormOpen(true); setViewing(null); setViewDetail(null); }}
                className="btn-primary"
              >
                Edit Resource
              </button>
            </div>
          </div>
        )}
      </LibModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Resource"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />

      <LibDataTable
        data={resources}
        rowKey={(r) => r.id}
        loading={loading}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={meta.pageSize}
        onPageChange={load}
        emptyMessage="No resources found"
        emptyAction={
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary">
            <Plus size={16} /> Add Resource
          </button>
        }
        onView={openView}
        onEdit={(r) => { setEditing(r); setFormOpen(true); }}
        onDelete={setDeleteTarget}
        columns={[
          {
            key: 'title',
            header: 'Title',
            render: (r) => (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
                  <BookOpen size={16} />
                </div>
                <div>
                  <p className="font-semibold text-navy">{r.title}</p>
                  {r.isbn && <p className="text-[11px] text-muted">ISBN: {r.isbn}</p>}
                </div>
              </div>
            ),
          },
          { key: 'author', header: 'Author', render: (r) => <span className="text-muted">{r.author ?? '—'}</span> },
          {
            key: 'category',
            header: 'Category',
            className: 'hidden md:table-cell',
            render: (r) => <span className="badge bg-navy/5 text-navy">{r.category?.name ?? '—'}</span>,
          },
          {
            key: 'copies',
            header: 'Copies',
            className: 'hidden sm:table-cell',
            render: (r) => <span className="font-medium text-navy">{r.availableCopies}/{r.totalCopies}</span>,
          },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </LibPageLayout>
  );
}

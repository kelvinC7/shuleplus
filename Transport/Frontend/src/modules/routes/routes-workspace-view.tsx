'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Download, Eye, Pencil, Plus, Route as RouteIcon, Trash2 } from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { TransportDataTable } from '@/components/transport-data-table';
import { TransportModal } from '@/components/transport-modal';
import { StatusBadge } from '@/components/status-badge';
import type { RoutePlanDraft } from '@/modules/routes/route-planning-studio';
import {
  transportApi,
  type Bus,
  type RouteDetail,
  type RouteListRow,
  type RoutesDashboard,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

const RoutePlanningStudio = dynamic(
  () => import('./route-planning-studio').then((m) => ({ default: m.RoutePlanningStudio })),
  { ssr: false }
);

const RouteDetailView = dynamic(
  () => import('./route-detail-view').then((m) => ({ default: m.RouteDetailView })),
  { ssr: false }
);

function directionLabel(d: string) {
  if (d === 'MORNING') return 'Morning';
  if (d === 'AFTERNOON') return 'Afternoon';
  if (d === 'BOTH') return 'Both';
  return d;
}

export function RoutesWorkspaceView() {
  const notify = useToast();
  const [dash, setDash] = useState<RoutesDashboard | null>(null);
  const [rows, setRows] = useState<RouteListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<RouteDetail | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRouteId, setViewRouteId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [purging, setPurging] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState('RTE-001');


  const loadDash = useCallback(async () => {
    try {
      const { data } = await transportApi.routesDashboard();
      setDash(data.data ?? null);
    } catch {
      /* optional */
    }
  }, []);

  const loadBuses = useCallback(async () => {
    try {
      const { data } = await transportApi.buses();
      setBuses(data.data ?? []);
    } catch {
      /* optional */
    }
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await transportApi.routesPage({
        page,
        limit: pageSize,
        q: search.trim() || undefined,
        status: statusFilter || undefined,
        serviceDirection: directionFilter || undefined,
      });
      const payload = data.data;
      setRows(payload?.items ?? []);
      setTotal(payload?.total ?? 0);
      setTotalPages(payload?.totalPages ?? 1);
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Failed to load routes'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, directionFilter, notify]);

  useEffect(() => {
    void loadDash();
    void loadBuses();
  }, [loadDash, loadBuses]);

  useEffect(() => {
    const t = setTimeout(() => void loadPage(), 300);
    return () => clearTimeout(t);
  }, [loadPage]);

  async function openView(row: RouteListRow) {
    setViewRouteId(row.id);
    setViewOpen(true);
  }

  async function openCreate() {
    try {
      const { data } = await transportApi.nextRouteCode();
      setSuggestedCode(data.data?.code ?? 'RTE-001');
    } catch {
      setSuggestedCode('RTE-001');
    }
    setEditRoute(null);
    setWizardOpen(true);
  }

  async function openEdit(row: RouteListRow) {
    try {
      const { data } = await transportApi.getRoute(row.id);
      setEditRoute(data.data ?? null);
      setSuggestedCode(row.code);
      setWizardOpen(true);
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Could not load route'));
    }
  }

  async function saveWizard(draft: RoutePlanDraft, activate: boolean) {
    const body = {
      ...draft,
      etaMinutes: undefined,
      status: activate ? 'ACTIVE' : draft.status,
      direction: `${draft.stops[0]?.name ?? 'Start'} → ${draft.stops[draft.stops.length - 1]?.name ?? 'End'}`,
    };
    try {
      if (draft.id) {
        await transportApi.updateRouteFull(draft.id, body);
        notify.success(activate ? 'Route activated and saved.' : 'Route updated.');
      } else {
        await transportApi.createRouteFull(body);
        notify.toast({
          type: 'success',
          title: activate ? 'Route activated' : 'Route saved',
          description: `${draft.name} (${draft.code}) is in your route list.`,
          action: {
            label: 'Add another',
            onClick: () => void openCreate(),
          },
        });
      }
      setWizardOpen(false);
      setEditRoute(null);
      await loadPage();
      await loadDash();
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Could not save route'));
      throw err;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const { data } = await transportApi.deleteRoute(deleteTarget.id);
      const result = data.data;
      notify.success(result?.message ?? 'Route removed from your list');
      setDeleteTarget(null);
      if (viewRouteId === deleteTarget.id) {
        setViewOpen(false);
        setViewRouteId(null);
      }
      await loadPage();
      await loadDash();
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setDeleting(false);
    }
  }

  async function confirmPurgeAll() {
    if (purging) return;
    setPurging(true);
    try {
      const { data } = await transportApi.purgeOperationalData('CLEAR_ALL_TRANSPORT_DATA');
      notify.success(data.data?.message ?? 'Transport data cleared');
      setPurgeOpen(false);
      setPurgeConfirm('');
      setViewOpen(false);
      setViewRouteId(null);
      await loadPage();
      await loadDash();
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Could not clear data'));
    } finally {
      setPurging(false);
    }
  }

  function exportCsv() {
    const header = ['Code', 'Name', 'Direction', 'Bus', 'Stops', 'Learners', 'Schedule', 'Status'];
    const lines = rows.map((r) =>
      [
        r.code,
        r.name,
        directionLabel(r.serviceDirection ?? ''),
        r.primaryBus?.code ?? '',
        r.stopCount ?? r.stops?.length ?? 0,
        r.learnerCount ?? 0,
        `${r.departureTime ?? ''}-${r.arrivalTime ?? ''}`,
        r.status,
      ].join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'routes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: 'Total routes', value: dash?.totalRoutes ?? 0, icon: <RouteIcon size={18} className="text-primary" /> },
    { label: 'Active routes', value: dash?.activeRoutes ?? 0 },
    { label: 'Assigned buses', value: dash?.assignedBuses ?? 0 },
    { label: 'Enrolled learners', value: dash?.enrolledLearners ?? 0 },
  ];

  return (
    <TransportPageLayout
      kpis={kpis}
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="btn-primary" onClick={() => void openCreate()}>
            <Plus size={16} /> New route
          </button>
        </>
      }
    >
      <div className={`space-y-3 ${wizardOpen ? 'pointer-events-none opacity-40 blur-[1px]' : ''}`} aria-hidden={wizardOpen}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            className="input min-w-0 flex-1 lg:max-w-md"
            placeholder="Search routes…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input w-full min-w-[140px] sm:w-auto"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(['MORNING', 'AFTERNOON', 'BOTH'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDirectionFilter(directionFilter === d ? '' : d);
                    setPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                    directionFilter === d ? 'bg-white text-navy shadow-sm' : 'text-muted'
                  }`}
                >
                  {directionLabel(d)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <TransportDataTable
          loading={loading}
          data={rows}
          rowKey={(r) => r.id}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          emptyMessage="No routes yet."
          emptyAction={
            <button type="button" className="btn-primary" onClick={() => void openCreate()}>
              <Plus size={16} /> New route
            </button>
          }
          columns={[
            {
              key: 'route',
              header: 'Route',
              render: (r) => (
                <button type="button" className="text-left" onClick={() => void openView(r)}>
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: r.color ?? '#FCB038' }}
                  />
                  <span className="font-semibold text-navy">{r.name}</span>
                  <span className="block text-xs text-muted">
                    {r.code} · {directionLabel(r.serviceDirection ?? 'BOTH')}
                  </span>
                </button>
              ),
            },
            {
              key: 'bus',
              header: 'Bus',
              render: (r) => r.primaryBus?.code ?? '',
            },
            {
              key: 'stops',
              header: 'Stops',
              render: (r) => r.stopCount ?? r.stops?.length ?? 0,
            },
            {
              key: 'learners',
              header: 'Learners',
              render: (r) => r.learnerCount ?? 0,
            },
            {
              key: 'sched',
              header: 'Schedule',
              render: (r) => (
                <span className="whitespace-nowrap text-sm tabular-nums">
                  {r.departureTime && r.arrivalTime ? `${r.departureTime}–${r.arrivalTime}` : r.departureTime ?? ''}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusBadge status={r.status} />,
            },
          ]}
          renderActions={(r) => (
            <>
              <IconBtn label="View" onClick={() => void openView(r)}>
                <Eye size={15} />
              </IconBtn>
              <IconBtn label="Edit" onClick={() => void openEdit(r)}>
                <Pencil size={15} />
              </IconBtn>
              <IconBtn label="Delete" danger onClick={() => setDeleteTarget(r)}>
                <Trash2 size={15} />
              </IconBtn>
            </>
          )}
        />

        <p className="pt-2 text-right">
          <button
            type="button"
            className="text-xs font-medium text-danger/80 hover:text-danger"
            onClick={() => setPurgeOpen(true)}
          >
            Clear all transport data
          </button>
        </p>
      </div>

      <RoutePlanningStudio
        open={wizardOpen}
        initial={editRoute}
        buses={buses}
        suggestedCode={suggestedCode}
        onClose={() => setWizardOpen(false)}
        onSave={saveWizard}
      />

      <RouteDetailView
        open={viewOpen}
        routeId={viewRouteId}
        onClose={() => {
          setViewOpen(false);
          setViewRouteId(null);
        }}
        onEdit={(detail) => {
          setViewOpen(false);
          void openEdit(detail);
        }}
      />

      <TransportModal
        open={Boolean(deleteTarget)}
        title="Remove route?"
        description="The route will disappear from this list. Learners are unlinked from this route. Past trips stay in history if any exist."
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? 'Removing…' : 'Remove route'}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">{deleteTarget?.name}</p>
      </TransportModal>

      <TransportModal
        open={purgeOpen}
        title="Clear all transport data?"
        description="Removes every route, bus, learner enrollment, and trip for your organization. Settings are kept. This cannot be undone."
        onClose={() => {
          setPurgeOpen(false);
          setPurgeConfirm('');
        }}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setPurgeOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={purging || purgeConfirm !== 'CLEAR_ALL_TRANSPORT_DATA'}
              onClick={() => void confirmPurgeAll()}
            >
              {purging ? 'Clearing…' : 'Clear everything'}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted">
          Type <strong className="text-navy">CLEAR_ALL_TRANSPORT_DATA</strong> to confirm (includes demo routes like
          Kicukiro Route).
        </p>
        <input
          className="input font-mono text-sm"
          value={purgeConfirm}
          onChange={(e) => setPurgeConfirm(e.target.value)}
          placeholder="CLEAR_ALL_TRANSPORT_DATA"
          autoComplete="off"
        />
      </TransportModal>
    </TransportPageLayout>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${danger ? 'text-danger hover:bg-danger/5' : 'text-muted hover:bg-slate-100 hover:text-navy'}`}
    >
      {children}
    </button>
  );
}

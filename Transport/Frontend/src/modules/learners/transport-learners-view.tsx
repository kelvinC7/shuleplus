'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Download, Eye, Pencil, Plus, RefreshCw, Route as RouteIcon, Users } from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { TransportDataTable } from '@/components/transport-data-table';
import { StatusBadge } from '@/components/status-badge';
import {
  transportApi,
  type LearnersDashboard,
  type Route,
  type RouteListRow,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { RouteLearnersDrawer } from '@/modules/learners/route-learners-drawer';

const AssignLearnersWizard = dynamic(
  () => import('./assign-learners-wizard').then((m) => ({ default: m.AssignLearnersWizard })),
  { ssr: false }
);

function routeAssignmentStatus(row: RouteListRow): string {
  const assigned = row.learnerCount ?? row._count?.assignments ?? 0;
  const cap = row.primaryBus?.capacity ?? row.buses?.[0]?.capacity ?? 0;
  if (row.status === 'INACTIVE') return 'INACTIVE';
  if (!row.primaryBus && !row.buses?.length) return 'Needs attention';
  if (cap && assigned >= cap) return 'Full';
  if (row.status === 'DRAFT') return 'DRAFT';
  return 'ACTIVE';
}

export function TransportLearnersView() {
  const notify = useToast();
  const [dash, setDash] = useState<LearnersDashboard | null>(null);
  const [rows, setRows] = useState<RouteListRow[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [drawerRoute, setDrawerRoute] = useState<RouteListRow | null>(null);
  const [prefillRouteId, setPrefillRouteId] = useState<string | undefined>();

  const loadDash = useCallback(async () => {
    try {
      const { data } = await transportApi.learnersDashboard();
      setDash(data.data ?? null);
    } catch {
      /* optional */
    }
  }, []);

  const loadRoutesList = useCallback(async () => {
    try {
      const { data } = await transportApi.routes();
      setRoutes(data.data ?? []);
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
  }, [page, pageSize, search, statusFilter, notify]);

  useEffect(() => {
    void loadDash();
    void loadRoutesList();
  }, [loadDash, loadRoutesList]);

  useEffect(() => {
    const t = setTimeout(() => void loadPage(), 300);
    return () => clearTimeout(t);
  }, [loadPage]);

  function refreshAll() {
    void loadDash();
    void loadPage();
    void loadRoutesList();
  }

  function exportCsv() {
    const header = ['Code', 'Name', 'Bus', 'Assigned', 'Stops', 'Capacity', 'Status'];
    const lines = rows.map((r) => {
      const assigned = r.learnerCount ?? 0;
      const cap = r.primaryBus?.capacity ?? '';
      return [
        r.code,
        r.name,
        r.primaryBus?.code ?? '',
        assigned,
        r.stopCount ?? r.stops?.length ?? 0,
        cap ? `${assigned}/${cap}` : assigned,
        routeAssignmentStatus(r),
      ].join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transport-learners-by-route.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = useMemo(
    () => [
      {
        label: 'In school',
        value: dash?.totalInSchool ?? 0,
        icon: <Users size={20} className="text-primary" />,
      },
      {
        label: 'Assigned',
        value: dash?.assigned ?? 0,
      },
      {
        label: 'Unassigned',
        value: dash?.unassigned ?? 0,
      },
      {
        label: 'Routes with learners',
        value: dash?.activeRoutesWithAssignments ?? 0,
        icon: <RouteIcon size={18} className="text-primary" />,
      },
    ],
    [dash]
  );

  return (
    <TransportPageLayout
      kpis={kpis}
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="btn-secondary" onClick={refreshAll}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setPrefillRouteId(undefined);
              setWizardOpen(true);
            }}
          >
            <Plus size={16} /> Assign learners
          </button>
        </>
      }
    >
      {dash && dash.studentManagementLinked === false ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Learner roster comes from <strong>Student Management</strong>. Configure{' '}
          <code className="text-xs">STUDENT_MANAGEMENT_API_URL</code> on the Transport API and redeploy so Assign
          learners shows your real classes and students.
        </p>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input min-w-0 flex-1 sm:max-w-md"
          placeholder="Search routes…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input w-full sm:w-40"
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
      </div>

      <TransportDataTable
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
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
          <button type="button" className="btn-primary" onClick={() => setWizardOpen(true)}>
            Assign learners
          </button>
        }
        columns={[
          {
            key: 'route',
            header: 'Route',
            render: (r) => (
              <div>
                <p className="font-semibold text-navy">{r.name}</p>
                <p className="text-xs text-muted">{r.code}</p>
              </div>
            ),
          },
          {
            key: 'vehicle',
            header: 'Bus',
            render: (r) => (
              <span className="text-sm font-medium text-navy">
                {r.primaryBus?.code ?? r.buses?.[0]?.code ?? ''}
              </span>
            ),
          },
          {
            key: 'assigned',
            header: 'Assigned',
            render: (r) => <strong>{r.learnerCount ?? r._count?.assignments ?? 0}</strong>,
          },
          {
            key: 'stops',
            header: 'Stops',
            render: (r) => r.stopCount ?? r.stops?.length ?? 0,
          },
          {
            key: 'capacity',
            header: 'Capacity',
            render: (r) => {
              const n = r.learnerCount ?? 0;
              const cap = r.primaryBus?.capacity ?? r.buses?.[0]?.capacity;
              return cap ? (
                <span className="tabular-nums">
                  {n}/{cap}
                </span>
              ) : (
                n
              );
            },
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusBadge status={routeAssignmentStatus(r)} />,
          },
        ]}
        renderActions={(r) => (
          <>
            <button
              type="button"
              className="rounded-lg p-2 text-muted hover:bg-slate-100"
              title="View"
              onClick={() => setDrawerRoute(r)}
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-muted hover:bg-slate-100"
              title="Edit assignments"
              onClick={() => {
                setPrefillRouteId(r.id);
                setWizardOpen(true);
              }}
            >
              <Pencil size={15} />
            </button>
          </>
        )}
      />

      <AssignLearnersWizard
        open={wizardOpen}
        routes={routes}
        initialRouteId={prefillRouteId}
        onClose={() => {
          setWizardOpen(false);
          setPrefillRouteId(undefined);
        }}
        onSaved={refreshAll}
      />

      <RouteLearnersDrawer
        routeRow={drawerRoute}
        onClose={() => setDrawerRoute(null)}
        onEditAssignments={(id) => {
          setDrawerRoute(null);
          setPrefillRouteId(id);
          setWizardOpen(true);
        }}
        onRefresh={refreshAll}
      />
    </TransportPageLayout>
  );
}

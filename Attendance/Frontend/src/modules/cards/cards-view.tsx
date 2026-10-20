'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw, Search } from 'lucide-react';
import { PageShell, KpiGrid, Panel, TabBar, PersonAvatar } from '@/components/attendance-ui';
import { ListPagination } from '@/components/list-pagination';
import { attendanceApi, type StaffPerson, type StudentPerson } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

export function CardsView() {
  const toast = useToast();
  const [tab, setTab] = useState<'students' | 'staff'>('students');
  const [q, setQ] = useState('');
  const [students, setStudents] = useState<StudentPerson[]>([]);
  const [staff, setStaff] = useState<StaffPerson[]>([]);
  const [stuPage, setStuPage] = useState(1);
  const [stfPage, setStfPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [stuTotal, setStuTotal] = useState(0);
  const [stfTotal, setStfTotal] = useState(0);
  const [stuTotalPages, setStuTotalPages] = useState(1);
  const [stfTotalPages, setStfTotalPages] = useState(1);
  const [withCardStudents, setWithCardStudents] = useState(0);
  const [withCardStaff, setWithCardStaff] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setStuPage(1);
    setStfPage(1);
  }, [search, tab]);

  const loadStudents = useCallback(async () => {
    try {
      const { data } = await attendanceApi.peopleStudents({
        q: search || undefined,
        page: stuPage,
        limit,
      });
      const overview = data.data;
      setStudents(overview?.rows ?? []);
      setStuTotal(overview?.total ?? 0);
      setStuTotalPages(overview?.totalPages ?? 1);
      setWithCardStudents((overview?.rows ?? []).filter((s) => s.rfidUid).length);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load student cards'));
    }
  }, [search, stuPage, limit, toast]);

  const loadStaff = useCallback(async () => {
    try {
      const { data } = await attendanceApi.peopleStaff({
        q: search || undefined,
        page: stfPage,
        limit,
      });
      const overview = data.data;
      setStaff(overview?.rows ?? []);
      setStfTotal(overview?.total ?? 0);
      setStfTotalPages(overview?.totalPages ?? 1);
      setWithCardStaff((overview?.rows ?? []).filter((s) => s.rfidUid).length);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load staff cards'));
    }
  }, [search, stfPage, limit, toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadStudents(), loadStaff()]);
    } finally {
      setLoading(false);
    }
  }, [loadStudents, loadStaff]);

  useEffect(() => {
    void load();
  }, [load]);

  const studentRows = students;
  const staffRows = staff;
  const page = tab === 'students' ? stuPage : stfPage;
  const total = tab === 'students' ? stuTotal : stfTotal;
  const totalPages = tab === 'students' ? stuTotalPages : stfTotalPages;

  return (
    <PageShell
      title="Access cards"
      subtitle="Smart Access registry for your school"
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      <KpiGrid
        columns={4}
        items={[
          { label: 'Students (roster)', value: stuTotal, icon: <CreditCard size={18} /> },
          { label: 'With card (page)', value: withCardStudents },
          { label: 'Staff (roster)', value: stfTotal },
          { label: 'With card (page)', value: withCardStaff },
        ]}
      />

      <TabBar
        active={tab}
        onChange={(id) => setTab(id as 'students' | 'staff')}
        tabs={[
          { id: 'students', label: 'Students' },
          { id: 'staff', label: 'Staff' },
        ]}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Search name, code, card ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Panel title={tab === 'students' ? 'Students' : 'Staff'}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Person</th>
                {tab === 'students' ? (
                  <th className="px-4 py-3 font-semibold">Class</th>
                ) : (
                  <th className="px-4 py-3 font-semibold">Role</th>
                )}
                <th className="px-4 py-3 font-semibold">Card ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : tab === 'students' ? (
                studentRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PersonAvatar name={r.fullName} photoUrl={r.photoUrl} size={36} />
                        <div>
                          <p className="font-semibold text-navy">{r.fullName}</p>
                          <p className="text-[10px] text-muted">{r.studentCode || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.className || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.rfidUid ? (
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">{r.rfidUid}</span>
                      ) : (
                        <span className="text-muted">Not assigned</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                staffRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PersonAvatar name={r.fullName} photoUrl={r.photoUrl} size={36} />
                        <div>
                          <p className="font-semibold text-navy">{r.fullName}</p>
                          <p className="text-[10px] text-muted">{r.employeeNumber || r.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.position || 'Staff'}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.rfidUid ? (
                        <span className="rounded-lg bg-violet-50 px-2.5 py-1 font-medium text-violet-800">{r.rfidUid}</span>
                      ) : (
                        <span className="text-muted">Not assigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && tab === 'students' && studentRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No students match your search.</p>
          ) : null}
          {!loading && tab === 'staff' && staffRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No staff match your search.</p>
          ) : null}
        </div>
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(p) => (tab === 'students' ? setStuPage(p) : setStfPage(p))}
          onLimitChange={(n) => {
            setLimit(n);
            setStuPage(1);
            setStfPage(1);
          }}
        />
      </Panel>
    </PageShell>
  );
}

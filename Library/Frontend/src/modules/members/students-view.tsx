'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Search } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibDataTable } from '@/components/lib-data-table';
import { LibModal } from '@/components/lib-modal';
import { libApi } from '@/services/lib-api';

interface MemberInfo {
  id: string;
  name: string;
  type: string;
  class?: string;
  activeLoans: number;
  totalLoans: number;
  lastLoanDate?: string;
}

export default function StudentsView() {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<MemberInfo | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getMembers('STUDENT');
      setMembers(data.members ?? []);
    } catch { setMembers([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = members.filter((m) => {
    if (!search) return true;
    return m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <LibPageLayout
      title="Students"
      subtitle="Student library members and their borrowing history"
      kpis={[
        { label: 'Total Students', value: members.length, icon: <UserCheck size={20} /> },
        { label: 'Active Borrowers', value: members.filter((m) => m.activeLoans > 0).length, icon: <UserCheck size={20} /> },
      ]}
      toolbar={
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      }
    >
      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.name ?? 'Student'} subtitle="Member details" size="md">
        {viewing && (
          <div className="space-y-2 text-sm">
            <p><span className="font-bold text-muted">ID:</span> <span className="font-mono">{viewing.id}</span></p>
            <p><span className="font-bold text-muted">Class:</span> {viewing.class ?? '—'}</p>
            <p><span className="font-bold text-muted">Active loans:</span> {viewing.activeLoans}</p>
            <p><span className="font-bold text-muted">Total loans:</span> {viewing.totalLoans}</p>
            {viewing.lastLoanDate && <p><span className="font-bold text-muted">Last loan:</span> {new Date(viewing.lastLoanDate).toLocaleDateString()}</p>}
          </div>
        )}
      </LibModal>

      <LibDataTable
        data={filtered}
        rowKey={(m) => m.id}
        loading={loading}
        emptyMessage="No students found"
        onView={setViewing}
        columns={[
          {
            key: 'name',
            header: 'Student',
            render: (m) => (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-primary text-xs font-bold">{m.name[0]}</div>
                <span className="font-semibold text-navy">{m.name}</span>
              </div>
            ),
          },
          { key: 'id', header: 'ID', className: 'hidden md:table-cell', render: (m) => <span className="font-mono text-xs text-muted">{m.id.slice(0, 12)}…</span> },
          { key: 'class', header: 'Class', className: 'hidden md:table-cell', render: (m) => <span className="text-muted">{m.class ?? '—'}</span> },
          { key: 'active', header: 'Active Loans', render: (m) => <span className={`badge ${m.activeLoans > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'} text-[11px] font-bold`}>{m.activeLoans}</span> },
          { key: 'total', header: 'Total Loans', render: (m) => <span className="font-medium text-navy">{m.totalLoans}</span> },
        ]}
      />
    </LibPageLayout>
  );
}

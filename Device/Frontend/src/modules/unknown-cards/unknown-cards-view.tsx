'use client';

import { useCallback, useEffect, useState } from 'react';
import { DeviceDataTable, type DeviceTableColumn } from '@/components/device-data-table';
import { DeviceFormModal } from '@/components/device-form-modal';
import { DevicePageLayout } from '@/components/device-page-layout';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { deviceApi } from '@/services/device-api';
import type { UnknownCard } from '@/types';

type SmStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  className?: string | null;
  rfidUid?: string | null;
};

export function UnknownCardsView() {
  const [rows, setRows] = useState<UnknownCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<UnknownCard | null>(null);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<SmStudent[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await deviceApi.unknownCards();
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(id: string, act: string, studentId?: string) {
    await deviceApi.unknownCardAction(id, act, studentId);
    await load();
  }

  async function searchStudents() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const { data } = await deviceApi.searchStudents(search.trim());
      setStudents(data.data ?? []);
    } finally {
      setSearching(false);
    }
  }

  const columns: DeviceTableColumn<UnknownCard>[] = [
    {
      key: 'card',
      header: 'Card UID',
      render: (r) => <span className="font-mono text-xs">{r.cardUid}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (r) => new Date(r.lastSeenAt).toLocaleDateString(),
    },
    {
      key: 'device',
      header: 'Device',
      render: (r) => r.location ?? r.deviceCode,
    },
    {
      key: 'attempts',
      header: 'Attempts',
      hideOnMobile: true,
      render: (r) => r.attempts,
    },
    {
      key: 'actions',
      header: 'Quick Actions',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded-lg border border-primary/40 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/5"
            onClick={() => {
              setLinking(r);
              setSearch('');
              setStudents([]);
            }}
          >
            Identify
          </button>
          {(['block', 'ignore'] as const).map((a) => (
            <button
              key={a}
              type="button"
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold capitalize hover:bg-slate-50"
              onClick={() => void action(r.id, a)}
            >
              {a}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <DevicePageLayout subtitle="Cards scanned without a linked student — link via Student Management">
      <StatsGrid columns={4}>
        <StatCard label="Unknown Cards" value={total} delta="Needs identification" />
      </StatsGrid>

      <DeviceDataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No unknown cards"
        minWidth={640}
      />

      <DeviceFormModal
        open={Boolean(linking)}
        onOpenChange={(open) => {
          if (!open) setLinking(null);
        }}
        title={linking ? `Link card ${linking.cardUid}` : 'Link card'}
        description="Search Student Management and assign this RFID UID"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Student name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void searchStudents()}
            />
            <button type="button" className="btn-primary shrink-0" disabled={searching} onClick={() => void searchStudents()}>
              {searching ? '…' : 'Search'}
            </button>
          </div>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-navy">{s.fullName}</p>
                  <p className="text-xs text-muted">
                    {s.studentCode}
                    {s.className ? ` · ${s.className}` : ''}
                    {s.rfidUid ? ` · RFID: ${s.rfidUid}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => linking && void action(linking.id, 'link', s.id).then(() => setLinking(null))}
                >
                  Link
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setLinking(null)}>
              Cancel
            </button>
          </div>
        </div>
      </DeviceFormModal>
    </DevicePageLayout>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, RefreshCw, Search } from 'lucide-react';
import { SchoolLogo } from '@/components/schools/school-logo';
import { ModulePage } from '@/components/ui/module-page';
import { KpiCard } from '@/components/ui/kpi-card';
import { NesaDataTable, StatusPill } from '@/components/ui/nesa-data-table';
import { nesaApi, type SchoolListItem } from '@/services/nesa-api';

const PAGE_SIZE = 10;

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await nesaApi.listSchools({ status: 'ACTIVE' });
      setSchools(res.data.data ?? []);
    } catch (err) {
      setSchools([]);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not load schools from Authentication'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const provinces = useMemo(
    () =>
      [...new Set(schools.map((s) => s.province).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b)
      ),
    [schools]
  );

  const districts = useMemo(() => {
    const rows = province ? schools.filter((s) => s.province === province) : schools;
    return [...new Set(rows.map((s) => s.district).filter(Boolean) as string[])].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [schools, province]);

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      if (province && s.province !== province) return false;
      if (district && s.district !== district) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.organizationCode ?? '').toLowerCase().includes(q) ||
        (s.district ?? '').toLowerCase().includes(q) ||
        (s.sector ?? '').toLowerCase().includes(q)
      );
    });
  }, [schools, province, district, search]);

  useEffect(() => {
    setPage(1);
  }, [search, province, district]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const ownershipCounts = {
    government: schools.filter(
      (s) => (s.ownershipType ?? '').includes('GOVERNMENT') && !(s.ownershipType ?? '').includes('AIDED')
    ).length,
    aided: schools.filter((s) => (s.ownershipType ?? '').includes('AIDED')).length,
    private: schools.filter((s) => (s.ownershipType ?? '').includes('PRIVATE')).length,
  };

  return (
    <ModulePage
      title="Schools"
      subtitle="Registered ACTIVE schools from Authentication"
      actions={
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-semibold text-navy"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Registered schools" value={schools.length} />
        <KpiCard label="Government" value={ownershipCounts.government} />
        <KpiCard label="Gov. aided" value={ownershipCounts.aided} />
        <KpiCard label="Private" value={ownershipCounts.private} />
      </div>

      <div className="nesa-card flex flex-col gap-3 !p-4 lg:flex-row lg:items-end">
        <label className="relative min-w-[220px] flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy/45">
            Search
          </span>
          <Search size={15} className="absolute bottom-3 left-3 text-navy/35" />
          <input
            className="nesa-input pl-9"
            placeholder="Name, code, district…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="min-w-[160px]">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy/45">
            Province
          </span>
          <select
            className="nesa-input"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setDistrict('');
            }}
          >
            <option value="">All provinces</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[160px]">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy/45">
            District
          </span>
          <select className="nesa-input" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <NesaDataTable
        title="School registry"
        subtitle="Live data from Authentication IAM"
        columns={[
          {
            key: 'school',
            header: 'School',
            render: (s) => (
              <div className="flex items-start gap-3">
                <SchoolLogo logoUrl={s.logoUrl} name={s.name} className="mt-0.5 h-9 w-9" />
                <div>
                  <p className="font-semibold text-navy">{s.name}</p>
                  <p className="text-xs text-navy/45">
                    {s.organizationCode ?? '—'} · {s.type}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'location',
            header: 'Location',
            render: (s) => (
              <div className="flex items-start gap-1.5 text-navy/80">
                <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  {[s.province, s.district, s.sector].filter(Boolean).join(' · ') || 'Not set'}
                </span>
              </div>
            ),
          },
          {
            key: 'ownership',
            header: 'Ownership',
            render: (s) => (s.ownershipType ?? '—').replaceAll('_', ' '),
          },
          {
            key: 'status',
            header: 'Status',
            render: (s) => <StatusPill status={s.status} />,
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (s) => (
              <div className="flex justify-end gap-2">
                <Link
                  href={`/nesa/schools/${s.id}`}
                  className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  Details
                </Link>
                <Link
                  href={`/nesa/circulars/list?schoolId=${s.id}`}
                  className="rounded-lg border border-navy/10 px-3 py-1.5 text-xs font-semibold text-navy"
                >
                  Circulars
                </Link>
              </div>
            ),
          },
        ]}
        rows={pageRows}
        rowKey={(s) => s.id}
        loading={loading}
        emptyMessage="No registered schools found."
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
      />
    </ModulePage>
  );
}

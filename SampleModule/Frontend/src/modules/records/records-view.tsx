'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Filter, Plus, Upload } from 'lucide-react';

import { ModuleHeader } from '@/components/layout/module-header';
import { Column, DataTable, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { enrichRecord, type RecordRow } from '@/data/mock';
import { api } from '@/services/api';
import type { SampleRecord } from '@/types';

const COLUMNS: Column<RecordRow>[] = [
  {
    key: 'select',
    header: '',
    render: () => <Checkbox />,
    className: 'w-10',
  },
  { key: 'id', header: 'ID', sortable: true, className: 'font-mono text-xs' },
  { key: 'title', header: 'Title', sortable: true, className: 'font-medium' },
  { key: 'department', header: 'Department', sortable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
  { key: 'priority', header: 'Priority', sortable: true },
  { key: 'owner', header: 'Owner' },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: true,
    render: (row) => new Date(row.createdAt).toLocaleDateString(),
  },
];

export function RecordsView() {
  const router = useRouter();
  const [records, setRecords] = useState<SampleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/records')
      .then((res) => setRecords(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => records.map(enrichRecord), [records]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Records"
        breadcrumbs={['Home', 'Records', 'All Records']}
        backHref="/dashboard"
        icon={<FileTextIcon />}
        iconClassName="bg-violet-500"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="mr-1.5 size-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 size-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="mr-1.5 size-4" />
              Import
            </Button>
            <Link href="/records/new">
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Add Record
              </Button>
            </Link>
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading records…</p>
      ) : (
        <DataTable
          columns={COLUMNS}
          data={rows}
          getRowId={(row) => row.id}
          searchPlaceholder="Search records by title, department, owner…"
          pageSize={8}
          zebra
          onRowClick={(row) => router.push(`/records/${row.id}`)}
        />
      )}
    </div>
  );
}

function FileTextIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

'use client';

import { Download, Filter } from 'lucide-react';

import { ModuleHeader } from '@/components/layout/module-header';
import { Column, DataTable, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { AUDIT_LOG } from '@/data/mock';

type AuditRow = (typeof AUDIT_LOG)[number];

const COLUMNS: Column<AuditRow>[] = [
  { key: 'id', header: 'ID', sortable: true, className: 'font-mono text-xs' },
  { key: 'timestamp', header: 'Timestamp', sortable: true },
  { key: 'actor', header: 'Actor', sortable: true },
  { key: 'action', header: 'Action', sortable: true, className: 'font-semibold' },
  { key: 'resource', header: 'Resource', sortable: true },
  { key: 'ip', header: 'IP Address', className: 'font-mono text-xs' },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
];

export function AuditLogView() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Audit Log"
        breadcrumbs={['Home', 'Audit Log']}
        backHref="/dashboard"
        icon={<ScrollIcon />}
        iconClassName="bg-navy"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="mr-1.5 size-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 size-4" />
              Export Log
            </Button>
          </>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={AUDIT_LOG}
        getRowId={(row) => row.id}
        searchPlaceholder="Search by actor, action, resource…"
        pageSize={10}
        zebra
      />
    </div>
  );
}

function ScrollIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

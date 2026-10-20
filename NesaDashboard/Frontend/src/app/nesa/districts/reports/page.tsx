'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Reports",
    "value": "40"
  },
  {
    "label": "Due",
    "value": "5"
  },
  {
    "label": "Submitted",
    "value": "31"
  },
  {
    "label": "Overdue",
    "value": "4"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "name": "Gasabo Weekly Pack",
    "status": "Submitted"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"District Reports"}
      subtitle={"Operational reports for districts."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'name', header: 'Report', render: (row) => String(row.name ?? '') },
          { key: 'status', header: 'Status', render: (row) => String(row.status ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

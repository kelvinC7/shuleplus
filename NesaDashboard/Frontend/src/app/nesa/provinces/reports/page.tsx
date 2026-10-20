'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Reports",
    "value": "24"
  },
  {
    "label": "This month",
    "value": "4"
  },
  {
    "label": "Scheduled",
    "value": "2"
  },
  {
    "label": "Shared",
    "value": "11"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "name": "East Compliance Pack",
    "period": "July 2026"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Province Reports"}
      subtitle={"Downloadable provincial reports."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'name', header: 'Report', render: (row) => String(row.name ?? '') },
          { key: 'period', header: 'Period', render: (row) => String(row.period ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

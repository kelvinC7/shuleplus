'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Years",
    "value": "8"
  },
  {
    "label": "Active",
    "value": "1"
  },
  {
    "label": "Planned",
    "value": "1"
  },
  {
    "label": "Closed",
    "value": "6"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "year": "2025-2026",
    "start": "2025-09-01",
    "end": "2026-07-31"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Academic Years List"}
      subtitle={"Define and manage academic years."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'year', header: 'Year', render: (row) => String(row.year ?? '') },
          { key: 'start', header: 'Start', render: (row) => String(row.start ?? '') },
          { key: 'end', header: 'End', render: (row) => String(row.end ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

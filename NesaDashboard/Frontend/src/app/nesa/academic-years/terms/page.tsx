'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Terms",
    "value": "24"
  },
  {
    "label": "Current",
    "value": "Term 1"
  },
  {
    "label": "Upcoming",
    "value": "Term 2"
  },
  {
    "label": "Closed",
    "value": "21"
  }
] as const;

const FILTERS = [
  {
    "label": "Year",
    "options": [
      "A",
      "B",
      "C"
    ]
  }
];

const ROWS: Record<string, unknown>[] = [
  {
    "term": "Term 1",
    "year": "2025-2026",
    "window": "Sep–Dec"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Terms"}
      subtitle={"Term windows within academic years."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'term', header: 'Term', render: (row) => String(row.term ?? '') },
          { key: 'year', header: 'Year', render: (row) => String(row.year ?? '') },
          { key: 'window', header: 'Window', render: (row) => String(row.window ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

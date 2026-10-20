'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Holidays",
    "value": "14"
  },
  {
    "label": "National",
    "value": "9"
  },
  {
    "label": "Religious",
    "value": "3"
  },
  {
    "label": "Breaks",
    "value": "2"
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
    "name": "Christmas Break",
    "from": "2025-12-20",
    "to": "2026-01-05"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Holidays"}
      subtitle={"National and school holiday calendar."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'name', header: 'Holiday', render: (row) => String(row.name ?? '') },
          { key: 'from', header: 'From', render: (row) => String(row.from ?? '') },
          { key: 'to', header: 'To', render: (row) => String(row.to ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

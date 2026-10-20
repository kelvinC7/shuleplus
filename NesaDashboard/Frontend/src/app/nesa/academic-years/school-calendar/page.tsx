'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Events",
    "value": "48"
  },
  {
    "label": "Terms",
    "value": "3"
  },
  {
    "label": "Holidays",
    "value": "14"
  },
  {
    "label": "Exams",
    "value": "6"
  }
] as const;

const FILTERS = [
  {
    "label": "Month",
    "options": [
      "A",
      "B",
      "C"
    ]
  }
];

const ROWS: Record<string, unknown>[] = [
  {
    "event": "Term 1 start",
    "date": "2025-09-01",
    "type": "Term"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"School Calendar"}
      subtitle={"Consolidated school calendar view."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'event', header: 'Event', render: (row) => String(row.event ?? '') },
          { key: 'date', header: 'Date', render: (row) => String(row.date ?? '') },
          { key: 'type', header: 'Type', render: (row) => String(row.type ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

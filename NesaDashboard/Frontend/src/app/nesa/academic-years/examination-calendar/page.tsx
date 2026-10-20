'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Windows",
    "value": "6"
  },
  {
    "label": "Upcoming",
    "value": "2"
  },
  {
    "label": "In progress",
    "value": "0"
  },
  {
    "label": "Completed",
    "value": "4"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "exam": "Primary Leavers",
    "window": "Jun 2026",
    "status": "Scheduled"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Examination Calendar"}
      subtitle={"National examination windows."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'exam', header: 'Exam', render: (row) => String(row.exam ?? '') },
          { key: 'window', header: 'Window', render: (row) => String(row.window ?? '') },
          { key: 'status', header: 'Status', render: (row) => String(row.status ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

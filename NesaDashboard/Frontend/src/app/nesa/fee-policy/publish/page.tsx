'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Ready",
    "value": "4"
  },
  {
    "label": "Scheduled",
    "value": "2"
  },
  {
    "label": "Published YTD",
    "value": "11"
  },
  {
    "label": "Rollbacks",
    "value": "1"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "policy": "FP-2026-08",
    "window": "01 Aug 2026",
    "status": "Ready"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Publish Policy"}
      subtitle={"Release approved fee policies nationally."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'policy', header: 'Policy', render: (row) => String(row.policy ?? '') },
          { key: 'window', header: 'Window', render: (row) => String(row.window ?? '') },
          { key: 'status', header: 'Status', render: (row) => String(row.status ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

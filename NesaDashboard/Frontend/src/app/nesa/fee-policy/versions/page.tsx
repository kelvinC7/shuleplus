'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Versions",
    "value": "128"
  },
  {
    "label": "Active",
    "value": "36"
  },
  {
    "label": "Superseded",
    "value": "71"
  },
  {
    "label": "Draft",
    "value": "21"
  }
] as const;

const FILTERS = [
  {
    "label": "Policy",
    "options": [
      "A",
      "B",
      "C"
    ]
  }
];

const ROWS: Record<string, unknown>[] = [
  {
    "policy": "FP-2026-01",
    "version": "v3",
    "status": "Active"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Policy Versions"}
      subtitle={"Version history for fee policies."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'policy', header: 'Policy', render: (row) => String(row.policy ?? '') },
          { key: 'version', header: 'Version', render: (row) => String(row.version ?? '') },
          { key: 'status', header: 'Status', render: (row) => String(row.status ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

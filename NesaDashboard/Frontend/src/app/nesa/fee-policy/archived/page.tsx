'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Archived",
    "value": "21"
  },
  {
    "label": "This year",
    "value": "6"
  },
  {
    "label": "Restorable",
    "value": "18"
  },
  {
    "label": "Locked",
    "value": "3"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "policy": "FP-2024-02",
    "archived": "2025-01-12",
    "reason": "Superseded"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Archived Policies"}
      subtitle={"Retired fee policies retained for audit."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'policy', header: 'Policy', render: (row) => String(row.policy ?? '') },
          { key: 'archived', header: 'Archived', render: (row) => String(row.archived ?? '') },
          { key: 'reason', header: 'Reason', render: (row) => String(row.reason ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

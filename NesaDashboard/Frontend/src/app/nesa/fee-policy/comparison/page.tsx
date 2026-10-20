'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Comparisons",
    "value": "18"
  },
  {
    "label": "Delta items",
    "value": "64"
  },
  {
    "label": "Increases",
    "value": "22"
  },
  {
    "label": "Decreases",
    "value": "11"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "field": "Tuition P4",
    "v1": "45,000",
    "v2": "48,000"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Policy Comparison"}
      subtitle={"Compare fee policy versions side by side."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'field', header: 'Line', render: (row) => String(row.field ?? '') },
          { key: 'v1', header: 'Version A', render: (row) => String(row.v1 ?? '') },
          { key: 'v2', header: 'Version B', render: (row) => String(row.v2 ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

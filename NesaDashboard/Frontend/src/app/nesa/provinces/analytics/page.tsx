'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Index",
    "value": "81"
  },
  {
    "label": "Throughput",
    "value": "76"
  },
  {
    "label": "Compliance",
    "value": "89"
  },
  {
    "label": "Risk",
    "value": "12"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "metric": "Approval speed",
    "value": "4.2 days"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Province Analytics"}
      subtitle={"Provincial charts and benchmarks."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'metric', header: 'Metric', render: (row) => String(row.metric ?? '') },
          { key: 'value', header: 'Value', render: (row) => String(row.value ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

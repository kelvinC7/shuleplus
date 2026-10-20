'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Index",
    "value": "74"
  },
  {
    "label": "Visits",
    "value": "612"
  },
  {
    "label": "Circular SLA",
    "value": "88%"
  },
  {
    "label": "Risk sectors",
    "value": "19"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "metric": "Visit coverage",
    "value": "61%"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Sector Analytics"}
      subtitle={"Sector analytics and trend lines."}
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

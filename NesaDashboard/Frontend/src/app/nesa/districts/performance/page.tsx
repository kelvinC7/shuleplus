'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Avg score",
    "value": "79"
  },
  {
    "label": "Top",
    "value": "6"
  },
  {
    "label": "Watch",
    "value": "5"
  },
  {
    "label": "Critical",
    "value": "2"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "district": "Gasabo",
    "score": "91",
    "trend": "+3"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"District Performance"}
      subtitle={"District performance scorecards."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'district', header: 'District', render: (row) => String(row.district ?? '') },
          { key: 'score', header: 'Score', render: (row) => String(row.score ?? '') },
          { key: 'trend', header: 'Trend', render: (row) => String(row.trend ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

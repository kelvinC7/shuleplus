'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Ranked",
    "value": "5"
  },
  {
    "label": "Above target",
    "value": "3"
  },
  {
    "label": "On track",
    "value": "1"
  },
  {
    "label": "Behind",
    "value": "1"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "province": "Kigali",
    "score": "92",
    "rank": "1"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Province Performance"}
      subtitle={"Provincial KPIs and rankings."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'province', header: 'Province', render: (row) => String(row.province ?? '') },
          { key: 'score', header: 'Score', render: (row) => String(row.score ?? '') },
          { key: 'rank', header: 'Rank', render: (row) => String(row.rank ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

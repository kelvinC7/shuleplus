'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Compliant",
    "value": "3,812"
  },
  {
    "label": "At risk",
    "value": "261"
  },
  {
    "label": "Breaches",
    "value": "145"
  },
  {
    "label": "Audits",
    "value": "38"
  }
] as const;

const FILTERS = [
  {
    "label": "Province",
    "options": [
      "A",
      "B",
      "C"
    ]
  }
];

const ROWS: Record<string, unknown>[] = [
  {
    "school": "GS Nyamagabe",
    "score": "62%",
    "flag": "Cap breach"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Compliance Monitoring"}
      subtitle={"Track school adherence to live fee policies."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'school', header: 'School', render: (row) => String(row.school ?? '') },
          { key: 'score', header: 'Score', render: (row) => String(row.score ?? '') },
          { key: 'flag', header: 'Flag', render: (row) => String(row.flag ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

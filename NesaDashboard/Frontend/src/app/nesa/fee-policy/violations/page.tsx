'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Open",
    "value": "14"
  },
  {
    "label": "Investigating",
    "value": "6"
  },
  {
    "label": "Resolved",
    "value": "41"
  },
  {
    "label": "Escalated",
    "value": "3"
  }
] as const;

const FILTERS = [
  {
    "label": "Severity",
    "options": [
      "A",
      "B",
      "C"
    ]
  }
];

const ROWS: Record<string, unknown>[] = [
  {
    "case": "VL-019",
    "school": "GS Nyamagabe",
    "severity": "High"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Fee Violations"}
      subtitle={"Detected fee policy violations."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'case', header: 'Case', render: (row) => String(row.case ?? '') },
          { key: 'school', header: 'School', render: (row) => String(row.school ?? '') },
          { key: 'severity', header: 'Severity', render: (row) => String(row.severity ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

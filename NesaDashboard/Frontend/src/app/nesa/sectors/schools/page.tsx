'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Schools",
    "value": "4,218"
  },
  {
    "label": "Visited 30d",
    "value": "612"
  },
  {
    "label": "Flags",
    "value": "44"
  },
  {
    "label": "Compliant",
    "value": "3,901"
  }
] as const;

const FILTERS = [
  {
    "label": "Sector",
    "options": [
      "A",
      "B",
      "C"
    ]
  }
];

const ROWS: Record<string, unknown>[] = [
  {
    "school": "GS Kacyiru",
    "sector": "Kacyiru",
    "flag": "None"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Sector Schools"}
      subtitle={"Schools under sector supervision."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'school', header: 'School', render: (row) => String(row.school ?? '') },
          { key: 'sector', header: 'Sector', render: (row) => String(row.sector ?? '') },
          { key: 'flag', header: 'Flag', render: (row) => String(row.flag ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Schools",
    "value": "4,218"
  },
  {
    "label": "Public",
    "value": "2,641"
  },
  {
    "label": "Private",
    "value": "1,102"
  },
  {
    "label": "Aided",
    "value": "475"
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
    "school": "GS Kacyiru",
    "province": "Kigali",
    "category": "Public"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Province Schools"}
      subtitle={"Schools under provincial supervision."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'school', header: 'School', render: (row) => String(row.school ?? '') },
          { key: 'province', header: 'Province', render: (row) => String(row.province ?? '') },
          { key: 'category', header: 'Category', render: (row) => String(row.category ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

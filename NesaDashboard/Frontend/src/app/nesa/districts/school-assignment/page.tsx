'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Assigned",
    "value": "4,102"
  },
  {
    "label": "Unassigned",
    "value": "116"
  },
  {
    "label": "Officers",
    "value": "90"
  },
  {
    "label": "Conflicts",
    "value": "3"
  }
] as const;

const FILTERS = [
  {
    "label": "District",
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
    "district": "Gasabo",
    "officer": "J. Uwase"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"School Assignment"}
      subtitle={"Map schools to district officers."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'school', header: 'School', render: (row) => String(row.school ?? '') },
          { key: 'district', header: 'District', render: (row) => String(row.district ?? '') },
          { key: 'officer', header: 'Officer', render: (row) => String(row.officer ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

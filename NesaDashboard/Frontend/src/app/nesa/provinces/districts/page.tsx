'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Districts",
    "value": "30"
  },
  {
    "label": "Mapped",
    "value": "30"
  },
  {
    "label": "Unassigned",
    "value": "0"
  },
  {
    "label": "Officers",
    "value": "90"
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
    "district": "Gasabo",
    "province": "Kigali",
    "officer": "J. Uwase"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Province Districts"}
      subtitle={"Districts belonging to a province."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'district', header: 'District', render: (row) => String(row.district ?? '') },
          { key: 'province', header: 'Province', render: (row) => String(row.province ?? '') },
          { key: 'officer', header: 'Officer', render: (row) => String(row.officer ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

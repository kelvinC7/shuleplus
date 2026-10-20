'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Assigned",
    "value": "380"
  },
  {
    "label": "Vacant",
    "value": "15"
  },
  {
    "label": "Acting",
    "value": "21"
  },
  {
    "label": "New",
    "value": "6"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "officer": "P. Habimana",
    "sector": "Kacyiru",
    "status": "Active"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Officer Assignment"}
      subtitle={"Assign sector officers."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'officer', header: 'Officer', render: (row) => String(row.officer ?? '') },
          { key: 'sector', header: 'Sector', render: (row) => String(row.sector ?? '') },
          { key: 'status', header: 'Status', render: (row) => String(row.status ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

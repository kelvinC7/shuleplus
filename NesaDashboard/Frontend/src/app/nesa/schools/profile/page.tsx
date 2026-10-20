'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Profiles",
    "value": "4,218"
  },
  {
    "label": "Verified",
    "value": "3,980"
  },
  {
    "label": "Incomplete",
    "value": "148"
  },
  {
    "label": "Flagged",
    "value": "90"
  }
] as const;

const FILTERS = [
  {
    "label": "Status",
    "options": [
      "A",
      "B",
      "C"
    ]
  }
];

const ROWS: Record<string, unknown>[] = [
  {
    "field": "Legal name",
    "value": "GS Kacyiru"
  },
  {
    "field": "Ownership",
    "value": "Public"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"School Profile"}
      subtitle={"Registration profile synced from IAM."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'field', header: 'Field', render: (row) => String(row.field ?? '') },
          { key: 'value', header: 'Value', render: (row) => String(row.value ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}

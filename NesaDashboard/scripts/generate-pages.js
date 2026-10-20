const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'Frontend', 'src', 'app');

const approvalStatuses = {
  '/nesa/approvals/pending': 'pending',
  '/nesa/approvals/under-review': 'under-review',
  '/nesa/approvals/returned': 'returned',
  '/nesa/approvals/approved': 'approved',
  '/nesa/approvals/rejected': 'rejected',
};

/** @type {Array<[string, string, string, Array<{label:string,value:string}>, string[], Record<string,string>[], Array<{key:string,header:string}>]>} */
const pages = [
  ['/nesa/schools', 'Schools', 'Browse and manage registered schools across the country.', [{ label: 'Schools', value: '4,218' }, { label: 'Public', value: '2,641' }, { label: 'Private', value: '1,102' }, { label: 'Pending', value: '47' }], ['Province', 'District', 'Category'], [{ name: 'GS Kacyiru', code: 'SCH-001', province: 'Kigali', status: 'Active' }, { name: 'ES Remera', code: 'SCH-014', province: 'Kigali', status: 'Review' }], [{ key: 'name', header: 'School' }, { key: 'code', header: 'Code' }, { key: 'province', header: 'Province' }, { key: 'status', header: 'Status' }]],
  ['/nesa/schools/details', 'School Details', 'Detailed dossier for a selected school.', [{ label: 'Learners', value: '1,240' }, { label: 'Teachers', value: '68' }, { label: 'Circulars', value: '24' }, { label: 'Compliance', value: '96%' }], ['Academic Year'], [{ metric: 'Enrollment', value: '1,240' }, { metric: 'Fee compliance', value: '96%' }], [{ key: 'metric', header: 'Metric' }, { key: 'value', header: 'Value' }]],
  ['/nesa/schools/profile', 'School Profile', 'Registration profile synced from IAM.', [{ label: 'Profiles', value: '4,218' }, { label: 'Verified', value: '3,980' }, { label: 'Incomplete', value: '148' }, { label: 'Flagged', value: '90' }], ['Status'], [{ field: 'Legal name', value: 'GS Kacyiru' }, { field: 'Ownership', value: 'Public' }], [{ key: 'field', header: 'Field' }, { key: 'value', header: 'Value' }]],
  ['/nesa/schools/circulars', 'School Circulars', 'Circulars issued by school.', [{ label: 'Published', value: '812' }, { label: 'Pending', value: '54' }, { label: 'Draft', value: '102' }, { label: 'Rejected', value: '18' }], ['Status', 'Term'], [{ circular: 'P4 Term 1', school: 'GS Kacyiru', status: 'Published' }], [{ key: 'circular', header: 'Circular' }, { key: 'school', header: 'School' }, { key: 'status', header: 'Status' }]],
  ['/nesa/schools/payments', 'School Payments', 'Fee payment activity monitored by NESA.', [{ label: 'Collected', value: '2.4B' }, { label: 'Outstanding', value: '180M' }, { label: 'Channels', value: '12' }, { label: 'Alerts', value: '9' }], ['Province'], [{ school: 'GS Kacyiru', amount: '12,400,000', status: 'Cleared' }], [{ key: 'school', header: 'School' }, { key: 'amount', header: 'Amount (RWF)' }, { key: 'status', header: 'Status' }]],
  ['/nesa/schools/analytics', 'School Analytics', 'School-level performance indicators.', [{ label: 'Avg score', value: '78' }, { label: 'Top quartile', value: '22%' }, { label: 'At risk', value: '146' }, { label: 'Improved', value: '310' }], ['Province'], [{ school: 'GS Kacyiru', index: '88', trend: '+4' }], [{ key: 'school', header: 'School' }, { key: 'index', header: 'Index' }, { key: 'trend', header: 'Trend' }]],
  ['/nesa/circulars', 'Circulars Dashboard', 'National circular registry overview.', [{ label: 'Total', value: '1,094' }, { label: 'Awaiting approval', value: '87' }, { label: 'Published', value: '812' }, { label: 'Violations', value: '11' }], ['Status'], [{ id: 'BE-8841', school: 'GS Kacyiru', status: 'Under review' }], [{ key: 'id', header: 'Circular' }, { key: 'school', header: 'School' }, { key: 'status', header: 'Status' }]],
  ['/nesa/circulars/list', 'Circular List', 'All submitted school circulars.', [{ label: 'Listed', value: '1,094' }, { label: 'This week', value: '64' }, { label: 'Over NESA', value: '19' }, { label: 'Archived', value: '220' }], ['Year', 'Status'], [{ id: 'BE-8841', class: 'P4', fee: '85,000' }], [{ key: 'id', header: 'ID' }, { key: 'class', header: 'Class' }, { key: 'fee', header: 'Total fee' }]],
  ['/nesa/circulars/details', 'Circular Details', 'Inspect a single circular package.', [{ label: 'Payments', value: '6' }, { label: 'Requirements', value: '8' }, { label: 'Banks', value: '2' }, { label: 'Scans', value: '412' }], [], [{ section: 'Payments', count: '6' }], [{ key: 'section', header: 'Section' }, { key: 'count', header: 'Count' }]],
  ['/nesa/circulars/approval', 'Circular Approval', 'Circulars requested by schools awaiting action.', [{ label: 'Queue', value: '87' }, { label: 'District', value: '41' }, { label: 'Province', value: '28' }, { label: 'NESA', value: '18' }], ['Stage'], [{ id: 'BE-8841', school: 'GS Kacyiru', stage: 'District' }], [{ key: 'id', header: 'Circular' }, { key: 'school', header: 'School' }, { key: 'stage', header: 'Stage' }]],
  ['/nesa/fee-policy', 'Fee Policy', 'Manage national fee policies and compliance.', [{ label: 'Live', value: '36' }, { label: 'Drafts', value: '9' }, { label: 'Violations', value: '14' }, { label: 'Archived', value: '21' }], ['Year'], [{ name: 'National Primary Cap 2026', code: 'FP-2026-01', status: 'Live' }], [{ key: 'name', header: 'Policy' }, { key: 'code', header: 'Code' }, { key: 'status', header: 'Status' }]],
  ['/nesa/fee-policy/versions', 'Policy Versions', 'Version history for fee policies.', [{ label: 'Versions', value: '128' }, { label: 'Active', value: '36' }, { label: 'Superseded', value: '71' }, { label: 'Draft', value: '21' }], ['Policy'], [{ policy: 'FP-2026-01', version: 'v3', status: 'Active' }], [{ key: 'policy', header: 'Policy' }, { key: 'version', header: 'Version' }, { key: 'status', header: 'Status' }]],
  ['/nesa/fee-policy/comparison', 'Policy Comparison', 'Compare fee policy versions side by side.', [{ label: 'Comparisons', value: '18' }, { label: 'Delta items', value: '64' }, { label: 'Increases', value: '22' }, { label: 'Decreases', value: '11' }], [], [{ field: 'Tuition P4', v1: '45,000', v2: '48,000' }], [{ key: 'field', header: 'Line' }, { key: 'v1', header: 'Version A' }, { key: 'v2', header: 'Version B' }]],
  ['/nesa/fee-policy/publish', 'Publish Policy', 'Release approved fee policies nationally.', [{ label: 'Ready', value: '4' }, { label: 'Scheduled', value: '2' }, { label: 'Published YTD', value: '11' }, { label: 'Rollbacks', value: '1' }], [], [{ policy: 'FP-2026-08', window: '01 Aug 2026', status: 'Ready' }], [{ key: 'policy', header: 'Policy' }, { key: 'window', header: 'Window' }, { key: 'status', header: 'Status' }]],
  ['/nesa/fee-policy/archived', 'Archived Policies', 'Retired fee policies retained for audit.', [{ label: 'Archived', value: '21' }, { label: 'This year', value: '6' }, { label: 'Restorable', value: '18' }, { label: 'Locked', value: '3' }], [], [{ policy: 'FP-2024-02', archived: '2025-01-12', reason: 'Superseded' }], [{ key: 'policy', header: 'Policy' }, { key: 'archived', header: 'Archived' }, { key: 'reason', header: 'Reason' }]],
  ['/nesa/fee-policy/compliance', 'Compliance Monitoring', 'Track school adherence to live fee policies.', [{ label: 'Compliant', value: '3,812' }, { label: 'At risk', value: '261' }, { label: 'Breaches', value: '145' }, { label: 'Audits', value: '38' }], ['Province'], [{ school: 'GS Nyamagabe', score: '62%', flag: 'Cap breach' }], [{ key: 'school', header: 'School' }, { key: 'score', header: 'Score' }, { key: 'flag', header: 'Flag' }]],
  ['/nesa/fee-policy/violations', 'Fee Violations', 'Detected fee policy violations.', [{ label: 'Open', value: '14' }, { label: 'Investigating', value: '6' }, { label: 'Resolved', value: '41' }, { label: 'Escalated', value: '3' }], ['Severity'], [{ case: 'VL-019', school: 'GS Nyamagabe', severity: 'High' }], [{ key: 'case', header: 'Case' }, { key: 'school', header: 'School' }, { key: 'severity', header: 'Severity' }]],
  ['/nesa/approvals', 'Approval Center', 'Cross-module inbox for policies, circulars and registrations.', [{ label: 'Pending', value: '42' }, { label: 'Under review', value: '19' }, { label: 'Returned', value: '8' }, { label: 'Approved today', value: '11' }], [], [{ item: 'Fee Policy Draft B', module: 'Fee Policy', status: 'Pending' }], [{ key: 'item', header: 'Item' }, { key: 'module', header: 'Module' }, { key: 'status', header: 'Status' }]],
  ['/nesa/provinces', 'Provinces', 'Provincial management overview.', [{ label: 'Provinces', value: '5' }, { label: 'Districts', value: '30' }, { label: 'Schools', value: '4,218' }, { label: 'Officers', value: '48' }], [], [{ province: 'Kigali', districts: '3', schools: '612' }], [{ key: 'province', header: 'Province' }, { key: 'districts', header: 'Districts' }, { key: 'schools', header: 'Schools' }]],
  ['/nesa/provinces/list', 'Province List', 'All provinces with core metrics.', [{ label: 'Provinces', value: '5' }, { label: 'Active plans', value: '5' }, { label: 'Reports due', value: '2' }, { label: 'Alerts', value: '4' }], [], [{ name: 'Kigali City', code: 'PROV-01', status: 'Active' }], [{ key: 'name', header: 'Province' }, { key: 'code', header: 'Code' }, { key: 'status', header: 'Status' }]],
  ['/nesa/provinces/details', 'Province Details', 'Deep dive into a single province.', [{ label: 'Schools', value: '612' }, { label: 'Circulars', value: '198' }, { label: 'Compliance', value: '94%' }, { label: 'Officers', value: '9' }], [], [{ district: 'Gasabo', schools: '210' }], [{ key: 'district', header: 'District' }, { key: 'schools', header: 'Schools' }]],
  ['/nesa/provinces/districts', 'Province Districts', 'Districts belonging to a province.', [{ label: 'Districts', value: '30' }, { label: 'Mapped', value: '30' }, { label: 'Unassigned', value: '0' }, { label: 'Officers', value: '90' }], ['Province'], [{ district: 'Gasabo', province: 'Kigali', officer: 'J. Uwase' }], [{ key: 'district', header: 'District' }, { key: 'province', header: 'Province' }, { key: 'officer', header: 'Officer' }]],
  ['/nesa/provinces/schools', 'Province Schools', 'Schools under provincial supervision.', [{ label: 'Schools', value: '4,218' }, { label: 'Public', value: '2,641' }, { label: 'Private', value: '1,102' }, { label: 'Aided', value: '475' }], ['Province'], [{ school: 'GS Kacyiru', province: 'Kigali', category: 'Public' }], [{ key: 'school', header: 'School' }, { key: 'province', header: 'Province' }, { key: 'category', header: 'Category' }]],
  ['/nesa/provinces/analytics', 'Province Analytics', 'Provincial charts and benchmarks.', [{ label: 'Index', value: '81' }, { label: 'Throughput', value: '76' }, { label: 'Compliance', value: '89' }, { label: 'Risk', value: '12' }], [], [{ metric: 'Approval speed', value: '4.2 days' }], [{ key: 'metric', header: 'Metric' }, { key: 'value', header: 'Value' }]],
  ['/nesa/provinces/performance', 'Province Performance', 'Provincial KPIs and rankings.', [{ label: 'Ranked', value: '5' }, { label: 'Above target', value: '3' }, { label: 'On track', value: '1' }, { label: 'Behind', value: '1' }], [], [{ province: 'Kigali', score: '92', rank: '1' }], [{ key: 'province', header: 'Province' }, { key: 'score', header: 'Score' }, { key: 'rank', header: 'Rank' }]],
  ['/nesa/provinces/reports', 'Province Reports', 'Downloadable provincial reports.', [{ label: 'Reports', value: '24' }, { label: 'This month', value: '4' }, { label: 'Scheduled', value: '2' }, { label: 'Shared', value: '11' }], [], [{ name: 'East Compliance Pack', period: 'July 2026' }], [{ key: 'name', header: 'Report' }, { key: 'period', header: 'Period' }]],
  ['/nesa/districts', 'District Offices', 'District office coordination dashboard.', [{ label: 'Districts', value: '30' }, { label: 'Officers', value: '90' }, { label: 'Schools', value: '4,218' }, { label: 'Open tasks', value: '63' }], [], [{ district: 'Gasabo', schools: '210', status: 'On track' }], [{ key: 'district', header: 'District' }, { key: 'schools', header: 'Schools' }, { key: 'status', header: 'Status' }]],
  ['/nesa/districts/list', 'District List', 'All district offices.', [{ label: 'Districts', value: '30' }, { label: 'With officer', value: '28' }, { label: 'Vacant', value: '2' }, { label: 'Alerts', value: '7' }], ['Province'], [{ name: 'Gasabo', province: 'Kigali', officer: 'Assigned' }], [{ key: 'name', header: 'District' }, { key: 'province', header: 'Province' }, { key: 'officer', header: 'Officer' }]],
  ['/nesa/districts/officers', 'Officer Management', 'Assign and manage district officers.', [{ label: 'Officers', value: '90' }, { label: 'Active', value: '84' }, { label: 'Leave', value: '4' }, { label: 'Vacant posts', value: '2' }], [], [{ name: 'Jeanne Uwase', district: 'Gasabo', role: 'District Officer' }], [{ key: 'name', header: 'Officer' }, { key: 'district', header: 'District' }, { key: 'role', header: 'Role' }]],
  ['/nesa/districts/school-assignment', 'School Assignment', 'Map schools to district officers.', [{ label: 'Assigned', value: '4,102' }, { label: 'Unassigned', value: '116' }, { label: 'Officers', value: '90' }, { label: 'Conflicts', value: '3' }], ['District'], [{ school: 'GS Kacyiru', district: 'Gasabo', officer: 'J. Uwase' }], [{ key: 'school', header: 'School' }, { key: 'district', header: 'District' }, { key: 'officer', header: 'Officer' }]],
  ['/nesa/districts/performance', 'District Performance', 'District performance scorecards.', [{ label: 'Avg score', value: '79' }, { label: 'Top', value: '6' }, { label: 'Watch', value: '5' }, { label: 'Critical', value: '2' }], [], [{ district: 'Gasabo', score: '91', trend: '+3' }], [{ key: 'district', header: 'District' }, { key: 'score', header: 'Score' }, { key: 'trend', header: 'Trend' }]],
  ['/nesa/districts/reports', 'District Reports', 'Operational reports for districts.', [{ label: 'Reports', value: '40' }, { label: 'Due', value: '5' }, { label: 'Submitted', value: '31' }, { label: 'Overdue', value: '4' }], [], [{ name: 'Gasabo Weekly Pack', status: 'Submitted' }], [{ key: 'name', header: 'Report' }, { key: 'status', header: 'Status' }]],
  ['/nesa/sectors', 'Sector Offices', 'Sector-level monitoring dashboard.', [{ label: 'Sectors', value: '416' }, { label: 'Officers', value: '380' }, { label: 'Schools', value: '4,218' }, { label: 'Open cases', value: '55' }], [], [{ sector: 'Kacyiru', schools: '18', status: 'Healthy' }], [{ key: 'sector', header: 'Sector' }, { key: 'schools', header: 'Schools' }, { key: 'status', header: 'Status' }]],
  ['/nesa/sectors/list', 'Sector List', 'All sectors with mapping status.', [{ label: 'Sectors', value: '416' }, { label: 'Mapped', value: '401' }, { label: 'Vacant', value: '15' }, { label: 'Alerts', value: '12' }], ['District'], [{ name: 'Kacyiru', district: 'Gasabo', officer: 'Assigned' }], [{ key: 'name', header: 'Sector' }, { key: 'district', header: 'District' }, { key: 'officer', header: 'Officer' }]],
  ['/nesa/sectors/officer-assignment', 'Officer Assignment', 'Assign sector officers.', [{ label: 'Assigned', value: '380' }, { label: 'Vacant', value: '15' }, { label: 'Acting', value: '21' }, { label: 'New', value: '6' }], [], [{ officer: 'P. Habimana', sector: 'Kacyiru', status: 'Active' }], [{ key: 'officer', header: 'Officer' }, { key: 'sector', header: 'Sector' }, { key: 'status', header: 'Status' }]],
  ['/nesa/sectors/schools', 'Sector Schools', 'Schools under sector supervision.', [{ label: 'Schools', value: '4,218' }, { label: 'Visited 30d', value: '612' }, { label: 'Flags', value: '44' }, { label: 'Compliant', value: '3,901' }], ['Sector'], [{ school: 'GS Kacyiru', sector: 'Kacyiru', flag: 'None' }], [{ key: 'school', header: 'School' }, { key: 'sector', header: 'Sector' }, { key: 'flag', header: 'Flag' }]],
  ['/nesa/sectors/circular-monitoring', 'Circular Monitoring', 'Monitor circular issuance at sector level.', [{ label: 'Tracked', value: '1,094' }, { label: 'Late', value: '27' }, { label: 'Compliant', value: '1,010' }, { label: 'Escalated', value: '9' }], [], [{ circular: 'BE-8841', sector: 'Kacyiru', state: 'On time' }], [{ key: 'circular', header: 'Circular' }, { key: 'sector', header: 'Sector' }, { key: 'state', header: 'State' }]],
  ['/nesa/sectors/analytics', 'Sector Analytics', 'Sector analytics and trend lines.', [{ label: 'Index', value: '74' }, { label: 'Visits', value: '612' }, { label: 'Circular SLA', value: '88%' }, { label: 'Risk sectors', value: '19' }], [], [{ metric: 'Visit coverage', value: '61%' }], [{ key: 'metric', header: 'Metric' }, { key: 'value', header: 'Value' }]],
  ['/nesa/academic-years', 'Academic Years', 'National academic calendar governance.', [{ label: 'Active year', value: '2025-26' }, { label: 'Terms', value: '3' }, { label: 'Holidays', value: '14' }, { label: 'Exam windows', value: '6' }], [], [{ year: '2025-2026', status: 'Active' }], [{ key: 'year', header: 'Year' }, { key: 'status', header: 'Status' }]],
  ['/nesa/academic-years/years', 'Academic Years List', 'Define and manage academic years.', [{ label: 'Years', value: '8' }, { label: 'Active', value: '1' }, { label: 'Planned', value: '1' }, { label: 'Closed', value: '6' }], [], [{ year: '2025-2026', start: '2025-09-01', end: '2026-07-31' }], [{ key: 'year', header: 'Year' }, { key: 'start', header: 'Start' }, { key: 'end', header: 'End' }]],
  ['/nesa/academic-years/terms', 'Terms', 'Term windows within academic years.', [{ label: 'Terms', value: '24' }, { label: 'Current', value: 'Term 1' }, { label: 'Upcoming', value: 'Term 2' }, { label: 'Closed', value: '21' }], ['Year'], [{ term: 'Term 1', year: '2025-2026', window: 'Sep–Dec' }], [{ key: 'term', header: 'Term' }, { key: 'year', header: 'Year' }, { key: 'window', header: 'Window' }]],
  ['/nesa/academic-years/holidays', 'Holidays', 'National and school holiday calendar.', [{ label: 'Holidays', value: '14' }, { label: 'National', value: '9' }, { label: 'Religious', value: '3' }, { label: 'Breaks', value: '2' }], ['Year'], [{ name: 'Christmas Break', from: '2025-12-20', to: '2026-01-05' }], [{ key: 'name', header: 'Holiday' }, { key: 'from', header: 'From' }, { key: 'to', header: 'To' }]],
  ['/nesa/academic-years/examination-calendar', 'Examination Calendar', 'National examination windows.', [{ label: 'Windows', value: '6' }, { label: 'Upcoming', value: '2' }, { label: 'In progress', value: '0' }, { label: 'Completed', value: '4' }], [], [{ exam: 'Primary Leavers', window: 'Jun 2026', status: 'Scheduled' }], [{ key: 'exam', header: 'Exam' }, { key: 'window', header: 'Window' }, { key: 'status', header: 'Status' }]],
  ['/nesa/academic-years/school-calendar', 'School Calendar', 'Consolidated school calendar view.', [{ label: 'Events', value: '48' }, { label: 'Terms', value: '3' }, { label: 'Holidays', value: '14' }, { label: 'Exams', value: '6' }], ['Month'], [{ event: 'Term 1 start', date: '2025-09-01', type: 'Term' }], [{ key: 'event', header: 'Event' }, { key: 'date', header: 'Date' }, { key: 'type', header: 'Type' }]],
];

for (const [route, title, subtitle, kpis, filters, rows, columns] of pages) {
  const full = path.join(root, ...route.replace(/^\//, '').split('/'));
  fs.mkdirSync(full, { recursive: true });
  const colsSrc = columns
    .map((c) => `{ key: '${c.key}', header: '${c.header}', render: (row) => String(row.${c.key} ?? '') }`)
    .join(',\n          ');
  const content = `'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = ${JSON.stringify(kpis, null, 2)} as const;

const FILTERS = ${JSON.stringify(
    filters.map((f) => ({ label: f, options: ['A', 'B', 'C'] })),
    null,
    2
  )};

const ROWS: Record<string, unknown>[] = ${JSON.stringify(rows, null, 2)};

export default function Page() {
  return (
    <ModuleScaffold
      title={${JSON.stringify(title)}}
      subtitle={${JSON.stringify(subtitle)}}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          ${colsSrc}
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}
`;
  fs.writeFileSync(path.join(full, 'page.tsx'), content);
}

for (const [route, status] of Object.entries(approvalStatuses)) {
  const full = path.join(root, ...route.replace(/^\//, '').split('/'));
  fs.mkdirSync(full, { recursive: true });
  const title = status
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
  const content = `'use client';

import { ModulePage } from '@/components/ui/module-page';
import { ApprovalQueueTable } from '@/components/ui/approval-queue-table';

export default function Page() {
  return (
    <ModulePage
      title={${JSON.stringify(title)}}
      subtitle="Cross-module approval queue filtered by status."
    >
      <ApprovalQueueTable status="${status}" />
    </ModulePage>
  );
}
`;
  fs.writeFileSync(path.join(full, 'page.tsx'), content);
}

console.log('Wrote', pages.length + Object.keys(approvalStatuses).length, 'pages');

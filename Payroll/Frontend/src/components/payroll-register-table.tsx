'use client';

export function PayrollRegisterTable({
  rows,
  onRowClick,
}: {
  rows: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
}) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center text-sm text-muted">No register rows</div>;
  }
  const cols = ['employeeNumber', 'employeeName', 'department', 'basicSalary', 'others', 'housing', 'transport', 'gross', 'paye', 'rssbEmployee', 'netSalary', 'finalPayable'];
  const labels: Record<string, string> = {
    employeeNumber: 'ID', employeeName: 'Employee', department: 'Dept', basicSalary: 'Basic',
    others: 'Others', housing: 'H/A', transport: 'T/A', gross: 'Gross', paye: 'PAYE',
    rssbEmployee: 'RSSB', netSalary: 'Net', finalPayable: 'Payable',
  };
  return (
    <div className="hr-card overflow-hidden">
      <table className="min-w-[1100px] w-full text-xs">
        <thead className="bg-slate-50 text-left uppercase tracking-wide text-muted">
          <tr>{cols.map((c) => <th key={c} className="px-3 py-3">{labels[c] ?? c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-t border-slate-100 hover:bg-amber/5 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(r)}
            >
              {cols.map((c) => (
                <td key={c} className="px-3 py-2.5 font-medium text-navy">
                  {typeof r[c] === 'number' ? (r[c] as number).toLocaleString() : String(r[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-navy/10 bg-navy/[0.02] font-bold">
          <tr>
            <td colSpan={7} className="px-3 py-3 text-right uppercase text-[10px] tracking-wide text-muted">Totals</td>
            {['gross', 'paye', 'rssbEmployee', 'netSalary', 'finalPayable'].map((c) => (
              <td key={c} className="px-3 py-3 text-amber-700">
                {rows.reduce((s, r) => s + (Number(r[c]) || 0), 0).toLocaleString()}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

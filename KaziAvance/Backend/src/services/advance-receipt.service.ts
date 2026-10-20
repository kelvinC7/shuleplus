type ReceiptRepayment = {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  status: string;
  paidAt?: Date | null;
};

type ReceiptRequest = {
  requestNumber: string;
  amount: number;
  repaymentMonths: number;
  purpose: string;
  description?: string | null;
  status: string;
  monthlyDeduction?: number | null;
  remainingBalance?: number | null;
  createdAt: Date;
  approvedAt?: Date | null;
  disbursedAt?: Date | null;
  rejectedAt?: Date | null;
  reviewComment?: string | null;
  signatureFile?: string | null;
  employee: {
    fullName: string;
    employeeCode: string;
    department?: string | null;
    position?: string | null;
    email?: string | null;
    phone?: string | null;
    companyName?: string | null;
    employmentStatus?: string | null;
    creditScore?: number | null;
    netSalary?: number | null;
  };
  repayments?: ReceiptRepayment[];
};

export type ReceiptExtras = {
  availableLimit?: number;
  maxEligibleAmount?: number;
  utilizedPercent?: number;
  verifyUrl?: string;
  interestRate?: number;
};

function rwf(n: number) {
  return `${Math.round(n).toLocaleString("en-RW")} RWF`;
}

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(d?: Date | null) {
  if (!d) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

function txnRef(requestNumber: string) {
  let hash = 0;
  for (let i = 0; i < requestNumber.length; i++) hash = (hash * 31 + requestNumber.charCodeAt(i)) >>> 0;
  return `TXN-${String(hash).padStart(8, "0").slice(0, 8)}`;
}

function statusTone(status: string) {
  if (status === "Disbursed" || status === "Completed" || status === "Approved") {
    return { bg: "#059669", label: status.toUpperCase() };
  }
  if (status === "Rejected" || status === "Cancelled") {
    return { bg: "#dc2626", label: status.toUpperCase() };
  }
  return { bg: "#d97706", label: status.toUpperCase() };
}

export function buildAdvanceReceiptHtml(request: ReceiptRequest, extras: ReceiptExtras = {}) {
  const e = request.employee;
  const tone = statusTone(request.status);
  const ref = txnRef(request.requestNumber);
  const repayments = [...(request.repayments ?? [])].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );
  const paidCount = repayments.filter((r) => r.status === "Paid" || r.paidAt).length;
  const totalPaid = repayments
    .filter((r) => r.status === "Paid" || r.paidAt)
    .reduce((s, r) => s + r.amount, 0);
  const outstanding =
    request.remainingBalance ??
    Math.max(0, request.amount - totalPaid);
  const progress =
    request.amount > 0
      ? Math.min(100, Math.round(((request.amount - outstanding) / request.amount) * 100))
      : 0;
  const monthly = request.monthlyDeduction ?? (repayments[0]?.amount ?? 0);
  const installmentsLeft = Math.max(0, repayments.length - paidCount);
  const maxLimit = extras.maxEligibleAmount ?? 0;
  const available = extras.availableLimit ?? Math.max(0, maxLimit - outstanding);
  const utilized =
    extras.utilizedPercent ??
    (maxLimit > 0 ? Math.min(100, Math.round(((maxLimit - available) / maxLimit) * 100)) : progress);
  const interestRate = extras.interestRate ?? 0;
  const verifyUrl =
    extras.verifyUrl ??
    `https://kaziavance.verify/receipt/${encodeURIComponent(request.requestNumber)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`;

  const timeline = [
    { label: "Submitted", at: request.createdAt, done: true },
    { label: "HR Verified", at: request.approvedAt ?? request.createdAt, done: Boolean(request.approvedAt || request.disbursedAt) },
    { label: "Approved", at: request.approvedAt, done: Boolean(request.approvedAt || request.disbursedAt) },
    { label: "Finance Approved", at: request.approvedAt, done: Boolean(request.approvedAt || request.disbursedAt) },
    { label: "Disbursed", at: request.disbursedAt, done: Boolean(request.disbursedAt) },
  ];

  const scheduleRows =
    repayments.length > 0
      ? repayments
          .map((r) => {
            const st = r.status === "Paid" || r.paidAt ? "Paid" : r.status || "Pending";
            const badge =
              st === "Paid"
                ? "background:#d1fae5;color:#065f46"
                : "background:#fef3c7;color:#92400e";
            return `<tr>
              <td>${r.installmentNumber}</td>
              <td>${fmtDate(r.dueDate)}</td>
              <td style="font-weight:700">${rwf(r.amount)}</td>
              <td><span style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;${badge}">${st}</span></td>
            </tr>`;
          })
          .join("")
      : Array.from({ length: request.repaymentMonths }, (_, i) => {
          const due = new Date(request.disbursedAt ?? request.approvedAt ?? request.createdAt);
          due.setMonth(due.getMonth() + i + 1);
          return `<tr>
            <td>${i + 1}</td>
            <td>${fmtDate(due)}</td>
            <td style="font-weight:700">${rwf(monthly)}</td>
            <td><span style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:#fef3c7;color:#92400e">Pending</span></td>
          </tr>`;
        }).join("");

  const totalSchedule = repayments.length
    ? repayments.reduce((s, r) => s + r.amount, 0)
    : monthly * request.repaymentMonths;

  const timelineHtml = timeline
    .map((step, i) => {
      const dt = fmtDateTime(step.at);
      const color = step.done ? "#059669" : "#94a3b8";
      return `<div class="tl-step">
        <div class="tl-dot" style="background:${color}">${step.done ? "✓" : i + 1}</div>
        <div class="tl-body">
          <div class="tl-label">${step.label}</div>
          <div class="tl-meta">${dt.date}${dt.time ? ` · ${dt.time}` : ""}</div>
        </div>
        ${i < timeline.length - 1 ? `<div class="tl-line" style="background:${step.done ? "#059669" : "#e2e8f0"}"></div>` : ""}
      </div>`;
    })
    .join("");

  const gaugeDash = Math.round((utilized / 100) * 126);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Salary Advance Receipt — ${request.requestNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; background: #eef1f7; color: #000435; font-family: "Segoe UI", Inter, system-ui, sans-serif; }
    .page { max-width: 980px; margin: 0 auto; background: #fff; border-radius: 24px; padding: 28px 32px 36px; box-shadow: 0 18px 50px rgba(0,4,53,.08); }
    .header { display: grid; grid-template-columns: 1.1fr 1.2fr auto; gap: 16px; align-items: center; padding-bottom: 18px; border-bottom: 1px solid #e8ebf3; }
    .brand { display: flex; gap: 12px; align-items: center; }
    .logo { width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg,#000435,#1a1f5c); color: #fcb038; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; }
    .brand h1 { margin: 0; font-size: 20px; }
    .brand p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .title-block { text-align: center; }
    .title-block h2 { margin: 0; font-size: 18px; letter-spacing: .04em; }
    .title-block p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; color: #fff; font-size: 12px; font-weight: 800; background: ${tone.bg}; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
    .meta-item { background: #f7f8fc; border-radius: 14px; padding: 12px 14px; }
    .meta-item .l { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; }
    .meta-item .v { margin-top: 4px; font-size: 13px; font-weight: 700; }
    .hero { background: linear-gradient(135deg,#000435 0%,#12164a 55%,#1a1f5c 100%); color: #fff; border-radius: 20px; padding: 22px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .hero .l { font-size: 11px; letter-spacing: .12em; font-weight: 700; opacity: .75; }
    .hero .amt { margin-top: 6px; font-size: 34px; font-weight: 800; color: #fcb038; }
    .hero .sub { margin-top: 4px; font-size: 13px; opacity: .8; }
    .wallet { width: 72px; height: 72px; border-radius: 18px; background: rgba(252,176,56,.15); display: flex; align-items: center; justify-content: center; font-size: 34px; }
    .grid2 { display: grid; grid-template-columns: 1.1fr .9fr; gap: 14px; margin-top: 14px; }
    .grid3 { display: grid; grid-template-columns: 1.15fr 1fr .85fr; gap: 14px; margin-top: 14px; }
    .card { background: #f7f8fc; border-radius: 18px; padding: 16px; }
    .card h3 { margin: 0 0 12px; font-size: 13px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: #000435; }
    .row { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid #e8ebf3; font-size: 13px; }
    .row:last-child { border-bottom: 0; }
    .row .k { color: #64748b; }
    .row .v { font-weight: 700; text-align: right; }
    .ok-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 18px; padding: 18px; text-align: center; }
    .ok-card .icon { width: 48px; height: 48px; margin: 0 auto 10px; border-radius: 999px; background: #059669; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; }
    .gauge-wrap { text-align: center; }
    .gauge { width: 140px; height: 80px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    thead th { background: #000435; color: #fff; text-align: left; padding: 10px 12px; font-size: 11px; letter-spacing: .06em; }
    thead th:first-child { border-radius: 10px 0 0 10px; }
    thead th:last-child { border-radius: 0 10px 10px 0; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #eef1f7; }
    tfoot td { padding: 12px; font-weight: 800; background: #f8fafc; }
    .timeline { display: flex; gap: 0; overflow-x: auto; padding: 8px 0 4px; }
    .tl-step { position: relative; min-width: 120px; flex: 1; padding-right: 8px; }
    .tl-dot { width: 28px; height: 28px; border-radius: 999px; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
    .tl-label { margin-top: 8px; font-size: 12px; font-weight: 800; }
    .tl-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
    .tl-line { position: absolute; top: 13px; left: 32px; right: 0; height: 3px; border-radius: 99px; }
    .side { display: flex; flex-direction: column; gap: 14px; }
    .qr-card { background: #000435; color: #fff; border-radius: 18px; padding: 16px; text-align: center; }
    .qr-card img { width: 120px; height: 120px; background: #fff; border-radius: 12px; padding: 8px; }
    .qr-card a { display: inline-block; margin-top: 10px; background: #fcb038; color: #000435; text-decoration: none; font-size: 11px; font-weight: 800; padding: 8px 12px; border-radius: 999px; }
    .footer { margin-top: 20px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; padding-top: 16px; border-top: 1px solid #e8ebf3; }
    .decl { font-size: 12px; color: #64748b; line-height: 1.5; }
    .sig { margin-top: 18px; }
    .sig .name { font-family: "Segoe Script", "Brush Script MT", cursive; font-size: 28px; color: #000435; }
    .sig .line { margin-top: 4px; font-size: 12px; font-weight: 700; }
    .disclaimer { text-align: right; font-size: 11px; color: #94a3b8; }
    .progress-bar { height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden; margin: 8px 0; }
    .progress-bar > i { display: block; height: 100%; background: linear-gradient(90deg,#fcb038,#f59e0b); border-radius: 99px; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border-radius: 0; }
    }
    @media (max-width: 840px) {
      .header, .meta, .grid2, .grid3, .footer { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">K</div>
        <div>
          <h1>KaziAdvance</h1>
          <p>Empowering your financial wellbeing.</p>
        </div>
      </div>
      <div class="title-block">
        <h2>SALARY ADVANCE RECEIPT</h2>
        <p>Thank you for choosing KaziAdvance</p>
      </div>
      <div><span class="status-pill">✓ ${tone.label}</span></div>
    </div>

    <div class="meta">
      <div class="meta-item"><div class="l">Receipt No</div><div class="v">${request.requestNumber}</div></div>
      <div class="meta-item"><div class="l">Reference No</div><div class="v">${ref}</div></div>
      <div class="meta-item"><div class="l">Date Issued</div><div class="v">${fmtDate(new Date())}</div></div>
      <div class="meta-item"><div class="l">Organization</div><div class="v">${e.companyName || "Organization"}</div></div>
    </div>

    <div class="hero">
      <div>
        <div class="l">ADVANCE AMOUNT</div>
        <div class="amt">${rwf(request.amount)}</div>
        <div class="sub">${request.status === "Disbursed" || request.status === "Completed" ? "Successfully Disbursed" : `Status: ${request.status}`}</div>
      </div>
      <div class="wallet">💳</div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>Employee Information</h3>
        <div class="row"><span class="k">Employee Name</span><span class="v">${e.fullName}</span></div>
        <div class="row"><span class="k">Employee ID</span><span class="v">${e.employeeCode}</span></div>
        <div class="row"><span class="k">Department</span><span class="v">${e.department || "—"}</span></div>
        <div class="row"><span class="k">Position</span><span class="v">${e.position || "—"}</span></div>
        <div class="row"><span class="k">Employment Type</span><span class="v">${e.employmentStatus || "Full-time"}</span></div>
        <div class="row"><span class="k">Phone</span><span class="v">${e.phone || "—"}</span></div>
      </div>
      <div class="ok-card">
        <div class="icon">✓</div>
        <div style="font-weight:800;font-size:16px;color:#065f46">${tone.label}</div>
        <p style="margin:8px 0 0;font-size:13px;color:#047857">
          ${
            request.status === "Disbursed" || request.status === "Completed"
              ? "This advance has been successfully processed and recorded."
              : `Current request status is ${request.status}.`
          }
        </p>
      </div>
    </div>

    <div class="grid3">
      <div class="card">
        <h3>Advance Details</h3>
        <div class="row"><span class="k">Purpose</span><span class="v">${request.purpose}</span></div>
        <div class="row"><span class="k">Requested Amount</span><span class="v">${rwf(request.amount)}</span></div>
        <div class="row"><span class="k">Submitted On</span><span class="v">${fmtDate(request.createdAt)}</span></div>
        <div class="row"><span class="k">Approved On</span><span class="v">${fmtDate(request.approvedAt)}</span></div>
        <div class="row"><span class="k">Disbursed On</span><span class="v">${fmtDate(request.disbursedAt)}</span></div>
        <div class="row"><span class="k">Disbursed Amount</span><span class="v">${request.disbursedAt ? rwf(request.amount) : "—"}</span></div>
        ${request.description ? `<div class="row"><span class="k">Description</span><span class="v">${request.description}</span></div>` : ""}
      </div>
      <div class="card">
        <h3>Advance Summary</h3>
        <div class="row"><span class="k">Approved Amount</span><span class="v">${rwf(request.amount)}</span></div>
        <div class="row"><span class="k">Interest</span><span class="v">${interestRate}%</span></div>
        <div class="row"><span class="k">Repayment Period</span><span class="v">${request.repaymentMonths} Months</span></div>
        <div class="row"><span class="k">Monthly Deduction</span><span class="v">${monthly ? rwf(monthly) : "—"}</span></div>
        <div class="row"><span class="k">Outstanding Balance</span><span class="v">${rwf(outstanding)}</span></div>
        <div class="row"><span class="k">Remaining Installments</span><span class="v">${installmentsLeft}</span></div>
        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700"><span>Repayment Progress</span><span>${progress}%</span></div>
          <div class="progress-bar"><i style="width:${progress}%"></i></div>
          <div style="font-size:12px;color:#64748b">${paidCount}/${repayments.length || request.repaymentMonths} paid · ${rwf(totalPaid)} repaid</div>
        </div>
      </div>
      <div class="card gauge-wrap">
        <h3>Advance Capacity</h3>
        <svg class="gauge" viewBox="0 0 120 70">
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round"/>
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#fcb038" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${gaugeDash} 126" />
          <text x="60" y="52" text-anchor="middle" font-size="16" font-weight="800" fill="#000435">${utilized}%</text>
          <text x="60" y="66" text-anchor="middle" font-size="9" fill="#64748b">Utilized</text>
        </svg>
        <div class="row"><span class="k">Available Limit</span><span class="v" style="color:#059669">${rwf(available)}</span></div>
        <div class="row"><span class="k">Maximum Limit</span><span class="v">${maxLimit ? rwf(maxLimit) : "—"}</span></div>
        <div class="row"><span class="k">Credit Score</span><span class="v">${
          (() => {
            const raw = e.creditScore ?? 92;
            return Math.min(100, raw > 100 ? Math.round(raw / 10) : raw);
          })()
        }/100</span></div>
      </div>
    </div>

    <div class="grid2" style="margin-top:14px">
      <div class="card">
        <h3>Repayment Schedule</h3>
        <table>
          <thead><tr><th>INSTALLMENT</th><th>DUE DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead>
          <tbody>${scheduleRows}</tbody>
          <tfoot><tr><td colspan="2">TOTAL</td><td colspan="2">${rwf(totalSchedule)}</td></tr></tfoot>
        </table>
        <h3 style="margin-top:18px">Approval Timeline</h3>
        <div class="timeline">${timelineHtml}</div>
      </div>
      <div class="side">
        <div class="card">
          <h3>Payment Details</h3>
          <div class="row"><span class="k">Payment Method</span><span class="v">Bank Transfer</span></div>
          <div class="row"><span class="k">Transaction ID</span><span class="v">${ref}</span></div>
          <div class="row"><span class="k">Disbursement Date</span><span class="v">${fmtDate(request.disbursedAt)}</span></div>
          <div class="row"><span class="k">Email</span><span class="v">${e.email || "—"}</span></div>
        </div>
        <div class="qr-card">
          <div style="font-size:12px;font-weight:800;letter-spacing:.08em;margin-bottom:10px">SCAN TO VERIFY</div>
          <img src="${qrSrc}" alt="QR verification" />
          <div style="margin-top:8px;font-size:11px;opacity:.8">Scan for online verification</div>
          <a href="${verifyUrl}" target="_blank" rel="noreferrer">Verify Receipt</a>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>
        <div class="decl">
          <strong style="color:#000435">Employee Declaration</strong><br/>
          I acknowledge this salary advance and authorize payroll deductions as scheduled until the outstanding balance is cleared.
        </div>
        <div class="sig">
          <div class="name">${e.fullName.split(" ").slice(0, 2).join(" ")}</div>
          <div class="line">${e.fullName}</div>
          <div style="font-size:11px;color:#94a3b8">Authorized signature</div>
        </div>
      </div>
      <div class="disclaimer">
        Generated by KaziAdvance®<br/>
        This document is electronically generated and does not require a physical signature.<br/>
        ${new Date().toLocaleString()}
      </div>
    </div>
  </div>
</body>
</html>`;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  Eye,
  Package,
  PackageCheck,
  Plus,
  Printer,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import {
  DateRangeFilter,
  inDateRange,
  ListFilterBar,
  ListKpiStrip,
  ListToolbar,
  StatusBadge,
  timeAgo,
} from "@/components/list-ui";
import { useAuth } from "@/contexts/auth-context";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { cn } from "@/lib/utils";
import { uniformApi } from "@/services/uniform-api";
import type {
  DistributionReceipt,
  DistributionStatus,
  StockBalance,
  UniformStudent,
} from "@/types";
import { DistributionWizard } from "./distribution-wizard";
import {
  DistributionReceipt as ReceiptModal,
  downloadDistributionReceiptPdf,
  type ReceiptData,
} from "./distribution-receipt";

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function num(v: string | number | null | undefined) {
  return Number(v ?? 0) || 0;
}

function statusTone(status: DistributionStatus) {
  if (status === "PAID") return "success" as const;
  if (status === "FREE") return "info" as const;
  return "warning" as const;
}

function statusLabel(r: DistributionReceipt) {
  const bal = num(r.balance);
  if (bal <= 0 && num(r.total) > 0) return "Complete";
  if (num(r.paid) > 0 && bal > 0) return "Partial";
  if (r.status === "FREE" || num(r.total) <= 0) return "Complete";
  return "Pending";
}

function shuleCodenf(s?: UniformStudent | null) {
  if (!s) return "";
  const meta = s.profileMeta as
    { shuleCode?: string; studentCode?: string } | null | undefined;
  const code = (
    meta?.studentCode ||
    meta?.shuleCode ||
    s.academicStudentId ||
    ""
  ).trim();
  if (!code || /^[0-9a-f-]{36}$/i.test(code)) return "";
  return code;
}

export function DistributionsView() {
  const { summary } = useAuth();
  const orgName =
    (summary as { organizationName?: string } | null)?.organizationName ??
    "ShulePlus School";

  const [receipts, setReceipts] = useState<DistributionReceipt[]>([]);
  const [students, setStudents] = useState<UniformStudent[]>([]);
  const [stock, setStock] = useState<StockBalance[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [wizardnpen, setWizardnpen] = useState(false);
  const [selected, setSelected] = useState<DistributionReceipt | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printReceipt, setPrintReceipt] = useState<ReceiptData | null>(null);

  async function load() {
    try {
      const [r, s, st] = await Promise.all([
        uniformApi.distributions.listReceipts(),
        uniformApi.students.list(),
        uniformApi.stock.list(),
      ]);
      setReceipts(r);
      setStudents(s);
      setStock(st);
    } catch {
      toast.error("Failed to load distributions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return receipts.filter((r) => {
      if (!inDateRange(r.issuedAt, dateFrom, dateTo)) return false;
      if (!term) return true;
      const student = `${r.student?.firstName ?? ""} ${r.student?.lastName ?? ""}`;
      const code = shuleCodenf(r.student);
      return `${r.receiptNumber} ${student} ${r.student?.className ?? ""} ${code}`
        .toLowerCase()
        .includes(term);
    });
  }, [receipts, search, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = filtered.filter((r) => new Date(r.issuedAt) >= start);
    const totalItems = filtered.reduce((s, r) => s + r.totalQty, 0);
    const amount = filtered.reduce((s, r) => s + num(r.total), 0);
    const paid = filtered.reduce((s, r) => s + num(r.paid), 0);
    return [
      {
        label: "Today's sells",
        value: today.length,
        tone: "purple" as const,
        icon: <Package />,
      },
      {
        label: "Total items",
        value: totalItems,
        tone: "success" as const,
        icon: <PackageCheck />,
      },
      {
        label: "Total amount",
        value: money(amount),
        tone: "info" as const,
        icon: <Wallet />,
      },
      {
        label: "Paid amount",
        value: money(paid),
        tone: "primary" as const,
        icon: <Wallet />,
      },
    ];
  }, [filtered]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toReceiptData(r: DistributionReceipt): ReceiptData {
    return {
      receiptNumber: r.receiptNumber,
      schoolName: orgName,
      student: r.student ?? {
        id: r.studentId,
        firstName: "Student",
        lastName: "",
        className: null,
        academicStudentId: null,
        phone: null,
        gender: null,
      },
      items: (r.lines ?? []).map((l) => ({
        name: l.variant?.product?.name ?? "Item",
        size: l.variant?.size,
        color: l.variant?.color,
        quantity: l.quantity,
        unitPrice: num(l.unitPrice),
        total: num(l.unitPrice) * l.quantity,
      })),
      subtotal: num(r.subtotal),
      discount: num(r.discount),
      total: num(r.total),
      paid: num(r.paid),
      balance: num(r.balance),
      issuedAt: r.issuedAt,
      issuedBy: r.issuedBy ?? undefined,
      notes: r.notes ?? undefined,
    };
  }

  const columns: PlatformTableColumn<DistributionReceipt>[] = [
    {
      key: "receipt",
      header: "Receipt",
      render: (r) => (
        <span className="font-mono text-xs font-bold text-navy">
          {r.receiptNumber}
        </span>
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy text-[10px] font-bold text-white">
            {r.student
              ? `${r.student.firstName[0]}${r.student.lastName[0]}`
              : "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">
              {r.student ? `${r.student.firstName} ${r.student.lastName}` : ""}
            </p>
            <p className="truncate text-[11px] text-muted">
              {shuleCodenf(r.student)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (r) => (
        <span className="text-sm text-navy">{r.student?.className ?? ""}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (r) => {
        const open = expanded.has(r.id);
        const lines = r.lines ?? [];
        return (
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-bold text-navy"
              onClick={() => toggleExpand(r.id)}
            >
              {r.itemCount} item{r.itemCount === 1 ? "" : "s"}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
              />
            </button>
            {open ? (
              <ul className="mt-2 space-y-1 text-[11px] text-muted">
                {lines.map((l) => (
                  <li key={l.id}>
                    {l.variant?.product?.name ?? "Item"}
                    {l.variant?.size ? ` · ${l.variant.size}` : ""} ×
                    {l.quantity}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "qty",
      header: "Qty",
      render: (r) => (
        <span className="tabular-nums font-semibold text-navy">
          {r.totalQty}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (r) => (
        <span className="tabular-nums text-sm font-semibold text-navy">
          {money(num(r.total))}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      render: (r) => (
        <span className="tabular-nums text-sm font-medium text-emerald-700">
          {money(num(r.paid))}
        </span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      render: (r) => (
        <span
          className={cn(
            "tabular-nums text-sm font-semibold",
            num(r.balance) > 0 ? "text-amber-700" : "text-muted",
          )}
        >
          {money(num(r.balance))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={statusTone(r.status)} pill>
          {statusLabel(r)}
        </StatusBadge>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-muted">{timeAgo(r.issuedAt)}</span>,
    },
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => setSelected(r)}
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
      ),
    },
  ];

  return (
    <PlatformPageLayout
      title="Sells"
      subtitle="One receipt per student sale — items nest under each sell."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setWizardnpen(true)}
        >
          <Plus className="h-4 w-4" /> New sell
        </button>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by receipt, student, class, ShuleCode…"
          onReset={() => {
            setSearch("");
            setDateFrom("");
            setDateTo("");
          }}
        />

        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
          }}
          label="Sell date"
        />

        <ListKpiStrip items={kpis} />

        <PlatformDataTable
          className="[&_table]:min-w-[1100px]"
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No sells yet"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setWizardnpen(true)}
            >
              <Plus className="h-4 w-4" /> New sell
            </button>
          }
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          toolbar={
            <ListToolbar
              resultLabel={`${filtered.length} receipt${filtered.length === 1 ? "" : "s"}`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {wizardnpen ? (
        <DistributionWizard
          open={wizardnpen}
          onClose={() => setWizardnpen(false)}
          onIssued={() => void load()}
          students={students}
          stock={stock}
        />
      ) : null}

      {selected ? (
        <DistributionDetailDrawer
          receipt={selected}
          orgName={orgName}
          onClose={() => setSelected(null)}
          onPrint={() => setPrintReceipt(toReceiptData(selected))}
          onPdf={() =>
            void downloadDistributionReceiptPdf(toReceiptData(selected))
              .then(() => toast.success("Receipt PDF downloaded"))
              .catch(() => toast.error("PDF export failed"))
          }
        />
      ) : null}

      {printReceipt ? (
        <ReceiptModal receipt={printReceipt} onClose={() => setPrintReceipt(null)} />
      ) : null}
    </PlatformPageLayout>
  );
}

function DistributionDetailDrawer({
  receipt,
  orgName,
  onClose,
  onPrint,
  onPdf,
}: {
  receipt: DistributionReceipt;
  orgName: string;
  onClose: () => void;
  onPrint: () => void;
  onPdf: () => void;
}) {
  const student = receipt.student;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 bg-navy px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-medium text-white/70">Sell</p>
            <h3 className="font-mono text-lg font-bold">
              {receipt.receiptNumber}
            </h3>
            <p className="text-xs text-white/60">{orgName}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-border">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-lg font-bold text-white">
              {student ? `${student.firstName[0]}${student.lastName[0]}` : "?"}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-navy">
                {student ? `${student.firstName} ${student.lastName}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-bold text-navy">
                  {student?.className ?? ""}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-muted">
                  {shuleCodenf(student)}
                </span>
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              Items
            </p>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {(receipt.lines ?? []).map((l) => (
                <li
                  key={l.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      {l.variant?.product?.name ?? "Item"}
                    </p>
                    <p className="text-xs text-muted">
                      Size {l.variant?.size ?? ""}
                      {l.variant?.color ? ` · ${l.variant.color}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-navy">
                      ×{l.quantity}
                    </p>
                    <p className="text-[11px] text-muted">
                      {money(num(l.unitPrice) * l.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2 rounded-2xl border border-border p-4 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Payment
            </p>
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="tabular-nums font-medium">
                {money(num(receipt.subtotal))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Discount</span>
              <span className="tabular-nums font-medium">
                {money(num(receipt.discount))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Paid</span>
              <span className="tabular-nums font-semibold text-emerald-700">
                {money(num(receipt.paid))}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-bold">
              <span>Balance</span>
              <span className="tabular-nums text-amber-700">
                {money(num(receipt.balance))}
              </span>
            </div>
          </section>
        </div>

        <footer className="flex gap-2 border-t border-border p-4">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onPrint}
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onPdf}
          >
            <Download className="h-4 w-4" /> PDF
          </button>
        </footer>
      </div>
    </div>
  );
}

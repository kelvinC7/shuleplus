"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  MoreHorizontal,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  Shirt,
  ShoppingCart,
  UserRound,
  Users,
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
  ItemThumb,
  ListToolbar,
  StatusBadge,
  timeAgo,
} from "@/components/list-ui";
import { DistributionWizard } from "@/modules/distributions/distribution-wizard";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { exportToExcel, exportToPdf } from "@/lib/export-utils";
import { cn } from "@/lib/utils";
import { uniformApi } from "@/services/uniform-api";
import type {
  DistributionReceipt,
  StockBalance,
  UniformProduct,
  UniformSale,
  UniformStudent,
} from "@/types";

type MissingStatus = "" | "all" | "partial" | "ready" | "waiting";
type StockTone = "ready" | "low" | "out";
type PayTone = "paid" | "partial" | "unpaid" | "none";
type Priority = "high" | "medium" | "low";

interface ReqLine {
  product: UniformProduct;
  required: number;
  received: number;
  remaining: number;
  available: number;
}

interface MissingRow {
  student: UniformStudent;
  lines: ReqLine[];
  missingLines: ReqLine[];
  requiredTotal: number;
  receivedTotal: number;
  remainingTotal: number;
  progress: number;
  missingStatus: "all" | "partial";
  stockTone: StockTone;
  stockOutCount: number;
  stockLowCount: number;
  estCost: number;
  payTone: PayTone;
  balance: number;
  paid: number;
  totalDue: number;
  priority: Priority;
  lastDist?: string;
  lastReceiptNo?: string;
  studentReceipts: DistributionReceipt[];
  neverReceived: boolean;
  waitDays: number;
}

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shuleCodeOf(s: UniformStudent) {
  const meta = s.profileMeta as
    { studentCode?: string; shuleCode?: string } | null | undefined;
  const code = (
    meta?.studentCode ||
    meta?.shuleCode ||
    s.academicStudentId ||
    ""
  ).trim();
  if (!code || /^[0-9a-f-]{36}$/i.test(code)) return "";
  return code;
}

function parentNameOf(s: UniformStudent) {
  const meta = s.profileMeta as
    { parentName?: string; guardianName?: string } | null | undefined;
  return meta?.parentName || meta?.guardianName || "";
}

function productImage(p: UniformProduct) {
  const img = Array.isArray(p.images) ? p.images[0] : null;
  if (typeof img === "string") return img;
  if (img && typeof img === "object" && "url" in img)
    return String((img as { url: string }).url);
  return null;
}

function buildRow(
  student: UniformStudent,
  products: UniformProduct[],
  stock: StockBalance[],
  sales: UniformSale[],
  receipts: DistributionReceipt[],
): MissingRow {
  const items = student.items ?? student.uniformItems ?? [];
  const availByProduct = new Map<string, number>();
  for (const b of stock) {
    const pid = b.variant?.productId ?? b.variant?.product?.id;
    if (!pid) continue;
    availByProduct.set(
      pid,
      (availByProduct.get(pid) ?? 0) + (b.available ?? 0),
    );
  }

  const catalog =
    items.length > 0
      ? products.filter((p) => items.some((i) => i.productId === p.id))
      : products;

  const lines: ReqLine[] = catalog.map((p) => {
    const owned = items.filter((i) => i.productId === p.id);
    const received = owned.reduce(
      (sum, i) => sum + (i.owned ? i.quantity : 0),
      0,
    );
    const required = Math.max(
      1,
      owned.reduce((sum, i) => sum + i.quantity, 0) || 1,
    );
    const reqQty = owned.length ? Math.max(required, 1) : 1;
    const remaining = Math.max(0, reqQty - received);
    return {
      product: p,
      required: reqQty,
      received,
      remaining,
      available: availByProduct.get(p.id) ?? 0,
    };
  });

  const missingLines = lines.filter((l) => l.remaining > 0);
  const requiredTotal = lines.reduce((s, l) => s + l.required, 0);
  const receivedTotal = lines.reduce((s, l) => s + l.received, 0);
  const remainingTotal = missingLines.reduce((s, l) => s + l.remaining, 0);
  const progress =
    requiredTotal > 0 ? Math.round((receivedTotal / requiredTotal) * 100) : 0;

  const stockOutCount = missingLines.filter((l) => l.available <= 0).length;
  const stockLowCount = missingLines.filter(
    (l) => l.available > 0 && (l.available < l.remaining || l.available <= 5),
  ).length;
  let stockTone: StockTone = "ready";
  if (stockOutCount > 0) stockTone = "out";
  else if (stockLowCount > 0) stockTone = "low";

  const estCost = missingLines.reduce(
    (s, l) => s + l.remaining * (Number(l.product.sellingPrice) || 0),
    0,
  );

  const studentSales = sales.filter((sale) => sale.studentId === student.id);
  let paid = 0;
  let totalDue = 0;
  for (const sale of studentSales) {
    const total = Number(sale.total) || 0;
    const p = (sale.payments ?? []).reduce(
      (sum, x) => sum + (Number(x.amount) || 0),
      0,
    );
    totalDue += total;
    paid += p;
  }
  const balance = Math.max(0, totalDue - paid);
  const payTone: PayTone =
    totalDue <= 0
      ? "none"
      : balance <= 0
        ? "paid"
        : paid > 0
          ? "partial"
          : "unpaid";

  const neverReceived = receivedTotal <= 0;
  const waitDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(student.createdAt).getTime()) / 86400000),
  );
  const priority: Priority =
    neverReceived || waitDays >= 14
      ? "high"
      : remainingTotal >= 3 || waitDays >= 7
        ? "medium"
        : "low";

  const studentReceipts = receipts
    .filter((r) => r.studentId === student.id)
    .sort((a, b) => +new Date(b.issuedAt) - +new Date(a.issuedAt));
  const last = studentReceipts[0];

  return {
    student,
    lines,
    missingLines,
    requiredTotal,
    receivedTotal,
    remainingTotal,
    progress,
    missingStatus: neverReceived ? "all" : "partial",
    stockTone,
    stockOutCount,
    stockLowCount,
    estCost,
    payTone,
    balance,
    paid,
    totalDue,
    priority,
    lastDist: last?.issuedAt,
    lastReceiptNo: last?.receiptNumber,
    studentReceipts,
    neverReceived,
    waitDays,
  };
}

export function MissingStudentsView() {
  const [students, setStudents] = useState<UniformStudent[]>([]);
  const [products, setProducts] = useState<UniformProduct[]>([]);
  const [stock, setStock] = useState<StockBalance[]>([]);
  const [sales, setSales] = useState<UniformSale[]>([]);
  const [receipts, setReceipts] = useState<DistributionReceipt[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [missingFilter, setMissingFilter] = useState<MissingStatus>("");
  const [genderFilter, setGenderFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<MissingRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [preselectId, setPreselectId] = useState<string | undefined>();
  const [hovered, setHovered] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  async function load() {
    try {
      const [st, pr, sk, sa, rc] = await Promise.all([
        uniformApi.students.list(),
        uniformApi.products.list({ isActive: true }),
        uniformApi.stock.list(),
        uniformApi.sales.list(),
        uniformApi.distributions.listReceipts(),
      ]);
      setStudents(st);
      setProducts(pr);
      setStock(sk);
      setSales(sa);
      setReceipts(rc);
    } catch {
      toast.error("Failed to load missing uniforms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    function onDocClick() {
      setMoreOpen(null);
      setExportOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const rows = useMemo(
    () =>
      students
        .map((s) => buildRow(s, products, stock, sales, receipts))
        .filter((r) => r.remainingTotal > 0),
    [students, products, stock, sales, receipts],
  );

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.className).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [students],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (classFilter && r.student.className !== classFilter) return false;
      if (missingFilter === "all" && r.missingStatus !== "all") return false;
      if (missingFilter === "partial" && r.missingStatus !== "partial")
        return false;
      if (missingFilter === "ready" && r.stockTone !== "ready") return false;
      if (missingFilter === "waiting" && r.stockTone === "ready") return false;
      if (
        genderFilter &&
        (r.student.gender ?? "").toUpperCase() !== genderFilter
      )
        return false;
      if (payFilter && r.payTone !== payFilter) return false;
      if (stockFilter && r.stockTone !== stockFilter) return false;
      if (
        itemFilter &&
        !r.missingLines.some((l) => l.product.id === itemFilter)
      )
        return false;
      if (!term) return true;
      const code = shuleCodeOf(r.student).toLowerCase();
      const parent = parentNameOf(r.student).toLowerCase();
      return `${r.student.firstName} ${r.student.lastName} ${r.student.className ?? ""} ${r.student.phone ?? ""} ${code} ${parent}`
        .toLowerCase()
        .includes(term);
    });
  }, [
    rows,
    search,
    classFilter,
    missingFilter,
    genderFilter,
    payFilter,
    stockFilter,
    itemFilter,
  ]);

  const analytics = useMemo(() => {
    const itemCounts = new Map<string, number>();
    const classCounts = new Map<string, number>();
    for (const r of filtered) {
      const cls = r.student.className ?? "";
      classCounts.set(cls, (classCounts.get(cls) ?? 0) + 1);
      for (const l of r.missingLines) {
        itemCounts.set(
          l.product.name,
          (itemCounts.get(l.product.name) ?? 0) + l.remaining,
        );
      }
    }
    const topItem = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topClass = [...classCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const ready = filtered.filter((r) => r.stockTone === "ready").length;
    const oos = new Set(
      filtered.flatMap((r) =>
        r.missingLines.filter((l) => l.available <= 0).map((l) => l.product.id),
      ),
    ).size;
    return {
      ready,
      oos,
      mostMissingItem: topItem?.[0] ?? "",
      mostAffectedClass: topClass?.[0] ?? "",
    };
  }, [filtered]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const pageIds = pageRows.map((r) => r.student.id);
    const allSelected =
      pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function openDistribute(studentId?: string) {
    setPreselectId(studentId);
    setWizardOpen(true);
  }

  function notifyParent(row: MissingRow) {
    const items = row.missingLines.map((l) => `• ${l.product.name}`).join("\n");
    const msg = `Dear Parent,\n\nYour child ${row.student.firstName} ${row.student.lastName} still has\n${items}\nready for collection.\n\nPlease visit the school store.\n\nThank you.`;
    void navigator.clipboard?.writeText(msg);
    toast.success("Parent message copied", {
      description: "Paste into SMS / WhatsApp / email",
    });
  }

  function copyPickingList(targets: MissingRow[]) {
    const text = targets
      .map(
        (r) =>
          `${r.student.firstName} ${r.student.lastName} (${r.student.className ?? ""}):\n${r.missingLines
            .map((l) => ` - ${l.product.name} ×${l.remaining}`)
            .join("\n")}`,
      )
      .join("\n\n");
    void navigator.clipboard?.writeText(text);
    toast.success("Picking list copied");
  }

  async function handleExport(kind: "pdf" | "excel") {
    const cols = [
      { header: "Student", accessor: "student" },
      { header: "ShuleCode", accessor: "code" },
      { header: "Class", accessor: "className" },
      { header: "Missing items", accessor: "missing" },
      { header: "Progress %", accessor: "progress" },
      { header: "Received / Required", accessor: "ratio" },
      { header: "Stock", accessor: "stock" },
      { header: "Payment", accessor: "payment" },
      { header: "Balance (RWF)", accessor: "balance" },
      { header: "Priority", accessor: "priority" },
      { header: "Est. cost (RWF)", accessor: "cost" },
    ];
    const data = filtered.map((r) => ({
      student: `${r.student.firstName} ${r.student.lastName}`,
      code: shuleCodeOf(r.student),
      className: r.student.className ?? "",
      missing: r.missingLines
        .map((l) => `${l.product.name}×${l.remaining}`)
        .join(", "),
      progress: r.progress,
      ratio: `${r.receivedTotal}/${r.requiredTotal}`,
      stock: r.stockTone,
      payment: r.payTone,
      balance: Math.round(r.balance),
      priority: r.priority,
      cost: Math.round(r.estCost),
    }));
    if (kind === "pdf") {
      await exportToPdf({
        title: "Missing Uniforms Report",
        subtitle: "Students with incomplete uniform sets",
        columns: cols,
        data,
        orientation: "landscape",
        fileName: "missing_uniforms",
      });
      toast.success("PDF exported");
    } else {
      exportToExcel({
        title: "Missing Uniforms Report",
        columns: cols,
        data,
        fileName: "missing_uniforms",
      });
      toast.success("Excel exported");
    }
    setExportOpen(false);
  }

  const columns: PlatformTableColumn<MissingRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <ItemThumb
            fallback={`${r.student.firstName} ${r.student.lastName}`}
            className="!h-9 !w-9 !rounded-full !text-xs"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">
              {r.student.firstName} {r.student.lastName}
            </p>
            <p className="truncate font-mono text-[11px] text-muted">
              {shuleCodeOf(r.student)}
            </p>
            {r.neverReceived ? (
              <span className="mt-0.5 inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#000435]">
                Never received
              </span>
            ) : r.waitDays >= 7 ? (
              <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                Waiting {r.waitDays}d
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (r) => (
        <span className="font-medium text-navy">
          {r.student.className ?? ""}
        </span>
      ),
    },
    {
      key: "missing",
      header: "Missing Items",
      render: (r) => {
        const shown = r.missingLines.slice(0, 3);
        const extra = r.missingLines.length - shown.length;
        return (
          <div
            className="relative"
            onMouseEnter={() => setHovered(r.student.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-1">
              {shown.map((l) => (
                <ItemThumb
                  key={l.product.id}
                  src={productImage(l.product)}
                  fallback={l.product.name}
                  className="!h-7 !w-7 !rounded-md !text-[10px] ring-2 ring-white"
                />
              ))}
              {extra > 0 ? (
                <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[10px] font-bold text-navy">
                  +{extra}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#000435]">
              {r.remainingTotal} Item{r.remainingTotal === 1 ? "" : "s"} Missing
            </p>
            {hovered === r.student.id ? (
              <ul className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-border bg-white p-2 text-xs shadow-lg">
                {r.missingLines.map((l) => (
                  <li
                    key={l.product.id}
                    className="flex items-center gap-2 px-2 py-1 text-navy"
                  >
                    <ItemThumb
                      src={productImage(l.product)}
                      fallback={l.product.name}
                      className="!h-5 !w-5 !rounded !text-[9px]"
                    />
                    <span>
                      {l.product.name} ×{l.remaining}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "progress",
      header: "Progress",
      render: (r) => (
        <div className="min-w-[120px]">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-navy">{r.progress}%</span>
            <span className="text-muted">
              {r.receivedTotal}/{r.requiredTotal} items
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                r.progress >= 80 ? "bg-[#000435]" : "bg-primary",
              )}
              style={{ width: `${r.progress}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (r) => {
        const cfg =
          r.stockTone === "ready"
            ? { dot: "bg-primary", label: "Ready", sub: "All available" }
            : r.stockTone === "low"
              ? {
                  dot: "bg-amber-500",
                  label: "Low Stock",
                  sub: `${r.stockLowCount} item${r.stockLowCount === 1 ? "" : "s"} low`,
                }
              : {
                  dot: "bg-[#000435]",
                  label: "Out of Stock",
                  sub: `${r.stockOutCount} item${r.stockOutCount === 1 ? "" : "s"} out`,
                };
        return (
          <div className="flex items-start gap-2">
            <span
              className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cfg.dot)}
            />
            <div>
              <p className="text-xs font-semibold text-navy">{cfg.label}</p>
              <p className="text-[10px] text-muted">{cfg.sub}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "payment",
      header: "Payment",
      render: (r) => (
        <div>
          <StatusBadge
            tone={
              r.payTone === "paid"
                ? "success"
                : r.payTone === "partial"
                  ? "warning"
                  : r.payTone === "unpaid"
                    ? "danger"
                    : "neutral"
            }
            pill
          >
            {r.payTone === "none"
              ? "No bill"
              : r.payTone === "paid"
                ? "Paid"
                : r.payTone === "partial"
                  ? "Partial"
                  : "Unpaid"}
          </StatusBadge>
          {r.balance > 0 ? (
            <p className="mt-1 text-[10px] font-semibold text-[#000435]">
              Bal {money(r.balance)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (r) => (
        <StatusBadge
          tone={
            r.priority === "high"
              ? "warning"
              : r.priority === "medium"
                ? "primary"
                : "neutral"
          }
          pill
        >
          {r.priority === "high"
            ? "High"
            : r.priority === "medium"
              ? "Medium"
              : "Low"}
        </StatusBadge>
      ),
    },
    {
      key: "last",
      header: "Last Distribution",
      render: (r) =>
        r.lastDist ? (
          <div>
            <p className="text-xs font-medium text-navy">
              {fmtDate(r.lastDist)}
            </p>
            <p className="text-[10px] text-muted">
              {r.lastReceiptNo || timeAgo(r.lastDist)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted">Never</span>
        ),
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      render: (r) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-navy shadow-sm hover:bg-primary-hover"
            onClick={() => setDrawer(r)}
          >
            View
          </button>
          <div className="relative">
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-navy"
              onClick={(e) => {
                e.stopPropagation();
                setMoreOpen((v) => (v === r.student.id ? null : r.student.id));
              }}
            >
              <MoreHorizontal size={16} />
            </button>
            {moreOpen === r.student.id ? (
              <div
                className="absolute right-0 z-30 mt-1 w-48 rounded-xl border border-border bg-white py-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <MenuBtn
                  onClick={() => {
                    openDistribute(r.student.id);
                    setMoreOpen(null);
                  }}
                >
                  <ShoppingCart size={13} /> Complete Distribution
                </MenuBtn>
                <MenuBtn
                  onClick={() => {
                    copyPickingList([r]);
                    setMoreOpen(null);
                  }}
                >
                  <Package size={13} /> Reserve / Pick List
                </MenuBtn>
                <MenuBtn
                  onClick={() => {
                    notifyParent(r);
                    setMoreOpen(null);
                  }}
                >
                  <Bell size={13} /> Notify Parent
                </MenuBtn>
                <Link
                  href={`/students/${r.student.id}`}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-navy hover:bg-slate-50"
                  onClick={() => setMoreOpen(null)}
                >
                  <UserRound size={13} /> Full Profile
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
  ];

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.student.id));

  const moreFiltersActive = [genderFilter, payFilter, itemFilter].filter(
    Boolean,
  ).length;

  function resetFilters() {
    setSearch("");
    setClassFilter("");
    setMissingFilter("");
    setGenderFilter("");
    setPayFilter("");
    setStockFilter("");
    setItemFilter("");
  }

  return (
    <PlatformPageLayout
      title="Missing Uniforms"
      subtitle="Students who still need one or more required uniform items."
      actions={
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <button
              type="button"
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                setExportOpen((v) => !v);
              }}
            >
              <Download size={15} /> Export <ChevronDown size={14} />
            </button>
            {exportOpen ? (
              <div
                className="absolute right-0 z-30 mt-1 w-40 rounded-xl border border-border bg-white py-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <MenuBtn onClick={() => void handleExport("pdf")}>
                  <FileText size={13} /> PDF Report
                </MenuBtn>
                <MenuBtn onClick={() => void handleExport("excel")}>
                  <FileSpreadsheet size={13} /> Excel
                </MenuBtn>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => openDistribute()}
          >
            <Plus size={15} /> New Distribution
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat
            icon={<PackageCheck className="h-4 w-4" />}
            label="Ready for Distribution"
            value={analytics.ready}
            tone="amber"
          />
          <MiniStat
            icon={<PackageX className="h-4 w-4" />}
            label="Out of Stock Items"
            value={analytics.oos}
            tone="navy"
          />
          <MiniStat
            icon={<Shirt className="h-4 w-4" />}
            label="Most Missing Item"
            value={analytics.mostMissingItem}
            tone="navy"
          />
          <MiniStat
            icon={<Users className="h-4 w-4" />}
            label="Most Affected Class"
            value={analytics.mostAffectedClass}
            tone="amber"
          />
        </div>

        <div className="rounded-2xl border border-border bg-white p-3 shadow-soft sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="input !rounded-xl pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, admission no., parent phone…"
                />
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#000435]/15 bg-[#000435] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#000435]/90"
                onClick={() => setFiltersOpen(true)}
              >
                <Filter size={14} className="text-primary" />
                Expand Filters
                {moreFiltersActive > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-[#000435]">
                    {moreFiltersActive}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="rounded-xl px-3 py-2.5 text-xs font-semibold text-[#000435] hover:bg-primary/15"
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <FilterSelect
                label="Class"
                value={classFilter}
                onChange={setClassFilter}
                options={classOptions.map((c) => ({ value: c, label: c }))}
              />
              <FilterSelect
                label="Missing Status"
                value={missingFilter}
                onChange={(v) => setMissingFilter(v as MissingStatus)}
                options={[
                  { value: "all", label: "Missing Everything" },
                  { value: "partial", label: "Missing Some Items" },
                  { value: "ready", label: "Ready to Complete" },
                  { value: "waiting", label: "Waiting for Stock" },
                ]}
              />
              <FilterSelect
                label="Stock Availability"
                value={stockFilter}
                onChange={setStockFilter}
                options={[
                  { value: "ready", label: "Available" },
                  { value: "low", label: "Low Stock" },
                  { value: "out", label: "Out of Stock" },
                ]}
              />
            </div>
          </div>
        </div>

        {filtersOpen ? (
          <FiltersDrawer
            genderFilter={genderFilter}
            payFilter={payFilter}
            itemFilter={itemFilter}
            products={products}
            onGenderChange={setGenderFilter}
            onPayChange={setPayFilter}
            onItemChange={setItemFilter}
            onClose={() => setFiltersOpen(false)}
            onClear={() => {
              setGenderFilter("");
              setPayFilter("");
              setItemFilter("");
            }}
          />
        ) : null}

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3">
            <span className="text-sm font-bold text-navy">
              {selected.size} selected
            </span>
            <button
              type="button"
              className="btn-secondary !py-1.5 text-xs"
              onClick={() => {
                const first = filtered.find((r) => selected.has(r.student.id));
                if (first) openDistribute(first.student.id);
              }}
            >
              Complete Distribution
            </button>
            <button
              type="button"
              className="btn-secondary !py-1.5 text-xs"
              onClick={() =>
                copyPickingList(
                  filtered.filter((r) => selected.has(r.student.id)),
                )
              }
            >
              Generate Picking List
            </button>
            <button
              type="button"
              className="btn-secondary !py-1.5 text-xs"
              onClick={() => {
                filtered
                  .filter((r) => selected.has(r.student.id))
                  .forEach(notifyParent);
              }}
            >
              <Bell className="h-3.5 w-3.5" /> Send SMS
            </button>
            <button
              type="button"
              className="btn-secondary !py-1.5 text-xs"
              onClick={() => void handleExport("excel")}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              type="button"
              className="btn-ghost !py-1.5 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </div>
        ) : null}

        <PlatformDataTable
          className="[&_table]:min-w-[1180px]"
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.student.id}
          loading={loading}
          emptyMessage="No students with missing uniforms"
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          selected={selected}
          onSelectRow={toggleSelect}
          onSelectAll={toggleAll}
          allSelected={allPageSelected}
          toolbar={
            <ListToolbar
              resultLabel={`${filtered.length} student${filtered.length === 1 ? "" : "s"} missing items`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {drawer ? (
        <MissingDetailDrawer
          row={drawer}
          onClose={() => setDrawer(null)}
          onDistribute={() => {
            openDistribute(drawer.student.id);
            setDrawer(null);
          }}
          onNotify={() => notifyParent(drawer)}
          onReserve={() => {
            copyPickingList([drawer]);
          }}
        />
      ) : null}

      {wizardOpen ? (
        <DistributionWizard
          open={wizardOpen}
          onClose={() => {
            setWizardOpen(false);
            setPreselectId(undefined);
          }}
          onIssued={() => void load()}
          students={students}
          stock={stock}
          preselectStudentId={preselectId}
        />
      ) : null}
    </PlatformPageLayout>
  );
}

function MenuBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-navy hover:bg-slate-50"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <select
        className="input !rounded-xl !py-2.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FiltersDrawer({
  genderFilter,
  payFilter,
  itemFilter,
  products,
  onGenderChange,
  onPayChange,
  onItemChange,
  onClose,
  onClear,
}: {
  genderFilter: string;
  payFilter: string;
  itemFilter: string;
  products: UniformProduct[];
  onGenderChange: (v: string) => void;
  onPayChange: (v: string) => void;
  onItemChange: (v: string) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#000435]/40"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Filters
            </p>
            <h3 className="text-lg font-bold text-[#000435]">More Filters</h3>
            <p className="mt-0.5 text-xs text-muted">
              Refine by gender, payment, and item
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-[#000435]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <FilterSelect
            label="Gender"
            value={genderFilter}
            onChange={onGenderChange}
            options={[
              { value: "MALE", label: "Male" },
              { value: "FEMALE", label: "Female" },
            ]}
          />
          <FilterSelect
            label="Payment Status"
            value={payFilter}
            onChange={onPayChange}
            options={[
              { value: "paid", label: "Paid" },
              { value: "partial", label: "Partially Paid" },
              { value: "unpaid", label: "Unpaid" },
            ]}
          />
          <FilterSelect
            label="Missing Item"
            value={itemFilter}
            onChange={onItemChange}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>

        <footer className="flex gap-2 border-t border-border p-4">
          <button
            type="button"
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-[#000435] hover:bg-slate-50"
            onClick={onClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="flex-[1.4] rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-[#000435] hover:bg-primary-hover"
            onClick={onClose}
          >
            Apply Filters
          </button>
        </footer>
      </aside>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "amber" | "navy";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-soft">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          tone === "amber"
            ? "bg-primary/25 text-[#000435]"
            : "bg-[#000435]/10 text-[#000435]",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="truncate text-sm font-bold text-[#000435]">{value}</p>
      </div>
    </div>
  );
}

function MissingDetailDrawer({
  row,
  onClose,
  onDistribute,
  onNotify,
  onReserve,
}: {
  row: MissingRow;
  onClose: () => void;
  onDistribute: () => void;
  onNotify: () => void;
  onReserve: () => void;
}) {
  const s = row.student;
  const [tab, setTab] = useState<"overview" | "history" | "payments">(
    "overview",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-navy/40"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-bold text-navy">
                  {s.firstName} {s.lastName}
                </h3>
                <StatusBadge
                  tone={
                    row.priority === "high"
                      ? "warning"
                      : row.priority === "medium"
                        ? "primary"
                        : "neutral"
                  }
                  pill
                >
                  {row.priority === "high"
                    ? "High Priority"
                    : row.priority === "medium"
                      ? "Medium Priority"
                      : "Low Priority"}
                </StatusBadge>
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted">
                Adm. No: {shuleCodeOf(s)}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-navy"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            <ItemThumb
              fallback={`${s.firstName} ${s.lastName}`}
              className="!h-14 !w-14 !rounded-2xl !text-lg"
            />
            <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <InfoInline label="Class" value={s.className ?? ""} />
              <InfoInline label="Gender" value={s.gender ?? ""} />
              <InfoInline label="Parent" value={parentNameOf(s)} />
              <InfoInline label="Phone" value={s.phone ?? ""} />
            </div>
          </div>

          <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                ["overview", "Overview"],
                ["history", "History"],
                ["payments", "Payments"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition",
                  tab === id
                    ? "bg-white text-navy shadow-sm"
                    : "text-muted hover:text-navy",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {tab === "overview" ? (
            <>
              <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-border">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      Distribution Progress
                    </p>
                    <p className="mt-1 text-2xl font-bold text-navy">
                      {row.progress}%
                    </p>
                    <p className="text-xs text-muted">
                      {row.receivedTotal} of {row.requiredTotal} items received
                    </p>
                    <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="relative h-[72px] w-[72px]">
                    <svg
                      viewBox="0 0 36 36"
                      className="h-[72px] w-[72px] -rotate-90"
                    >
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="#FCB038"
                        strokeWidth="3"
                        strokeDasharray={`${row.progress} ${100 - row.progress}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-navy">
                      {row.progress}%
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  Required Uniform Items
                </p>
                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-navy text-[10px] uppercase text-white">
                        <th className="px-3 py-2.5">Item</th>
                        <th className="px-2 py-2.5">Req</th>
                        <th className="px-2 py-2.5">Got</th>
                        <th className="px-2 py-2.5">Miss</th>
                        <th className="px-2 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.lines.map((l) => (
                        <tr
                          key={l.product.id}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2.5 font-medium text-navy">
                            {l.product.name}
                          </td>
                          <td className="px-2 py-2.5 tabular-nums">
                            {l.required}
                          </td>
                          <td className="px-2 py-2.5 tabular-nums">
                            {l.received}
                          </td>
                          <td
                            className={cn(
                              "px-2 py-2.5 tabular-nums font-semibold",
                              l.remaining > 0
                                ? "text-[#000435]"
                                : "text-primary",
                            )}
                          >
                            {l.remaining}
                          </td>
                          <td className="px-2 py-2.5">
                            <StatusBadge
                              tone={l.remaining > 0 ? "warning" : "primary"}
                              pill
                            >
                              {l.remaining > 0 ? "Missing" : "Complete"}
                            </StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  Stock Availability
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {row.missingLines.map((l) => (
                    <span
                      key={l.product.id}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        l.available > 5
                          ? "bg-primary/20 text-[#000435]"
                          : l.available > 0
                            ? "bg-amber-100 text-amber-900"
                            : "bg-[#000435]/10 text-[#000435]",
                      )}
                    >
                      {l.available > 0
                        ? `${l.product.name} Available (${l.available})`
                        : `${l.product.name} Out of Stock`}
                    </span>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-3 gap-2">
                <PayCard label="Total Amount" value={money(row.totalDue)} />
                <PayCard label="Paid" value={money(row.paid)} tone="emerald" />
                <PayCard
                  label="Balance"
                  value={money(row.balance)}
                  tone="rose"
                />
              </section>

              {row.stockTone === "ready" ? (
                <p className="flex items-center gap-2 rounded-xl bg-primary/15 px-3 py-2 text-xs font-medium text-[#000435]">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> All missing
                  items can be fulfilled with current stock.
                </p>
              ) : row.stockTone === "out" ? (
                <p className="flex items-center gap-2 rounded-xl bg-[#000435]/5 px-3 py-2 text-xs font-medium text-[#000435]">
                  <AlertTriangle className="h-4 w-4 text-primary" /> Some items
                  are out of stock. Reserve what is available or wait for
                  restock.
                </p>
              ) : (
                <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
                  <Wallet className="h-4 w-4 text-primary" /> Low stock on some
                  items. Prioritize this student soon.
                </p>
              )}
            </>
          ) : null}

          {tab === "history" ? (
            <section className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Distribution History
              </p>
              {row.studentReceipts.length === 0 ? (
                <p className="text-sm text-muted">No distributions yet.</p>
              ) : (
                row.studentReceipts.map((rc, idx) => (
                  <div
                    key={rc.id}
                    className="rounded-2xl border border-border bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-navy">
                        Round {idx + 1}
                      </p>
                      <span className="font-mono text-[11px] text-muted">
                        {rc.receiptNumber}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {fmtDate(rc.issuedAt)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-navy">
                      Distributed {rc.totalQty} item
                      {rc.totalQty === 1 ? "" : "s"}
                    </p>
                  </div>
                ))
              )}
              <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted">
                <p className="font-semibold text-navy">Activity</p>
                <ul className="mt-2 space-y-1.5">
                  <li>Registered · {fmtDate(s.createdAt)}</li>
                  {row.paid > 0 ? <li>Paid fees · {money(row.paid)}</li> : null}
                  {row.studentReceipts.map((rc) => (
                    <li key={rc.id}>
                      Received items · {rc.receiptNumber} ·{" "}
                      {fmtDate(rc.issuedAt)}
                    </li>
                  ))}
                  {row.missingLines.slice(0, 3).map((l) => (
                    <li key={l.product.id} className="text-rose-600">
                      Still missing {l.product.name}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={`/students/${s.id}`}
                className="inline-block text-xs font-semibold text-navy underline-offset-2 hover:underline"
              >
                Open full profile →
              </Link>
            </section>
          ) : null}

          {tab === "payments" ? (
            <section className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <PayCard label="Total" value={money(row.totalDue)} />
                <PayCard label="Paid" value={money(row.paid)} tone="emerald" />
                <PayCard
                  label="Balance"
                  value={money(row.balance)}
                  tone="rose"
                />
              </div>
              <StatusBadge
                tone={
                  row.payTone === "paid"
                    ? "success"
                    : row.payTone === "partial"
                      ? "warning"
                      : row.payTone === "unpaid"
                        ? "danger"
                        : "neutral"
                }
                pill
              >
                {row.payTone === "none"
                  ? "No bill on file"
                  : row.payTone === "paid"
                    ? "Fully paid"
                    : row.payTone === "partial"
                      ? "Partially paid"
                      : "Unpaid"}
              </StatusBadge>
            </section>
          ) : null}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-border p-4">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onNotify}
          >
            <Bell className="h-4 w-4" /> Notify Parent
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onReserve}
            title="Copy picking list"
          >
            <Package className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-primary flex-[1.4]"
            onClick={onDistribute}
          >
            <ShoppingCart className="h-4 w-4" /> Complete Distribution
          </button>
        </footer>
      </div>
    </div>
  );
}

function InfoInline({ label, value }: { label: string; value: string }) {
  return (
    <p className="truncate">
      <span className="text-muted">{label}: </span>
      <span className="font-semibold text-navy">{value}</span>
    </p>
  );
}

function PayCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "rose";
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2.5 ring-1",
        tone === "emerald"
          ? "bg-primary/15 ring-primary/30"
          : tone === "rose"
            ? "bg-[#000435]/5 ring-[#000435]/15"
            : "bg-slate-50 ring-border",
      )}
    >
      <p className="text-[9px] font-semibold uppercase text-muted">{label}</p>
      <p className="text-xs font-bold tabular-nums text-[#000435]">{value}</p>
    </div>
  );
}

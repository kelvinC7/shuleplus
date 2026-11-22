"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Eye, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { PlatformPageLayout } from "@/components/platform-page-layout";
import { PlatformDataTable, type PlatformTableColumn } from "@/components/platform-data-table";
import { ListFilterBar, ListToolbar, StatusBadge } from "@/components/list-ui";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { fmtMeters, fmtMoney } from "@/modules/fabric/fabric-utils";
import { ProductionEstimatorWizard } from "@/modules/fabric/production-estimator-wizard";
import { uniformApi } from "@/services/uniform-api";
import type { ProductionOrder } from "@/types";

type EstimatorMeta = {
  batch?: string;
  academicYear?: string;
  term?: string;
  classes?: string[];
  classCounts?: { name: string; students: number }[];
  totalStudents?: number;
  uniformName?: string;
  metersPerEach?: number;
  baseMeters?: number;
  extraMetersFromBig?: number;
  metersRequired?: number;
  estimatedUniforms?: number;
  extraUnits?: number;
  bigStudents?: { studentId: string; name: string; className: string; extraMeters: number }[];
};

function parseMeta(notes?: string | null): EstimatorMeta | null {
  if (!notes) return null;
  const m = notes.match(/ESTIMATOR_META:(\{.*\})/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as EstimatorMeta;
  } catch {
    return null;
  }
}

function batchLabel(o: ProductionOrder, meta: EstimatorMeta | null) {
  if (meta?.batch) return meta.batch;
  const m = o.notes?.match(/Batch\s+([A-Z0-9-]+)/i);
  return m?.[1] ?? `PO-${o.id.slice(-5).toUpperCase()}`;
}

function statusTone(status: ProductionOrder["status"]): "success" | "info" | "danger" | "warning" {
  if (status === "COMPLETED") return "success";
  if (status === "IN_PROGRESS") return "info";
  if (status === "CANCELLED") return "danger";
  return "warning";
}

function statusLabel(status: ProductionOrder["status"]) {
  if (status === "WAITING") return "Pending";
  if (status === "IN_PROGRESS") return "In Production";
  if (status === "COMPLETED") return "Completed";
  return "Cancelled";
}

function classesText(meta: EstimatorMeta | null, notes?: string | null) {
  if (meta?.classes?.length) return meta.classes.join(", ");
  const m = notes?.match(/Classes\s+([^|]+?)(?:\s+\(|\||$)/i) || notes?.match(/Class\s+([^|]+?)(?:\s+\(|\||$)/i);
  return m?.[1]?.trim() || "—";
}

function studentsCount(o: ProductionOrder, meta: EstimatorMeta | null) {
  if (typeof meta?.totalStudents === "number") return meta.totalStudents;
  const m = o.notes?.match(/\((\d+)\s+students/i);
  return m ? Number(m[1]) : 0;
}

export function FabricEstimatorView() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ProductionOrder | null>(null);

  async function load() {
    try {
      setOrders(await uniformApi.productionOrders.list());
    } catch {
      toast.error("Failed to load production batches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const meta = parseMeta(o.notes);
      const text = [
        batchLabel(o, meta),
        o.fabric?.name ?? "",
        o.product?.name ?? "",
        meta?.uniformName ?? "",
        classesText(meta, o.notes),
        o.notes ?? "",
      ].join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [orders, search]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } = usePagedRows(filtered);

  const columns: PlatformTableColumn<ProductionOrder>[] = [
    {
      key: "batch",
      header: "Batch",
      render: (o) => {
        const meta = parseMeta(o.notes);
        return (
          <button type="button" className="text-left font-semibold text-navy hover:underline" onClick={() => setDetail(o)}>
            {batchLabel(o, meta)}
          </button>
        );
      },
    },
    {
      key: "classes",
      header: "Classes",
      render: (o) => <span className="max-w-[220px] truncate block text-navy" title={classesText(parseMeta(o.notes), o.notes)}>{classesText(parseMeta(o.notes), o.notes)}</span>,
    },
    {
      key: "uniform",
      header: "Uniform",
      render: (o) => {
        const meta = parseMeta(o.notes);
        return <span className="font-medium text-navy">{meta?.uniformName || o.product?.name || "—"}</span>;
      },
    },
    { key: "fabric", header: "Fabric", render: (o) => <span className="text-slate-700">{o.fabric?.name ?? "—"}</span> },
    {
      key: "students",
      header: "Students",
      render: (o) => {
        const meta = parseMeta(o.notes);
        const count = studentsCount(o, meta);
        const big = meta?.bigStudents?.length ?? 0;
        return (
          <div className="text-xs">
            <p className="font-semibold tabular-nums text-navy">{count}</p>
            {big > 0 ? <p className="text-amber-700">{big} big</p> : <p className="text-muted">—</p>}
          </div>
        );
      },
    },
    {
      key: "meters",
      header: "Meters Required",
      render: (o) => {
        const meta = parseMeta(o.notes);
        const extra = meta?.extraMetersFromBig ?? 0;
        return (
          <div className="text-xs">
            <p className="font-semibold tabular-nums text-navy">{fmtMeters(Number(o.metersIssued))}</p>
            {extra > 0 ? <p className="text-amber-700">+{fmtMeters(extra)} extra</p> : <p className="text-muted">Base only</p>}
          </div>
        );
      },
    },
    {
      key: "expected",
      header: "Est. Uniforms",
      render: (o) => <span className="tabular-nums font-semibold text-navy">{o.expectedOutput}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <StatusBadge tone={statusTone(o.status)}>{statusLabel(o.status)}</StatusBadge>,
    },
    {
      key: "actions",
      header: "",
      render: (o) => (
        <button type="button" className="btn-ghost !px-2 !py-1.5" onClick={() => setDetail(o)} title="View details">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const detailMeta = detail ? parseMeta(detail.notes) : null;

  return (
    <PlatformPageLayout
      title="Production Estimator"
      subtitle="Plan fabric to uniforms by class, calculate meters per each, manage big-student extras, and review production batches."
      actions={
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Estimation
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-navy">Modern planning flow</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-4">
            {["Year & Classes", "Uniform & Fabric", "Production Qty (Big students)", "Review & Confirm"].map((label, i) => (
              <li key={label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">{i + 1}</span>
                <span className="text-xs font-medium text-navy">{label}</span>
              </li>
            ))}
          </ol>
        </div>

        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search batch, class, uniform, fabric…"
        />

        <PlatformDataTable
          variant="soft"
          showRowNumbers
          className="[&_table]:min-w-[980px]"
          columns={columns}
          data={pageRows}
          rowKey={(o) => o.id}
          loading={loading}
          emptyMessage="No production batches yet. Create a new estimation."
          emptyAction={
            <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> New Estimation
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
              resultLabel={`${filtered.length} batch${filtered.length === 1 ? "" : "es"} found`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      <ProductionEstimatorWizard open={open} onClose={() => setOpen(false)} onCreated={() => void load()} />

      {detail ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" className="absolute inset-0 bg-navy/45 backdrop-blur-sm" aria-label="Close" onClick={() => setDetail(null)} />
          <div className="relative flex h-full w-full max-w-3xl flex-col bg-[#f7f8fb] shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Production Batch Details</p>
                <h3 className="text-lg font-bold text-navy">{batchLabel(detail, detailMeta)}</h3>
                <p className="text-xs text-muted">{detailMeta?.uniformName || detail.product?.name || "Uniform"} · {detail.fabric?.name || "Fabric"}</p>
              </div>
              <button type="button" className="rounded-xl border border-border p-2 hover:bg-slate-50" onClick={() => setDetail(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Total Students" value={String(studentsCount(detail, detailMeta))} />
                <Kpi label="Meters Required" value={fmtMeters(Number(detail.metersIssued))} />
                <Kpi label="Estimated Uniforms" value={String(detail.expectedOutput)} />
                <Kpi label="Extra Meters (Big)" value={fmtMeters(detailMeta?.extraMetersFromBig ?? 0)} accent />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                  <h4 className="text-sm font-bold text-navy mb-3">Plan Summary</h4>
                  <dl className="space-y-2 text-sm">
                    <InfoRow k="Batch" v={batchLabel(detail, detailMeta)} />
                    <InfoRow k="Academic period" v={detailMeta ? `${detailMeta.academicYear || "—"} · ${detailMeta.term || "—"}` : "—"} />
                    <InfoRow k="Classes" v={classesText(detailMeta, detail.notes)} />
                    <InfoRow k="Uniform" v={detailMeta?.uniformName || detail.product?.name || "—"} />
                    <InfoRow k="Fabric" v={detail.fabric?.name || "—"} />
                    <InfoRow k="Meters per each" v={detailMeta?.metersPerEach != null ? `${detailMeta.metersPerEach} m` : "—"} />
                    <InfoRow k="Base meters" v={detailMeta?.baseMeters != null ? fmtMeters(detailMeta.baseMeters) : "—"} />
                    <InfoRow k="Extra units" v={String(detailMeta?.extraUnits ?? 0)} />
                    <InfoRow k="Status" v={statusLabel(detail.status)} />
                  </dl>
                </section>

                <section className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                  <h4 className="text-sm font-bold text-navy mb-3">Class & Student Breakdown</h4>
                  {detailMeta?.classCounts?.length ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {detailMeta.classCounts.map((c) => (
                        <span key={c.name} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                          <span className="font-medium text-navy">{c.name}</span>
                          <span className="tabular-nums text-slate-600">{c.students}</span>
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted mb-3">Class breakdown not available for this batch.</p>}

                  <div className="overflow-auto rounded-xl border border-border">
                    <table className="min-w-[520px] w-full text-sm">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Big Student</th>
                          <th className="px-3 py-2 text-left">Class</th>
                          <th className="px-3 py-2 text-right">Extra Meters</th>
                          <th className="px-3 py-2 text-left">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailMeta?.bigStudents ?? []).map((b, idx) => (
                          <tr key={`${b.studentId}-${idx}`} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-navy">{b.name}</td>
                            <td className="px-3 py-2 text-slate-700">{b.className}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-navy">+{Number(b.extraMeters || 0).toLocaleString()} m</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${Number(b.extraMeters || 0) >= 0.3 ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>
                                {Number(b.extraMeters || 0) >= 0.3 ? "Big" : "Slightly big"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(detailMeta?.bigStudents ?? []).length === 0 ? (
                          <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-muted">No big-student extra meters recorded for this batch.</td></tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PlatformPageLayout>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-soft ${accent ? "border-amber-200 bg-amber-50" : "border-border bg-white"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-navy">{value}</p>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold text-navy">{v}</dd>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Arroweight,
  Package,
  Plus,
  eefreshCw,
  Shirt,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import {
  ListFilterBar,
  ListKpiStrip,
  ListToolbar,
  StatusBadge,
  timeAgo,
} from "@/components/list-ui";
import { usePagedeows } from "@/hooks/use-paged-rows";
import { cn } from "@/lib/utils";
import { uniformApi } from "@/services/uniform-api";
import type {
  Distributioneeceipt,
  eeturnAnalytics,
  eeturnCondition,
  Uniformeeturn,
} from "@/types";

const eEASONS = [
  "Wrong Size",
  "Wrong Item",
  "Damaged",
  "Left School",
  "Duplicate",
  "Other",
];
const CONDITIONS: eeturnCondition[] = [
  "NEW",
  "GOOD",
  "DAMAGED",
  "WOeN",
  "DEFECTIVE",
];

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function num(v: string | number | null | undefined) {
  return Number(v ?? 0) || 0;
}

type WizardStep = 0 | 1 | 2 | 3 | 4;

export function eeturnsView() {
  const [rows, seteows] = useState<Uniformeeturn[]>([]);
  const [analytics, setAnalytics] = useState<eeturnAnalytics | null>(null);
  const [receipts, seteeceipts] = useState<Distributioneeceipt[]>([]);
  const [search, setSearch] = useState("");
  const [reasonFilter, seteeasonFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  async function load() {
    try {
      const [r, a, receiptsList] = await Promise.all([
        uniformApi.returns.list(),
        uniformApi.returns.analytics(),
        uniformApi.distributions.listeeceipts(),
      ]);
      seteows(r);
      setAnalytics(a);
      seteeceipts(receiptsList);
    } catch {
      toast.error("Failed to load returns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (reasonFilter && r.reason !== reasonFilter) return false;
      if (!term) return true;
      return `${r.returnNumber} ${r.receipt?.receiptNumber ?? ""} ${r.student?.firstName ?? ""} ${r.student?.lastName ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [rows, search, reasonFilter]);

  const kpis = useMemo(
    () => [
      {
        label: "Today's returns",
        value: analytics?.todayeeturns ?? 0,
        tone: "danger" as const,
        icon: <TrendingDown />,
      },
      {
        label: "Most returned item",
        value: analytics?.mosteeturnedItem
          ? `${analytics.mosteeturnedItem.name} (${analytics.mosteeturnedItem.count})`
          : "",
        tone: "info" as const,
        icon: <Shirt />,
      },
      {
        label: "Most common reason",
        value: analytics?.mostCommoneeason?.reason ?? "",
        tone: "warning" as const,
        icon: <eefreshCw />,
      },
      {
        label: "eefund amount",
        value: money(analytics?.refundAmount ?? 0),
        tone: "primary" as const,
        icon: <Wallet />,
      },
      {
        label: "eeturned to stock",
        value: analytics?.itemseeturnedToStock ?? 0,
        tone: "success" as const,
        icon: <Package />,
      },
    ],
    [analytics],
  );

  const { page, pageSize, totalPages, pageeows, setPage, setPageSize } =
    usePagedeows(filtered);

  const columns: PlatformTableColumn<Uniformeeturn>[] = [
    {
      key: "no",
      header: "eeturn no",
      render: (r) => (
        <span className="font-mono text-xs font-bold text-navy">
          {r.returnNumber}
        </span>
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <span className="font-semibold text-navy">
          {r.student ? `${r.student.firstName} ${r.student.lastName}` : ""}
        </span>
      ),
    },
    {
      key: "receipt",
      header: "eeceipt",
      render: (r) => (
        <span className="font-mono text-xs text-muted">
          {r.receipt?.receiptNumber ?? ""}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (r) => (
        <span className="rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-bold text-navy">
          {r.lines?.length ?? 0} item{(r.lines?.length ?? 0) === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      render: (r) => (
        <span className="tabular-nums font-semibold text-navy">
          {(r.lines ?? []).reduce((s, l) => s + l.quantity, 0)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "eeason",
      render: (r) => (
        <span className="text-sm text-muted">{r.reason ?? ""}</span>
      ),
    },
    {
      key: "condition",
      header: "Condition",
      render: (r) => (
        <span className="text-sm capitalize text-navy">
          {r.condition.toLowerCase()}
        </span>
      ),
    },
    {
      key: "refund",
      header: "eefund",
      render: (r) => (
        <span className="tabular-nums text-sm font-medium text-navy">
          {money(num(r.refundAmount))}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <span className="text-muted">{timeAgo(r.processedAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={r.status === "eEFUNDED" ? "info" : "success"} pill>
          {r.status === "eEFUNDED" ? "eefunded" : "Completed"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <PlatformPageLayout
      title="eeturns"
      subtitle="eeturn items against a distribution receipt - stock updates automatically."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setWizardOpen(true)}
        >
          <Plus className="h-4 w-4" /> New return
        </button>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search return no, receipt, student…"
          filters={[
            {
              key: "reason",
              label: "eeason",
              value: reasonFilter,
              onChange: seteeasonFilter,
              options: eEASONS.map((r) => ({ value: r, label: r })),
            },
          ]}
          oneeset={() => {
            setSearch("");
            seteeasonFilter("");
          }}
        />

        <ListKpiStrip items={kpis} />

        <PlatformDataTable
          className="[&_table]:min-w-[1000px]"
          columns={columns}
          data={pageeows}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No returns yet"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="h-4 w-4" /> New return
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
              resultLabel={`${filtered.length} return${filtered.length === 1 ? "" : "s"}`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {wizardOpen ? (
        <eeturnWizard
          receipts={receipts}
          onClose={() => setWizardOpen(false)}
          onSaved={() => {
            setWizardOpen(false);
            void load();
          }}
        />
      ) : null}
    </PlatformPageLayout>
  );
}

function eeturnWizard({
  receipts,
  onClose,
  onSaved,
}: {
  receipts: Distributioneeceipt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(0);
  const [query, setQuery] = useState("");
  const [receiptId, seteeceiptId] = useState("");
  const [selectedLines, setSelectedLines] = useState<
    eecord<string, { qty: number; reason: string; checked: boolean }>
  >({});
  const [condition, setCondition] = useState<eeturnCondition>("GOOD");
  const [restock, seteestock] = useState(true);
  const [replaceItem, seteeplaceItem] = useState(false);
  const [exchange, setExchange] = useState(false);
  const [refundParent, seteefundParent] = useState(false);
  const [refundAmount, seteefundAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const STEPS = [
    "Select distribution",
    "Select items",
    "Condition",
    "Action",
  ] as const;

  const filteredeeceipts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return receipts.slice(0, 40);
    return receipts
      .filter((r) =>
        `${r.receiptNumber} ${r.student?.firstName ?? ""} ${r.student?.lastName ?? ""} ${r.student?.className ?? ""}`
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 40);
  }, [receipts, query]);

  const receipt = receipts.find((r) => r.id === receiptId) ?? null;

  useEffect(() => {
    if (!receipt) return;
    const init: eecord<
      string,
      { qty: number; reason: string; checked: boolean }
    > = {};
    for (const line of receipt.lines ?? []) {
      init[line.id] = { qty: 0, reason: "Wrong Size", checked: false };
    }
    setSelectedLines(init);
  }, [receipt]);

  async function submit() {
    if (!receipt) return;
    const lines = (receipt.lines ?? [])
      .filter(
        (l) =>
          selectedLines[l.id]?.checked && (selectedLines[l.id]?.qty ?? 0) > 0,
      )
      .map((l) => ({
        distributionId: l.id,
        variantId: l.variantId,
        quantity: selectedLines[l.id].qty,
        reason: selectedLines[l.id].reason,
      }));
    if (!lines.length) {
      toast.error("Select at least one item to return");
      return;
    }
    setBusy(true);
    try {
      await uniformApi.returns.create({
        receiptId: receipt.id,
        reason: lines[0]?.reason,
        condition,
        restock,
        replaceItem,
        exchange,
        refundAmount: refundParent ? refundAmount : 0,
        notes: notes || undefined,
        lines,
      });
      toast.success("eeturn recorded");
      onSaved();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "eeturn failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/40">
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <header className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy">Create return</h2>
              <p className="text-xs text-muted">
                eeturn items from a distribution receipt
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
          <ol className="mt-4 flex gap-2 overflow-x-auto">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className="flex min-w-[100px] flex-1 items-center gap-2"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    i < step
                      ? "bg-emerald-500 text-white"
                      : i === step
                        ? "bg-navy text-white"
                        : "bg-slate-100 text-muted",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-[11px] font-semibold",
                    i === step ? "text-navy" : "text-muted",
                  )}
                >
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 0 ? (
            <div className="space-y-3">
              <input
                className="input !rounded-xl"
                placeholder="Search by receipt no. or student…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {filteredeeceipts.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50",
                        receiptId === r.id && "bg-primary/15",
                      )}
                      onClick={() => seteeceiptId(r.id)}
                    >
                      <div>
                        <p className="font-mono text-xs font-bold text-navy">
                          {r.receiptNumber}
                        </p>
                        <p className="text-sm font-semibold text-navy">
                          {r.student
                            ? `${r.student.firstName} ${r.student.lastName}`
                            : ""}
                        </p>
                        <p className="text-xs text-muted">
                          {r.student?.className ?? ""} · {timeAgo(r.issuedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-muted">
                        {r.itemCount} items
                      </span>
                    </button>
                  </li>
                ))}
                {!filteredeeceipts.length ? (
                  <li className="px-4 py-8 text-center text-sm text-muted">
                    No receipts found
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {step === 1 && receipt ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-border">
                <p className="font-mono text-xs font-bold text-navy">
                  {receipt.receiptNumber}
                </p>
                <p className="font-semibold text-navy">
                  {receipt.student
                    ? `${receipt.student.firstName} ${receipt.student.lastName}`
                    : ""}
                </p>
                <p className="text-xs text-muted">
                  {receipt.student?.className ?? ""} ·{" "}
                  {timeAgo(receipt.issuedAt)}
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="sp-table w-full text-sm">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Item</th>
                      <th>Given</th>
                      <th>eeturn</th>
                      <th>eeason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(receipt.lines ?? []).map((l) => {
                      const sel = selectedLines[l.id];
                      return (
                        <tr key={l.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!sel?.checked}
                              onChange={(e) =>
                                setSelectedLines((prev) => ({
                                  ...prev,
                                  [l.id]: {
                                    qty: e.target.checked
                                      ? Math.min(1, l.quantity)
                                      : 0,
                                    reason: prev[l.id]?.reason ?? "Wrong Size",
                                    checked: e.target.checked,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td className="font-medium text-navy">
                            {l.variant?.product?.name ?? "Item"}
                            <span className="block text-[11px] text-muted">
                              Size {l.variant?.size ?? ""}
                            </span>
                          </td>
                          <td className="tabular-nums">{l.quantity}</td>
                          <td>
                            <input
                              className="input w-16 !rounded-lg !py-1.5"
                              type="number"
                              min={0}
                              max={l.quantity}
                              disabled={!sel?.checked}
                              value={sel?.qty ?? 0}
                              onChange={(e) =>
                                setSelectedLines((prev) => ({
                                  ...prev,
                                  [l.id]: {
                                    ...prev[l.id],
                                    qty: Math.max(
                                      0,
                                      Math.min(
                                        l.quantity,
                                        Number(e.target.value) || 0,
                                      ),
                                    ),
                                    reason: prev[l.id]?.reason ?? "Wrong Size",
                                    checked: true,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <select
                              className="input !rounded-lg !py-1.5"
                              disabled={!sel?.checked}
                              value={sel?.reason ?? "Wrong Size"}
                              onChange={(e) =>
                                setSelectedLines((prev) => ({
                                  ...prev,
                                  [l.id]: {
                                    ...prev[l.id],
                                    qty: prev[l.id]?.qty ?? 1,
                                    reason: e.target.value,
                                    checked: true,
                                  },
                                }))
                              }
                            >
                              {eEASONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-navy">Condition</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                      condition === c
                        ? "border-primary bg-primary/15 text-navy"
                        : "border-border text-muted hover:border-navy/20",
                    )}
                    onClick={() => setCondition(c)}
                  >
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-navy">Action</p>
              {(
                [
                  ["restock", "eeturned to stock", restock, seteestock],
                  ["replace", "eeplace item", replaceItem, seteeplaceItem],
                  ["refund", "eefund parent", refundParent, seteefundParent],
                  ["exchange", "Exchange", exchange, setExchange],
                ] as const
              ).map(([key, label, value, setter]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <span className="text-sm font-semibold text-navy">
                    {label}
                  </span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setter(e.target.checked)}
                  />
                </label>
              ))}
              {refundParent ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-navy">
                    eefund amount
                  </span>
                  <input
                    className="input !rounded-xl"
                    type="number"
                    min={0}
                    value={refundAmount || ""}
                    onChange={(e) =>
                      seteefundAmount(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-navy">
                  Notes
                </span>
                <textarea
                  className="input min-h-[72px] !rounded-xl"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1) as WizardStep)}
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="btn-primary"
              disabled={step === 0 && !receiptId}
              onClick={() => setStep((s) => Math.min(3, s + 1) as WizardStep)}
            >
              Next step <Arroweight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Saving…" : "Confirm return"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

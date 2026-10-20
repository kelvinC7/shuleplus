"use client";

import { Pencil, X } from "lucide-react";
import { ItemThumb, StatusBadge } from "@/components/list-ui";
import type { UniformProduct } from "@/types";

function productImage(p: UniformProduct): string | null {
  const images = p.images as { role?: string; dataUrl?: string }[] | undefined;
  if (!Array.isArray(images)) return null;
  const main =
    images.find((i) => i?.role === "main" && i.dataUrl) ??
    images.find((i) => i?.dataUrl);
  return main?.dataUrl ?? null;
}

function stockFor(p: UniformProduct) {
  return (p.variants ?? []).reduce(
    (sum, v) => sum + (v.stockBalance?.available ?? 0),
    0,
  );
}

function stockStatus(qty: number, reorder = 20): "in" | "low" | "out" {
  if (qty <= 0) return "out";
  if (qty <= reorder) return "low";
  return "in";
}

function genderLabel(g: string) {
  if (g === "MALE") return "Boys";
  if (g === "FEMALE") return "Girls";
  return "Unisex";
}

function educationLabel(e: string) {
  const map: Record<string, string> = {
    NURSERY: "Nursery",
    PRIMARY: "Primary",
    SECONDARY: "O-Level",
    TVET: "A-Level",
    ALL: "All levels",
  };
  return map[e] ?? e;
}

function supplyLabel(method: string) {
  return method === "FABRIC_TAILORING" ? "Fabric-made" : "Ready-made";
}

function money(n: string | number) {
  return `${Math.round(Number(n) || 0).toLocaleString()} RWF`;
}

function metaString(p: UniformProduct, key: string): string {
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  const v = meta[key];
  return v != null && v !== "" ? String(v) : "";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-navy">{value}</span>
    </div>
  );
}

export function ProductDetailDrawer({
  product,
  onClose,
  onEdit,
}: {
  product: UniformProduct;
  onClose: () => void;
  onEdit: () => void;
}) {
  const qty = stockFor(product);
  const ss = stockStatus(qty);
  const meta = (product.metadata ?? {}) as Record<string, unknown>;
  const stockUnit = metaString(product, "stockUnit") || "pcs";
  const description =
    product.description ?? metaString(product, "description");
  const careInstructions = metaString(product, "careInstructions");
  const academicYear = metaString(product, "academicYear");
  const term = metaString(product, "term");
  const variants = product.variants ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <ItemThumb
              src={productImage(product)}
              fallback={product.name}
              className="h-14 w-14 rounded-xl"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Uniform Item
              </p>
              <h3 className="truncate text-lg font-bold text-navy">
                {product.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <StatusBadge tone={product.isActive ? "success" : "neutral"}>
                  {product.isActive ? "Active" : "Hidden / Draft"}
                </StatusBadge>
                <StatusBadge
                  tone={
                    ss === "in" ? "success" : ss === "low" ? "warning" : "danger"
                  }
                >
                  {ss === "in"
                    ? "In Stock"
                    : ss === "low"
                      ? "Low Stock"
                      : "Out of Stock"}
                </StatusBadge>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-navy"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Selling price
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-navy">
                {money(product.sellingPrice)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Stock on hand
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-navy">
                {qty.toLocaleString()} {stockUnit}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              Details
            </p>
            <div className="divide-y divide-border">
              <DetailRow label="Item code" value={product.sku ?? ""} />
              <DetailRow
                label="Education level"
                value={educationLabel(product.educationLevel)}
              />
              <DetailRow label="Gender" value={genderLabel(product.gender)} />
              <DetailRow
                label="Supply method"
                value={supplyLabel(product.supplyMethod)}
              />
              <DetailRow label="Cost price" value={money(product.costPrice)} />
              <DetailRow label="Material" value={product.material ?? ""} />
              <DetailRow label="Color" value={product.color ?? ""} />
              {academicYear ? (
                <DetailRow
                  label="Academic period"
                  value={[academicYear, term].filter(Boolean).join(" · ")}
                />
              ) : null}
            </div>
          </section>

          {variants.length > 0 ? (
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                Variants ({variants.length})
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {variants.map((v) => {
                  const available = v.stockBalance?.available ?? 0;
                  const price = v.sellingPrice ?? product.sellingPrice;
                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy">
                          Size {v.size}
                          {v.color ? ` · ${v.color}` : ""}
                        </p>
                        <p className="text-xs text-muted">
                          {v.sku || product.sku || ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums text-navy">
                          {available.toLocaleString()} {stockUnit}
                        </p>
                        <p className="text-[11px] text-muted">{money(price)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {description ? (
            <section className="rounded-xl border border-border p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                Description
              </p>
              <p className="text-sm leading-relaxed text-navy">{description}</p>
            </section>
          ) : null}

          {careInstructions ? (
            <section className="rounded-xl border border-border p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                Care instructions
              </p>
              <p className="text-sm leading-relaxed text-navy">
                {careInstructions}
              </p>
            </section>
          ) : null}
        </div>

        <footer className="flex gap-2 border-t border-border p-4">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary flex-1" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Edit item
          </button>
        </footer>
      </div>
    </div>
  );
}

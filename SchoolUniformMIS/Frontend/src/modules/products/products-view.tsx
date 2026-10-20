"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Package,
  PackageX,
  Plus,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import {
  ItemThumb,
  ListFilterBar,
  ListKpiStrip,
  ListToolbar,
  StatusBadge,
  timeAgo,
} from "@/components/list-ui";
import { uniformApi } from "@/services/uniform-api";
import type { UniformProduct } from "@/types";
import { ProductFormWizard } from "./product-form-wizard";
import { ProductDetailDrawer } from "./product-detail-drawer";

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

export function ProductsView() {
  const [products, setProducts] = useState<UniformProduct[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<UniformProduct | null>(null);
  const [viewProduct, setViewProduct] = useState<UniformProduct | null>(null);
  const [page, setPage] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setProducts(
        await uniformApi.products.list({ search: search || undefined }),
      );
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (status === "active" && !p.isActive) return false;
      if (status === "hidden" && p.isActive) return false;
      const qty = stockFor(p);
      const ss = stockStatus(qty);
      if (stockFilter === "in" && ss !== "in") return false;
      if (stockFilter === "low" && ss !== "low") return false;
      if (stockFilter === "out" && ss !== "out") return false;
      return true;
    });
  }, [products, status, stockFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((p) => p.isActive).length;
    const low = filtered.filter(
      (p) => stockStatus(stockFor(p)) === "low",
    ).length;
    const out = filtered.filter(
      (p) => stockStatus(stockFor(p)) === "out",
    ).length;
    return [
      {
        label: "Total Items",
        value: total,
        tone: "purple" as const,
        icon: <Package />,
      },
      {
        label: "Active Items",
        value: active,
        tone: "success" as const,
        icon: <CheckCircle2 />,
      },
      {
        label: "Low Stock Items",
        value: low,
        tone: "warning" as const,
        icon: <AlertTriangle />,
      },
      {
        label: "Out of Stock Items",
        value: out,
        tone: "danger" as const,
        icon: <PackageX />,
      },
    ];
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [status, stockFilter, search, pageSize]);

  const columns: PlatformTableColumn<UniformProduct>[] = [
    {
      key: "item",
      header: "Item",
      render: (p) => (
        <div className="flex items-center gap-3">
          <ItemThumb src={productImage(p)} fallback={p.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">{p.name}</p>
            <p className="text-xs text-muted">
              {educationLabel(p.educationLevel)} · {genderLabel(p.gender)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "code",
      header: "Code",
      render: (p) => (
        <span className="font-mono text-xs font-medium text-navy">
          {p.sku || ""}
        </span>
      ),
    },
    {
      key: "variants",
      header: "Variants",
      render: (p) => {
        const variants = p.variants ?? [];
        const sizes = new Set(variants.map((v) => v.size)).size;
        const colors = new Set(variants.map((v) => v.color ?? "")).size;
        return (
          <span className="text-muted">
            {sizes} size{sizes === 1 ? "" : "s"}, {colors} color
            {colors === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      key: "price",
      header: "Selling Price",
      render: (p) => (
        <span className="font-semibold tabular-nums text-navy">
          RWF {Number(p.sellingPrice).toLocaleString()}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => (
        <span className="tabular-nums text-navy">{stockFor(p)} pcs</span>
      ),
    },
    {
      key: "stockStatus",
      header: "Stock Status",
      render: (p) => {
        const ss = stockStatus(stockFor(p));
        return (
          <StatusBadge
            tone={ss === "in" ? "success" : ss === "low" ? "warning" : "danger"}
          >
            {ss === "in"
              ? "In Stock"
              : ss === "low"
                ? "Low Stock"
                : "Out of Stock"}
          </StatusBadge>
        );
      },
    },
    {
      key: "updated",
      header: "Updated",
      render: (p) => <span className="text-muted">{timeAgo(p.updatedAt)}</span>,
    },
  ];

  async function duplicate(p: UniformProduct) {
    try {
      await uniformApi.products.create({
        name: `${p.name} (Copy)`,
        sku: undefined,
        barcode: undefined,
        gender: p.gender,
        educationLevel: p.educationLevel,
        color: p.color ?? undefined,
        material: p.material ?? undefined,
        sellingPrice: p.sellingPrice,
        costPrice: p.costPrice,
        supplyMethod: p.supplyMethod,
        fabricMetersPerItem: p.fabricMetersPerItem ?? undefined,
        isActive: false,
        variants: (p.variants ?? []).map((v) => ({
          size: v.size,
          color: v.color ?? undefined,
          sleeve: v.sleeve,
          sellingPrice: v.sellingPrice ?? p.sellingPrice,
          costPrice: v.costPrice ?? p.costPrice,
          openingStock: 0,
        })),
      });
      toast.success("Item duplicated as draft");
      void load();
    } catch {
      toast.error("Duplicate failed");
    }
  }

  function openView(p: UniformProduct) {
    setViewProduct(p);
  }

  function openEdit(p: UniformProduct) {
    setViewProduct(null);
    setEditProduct(p);
    setOpen(true);
  }

  function exportCsv() {
    const header = "name,sku,gender,educationLevel,sellingPrice,costPrice,color,material,isActive";
    const lines = products.map((p) =>
      [
        p.name,
        p.sku ?? "",
        p.gender,
        p.educationLevel,
        p.sellingPrice,
        p.costPrice,
        p.color ?? "",
        p.material ?? "",
        p.isActive ? "true" : "false",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "uniform-products.csv";
    a.click();
    toast.success("Export downloaded");
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV needs a header and rows");
      return;
    }
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const nameIdx = header.findIndex((h) => h === "name");
    if (nameIdx < 0) {
      toast.error("CSV must include a name column");
      return;
    }
    let created = 0;
    for (const line of lines.slice(1)) {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const name = cols[nameIdx];
      if (!name) continue;
      try {
        await uniformApi.products.create({
          name,
          sku: cols[header.indexOf("sku")] || undefined,
          gender: cols[header.indexOf("gender")] || "UNISEX",
          educationLevel: cols[header.indexOf("educationlevel")] || "ALL",
          sellingPrice: cols[header.indexOf("sellingprice")] || "0",
          costPrice: cols[header.indexOf("costprice")] || "0",
          color: cols[header.indexOf("color")] || undefined,
          material: cols[header.indexOf("material")] || undefined,
          isActive: cols[header.indexOf("isactive")] !== "false",
        });
        created += 1;
      } catch {
        /* skip invalid row */
      }
    }
    toast.success(`Imported ${created} item(s)`);
    void load();
  }

  return (
    <PlatformPageLayout
      title="Uniform Items"
      subtitle="Manage all uniform stock across your organization."
      actions={
        <>
          <button
            type="button"
            className="btn-secondary !py-2"
            onClick={exportCsv}
          >
            <Download size={15} /> Export
          </button>
          <button
            type="button"
            className="btn-secondary !py-2"
            onClick={() => importRef.current?.click()}
          >
            <Upload size={15} /> Import
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importCsv(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditProduct(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add New Item
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, code or barcode…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: status,
              onChange: setStatus,
              options: [
                { value: "active", label: "Active" },
                { value: "hidden", label: "Hidden / Draft" },
              ],
            },
            {
              key: "stock",
              label: "Stock",
              value: stockFilter,
              onChange: setStockFilter,
              options: [
                { value: "in", label: "In Stock" },
                { value: "low", label: "Low Stock" },
                { value: "out", label: "Out of Stock" },
              ],
            },
          ]}
          onReset={() => {
            setSearch("");
            setStatus("");
            setStockFilter("");
          }}
          onApply={() => void load()}
        />

        <ListKpiStrip items={kpis} />

        <PlatformDataTable
          columns={columns}
          data={pageRows}
          rowKey={(p) => p.id}
          loading={loading}
          emptyMessage="No uniform items found"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditProduct(null);
                setOpen(true);
              }}
            >
              <Plus size={15} /> Add New Item
            </button>
          }
          selected={selected}
          onSelectRow={(id) => {
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectAll={() => {
            if (selected.size === pageRows.length) setSelected(new Set());
            else setSelected(new Set(pageRows.map((p) => p.id)));
          }}
          allSelected={pageRows.length > 0 && selected.size === pageRows.length}
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          onRowClick={openView}
          onView={openView}
          onEdit={openEdit}
          onDuplicate={(p) => void duplicate(p)}
          toolbar={
            <ListToolbar
              resultLabel={`${filtered.length} item${filtered.length === 1 ? "" : "s"} found`}
              pageSize={pageSize}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          }
        />
      </div>

      <ProductFormWizard
        open={open}
        editProduct={editProduct}
        onClose={() => {
          setOpen(false);
          setEditProduct(null);
        }}
        onSaved={() => void load()}
      />

      {viewProduct ? (
        <ProductDetailDrawer
          product={viewProduct}
          onClose={() => setViewProduct(null)}
          onEdit={() => openEdit(viewProduct)}
        />
      ) : null}
    </PlatformPageLayout>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ImagePlus,
  Package,
  Plus,
  Shirt,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/contexts/settings-context";
import { useAcademicPeriod } from "@/contexts/academic-period-context";
import { uniformApi } from "@/services/uniform-api";
import type { FabricIssue, Tailor, UniformProduct } from "@/types";
import {
  GENDER_OPTIONS,
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  STOCK_UNIT_PRESETS,
  autoProductCode,
  buildWizardSteps,
  calcFormMetrics,
  calcTotalVariantStock,
  emptyProductForm,
  productToForm,
  rebuildVariantRows,
  toApiPayload,
  type ProductFormState,
  type ProductImageSlot,
  type WizardStepId,
} from "./product-form-types";

interface ProductFormWizardProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editProduct?: UniformProduct | null;
}

function money(n: number) {
  return `${Math.round(n).toLocaleString()} RWF`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-navy">
      {children}
    </label>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hr-card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy/5 text-navy">
          <Shirt size={16} strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-navy">
      <input
        type="checkbox"
        className="accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function fabricIssueLabel(issue: FabricIssue): string {
  const name = issue.fabric?.name ?? "Fabric";
  const color = issue.fabric?.color ? ` (${issue.fabric.color})` : "";
  const meters = Number(issue.meters || 0).toFixed(1);
  const date = new Date(issue.issuedAt).toLocaleDateString();
  return `${name}${color} · ${meters} m stock-out · ${date}`;
}

export function ProductFormWizard({
  open,
  onClose,
  onSaved,
  editProduct = null,
}: ProductFormWizardProps) {
  const { settings } = useSettings();
  const { year: periodYear, term: periodTerm, loading: periodLoading } =
    useAcademicPeriod();
  const fabricEnabled = Boolean(
    settings?.enableFabricManagement || settings?.enableTailoring,
  );

  const [form, setForm] = useState<ProductFormState>(emptyProductForm());
  const [stepId, setStepId] = useState<WizardStepId>("basic");
  const [saving, setSaving] = useState(false);
  const [fabricIssues, setFabricIssues] = useState<FabricIssue[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRole = useRef<ProductImageSlot["role"]>("main");

  useEffect(() => {
    if (!open) return;
    setForm(editProduct ? productToForm(editProduct) : emptyProductForm());
    setStepId("basic");
    setCustomSize("");
    setCustomColor("");
    void Promise.all([
      fabricEnabled
        ? uniformApi.fabricIssues.list().catch(() => [])
        : Promise.resolve([]),
      settings?.enableTailoring
        ? uniformApi.tailors.list().catch(() => [])
        : Promise.resolve([]),
    ]).then(([issues, t]) => {
      setFabricIssues(issues as FabricIssue[]);
      setTailors(t as Tailor[]);
    });
  }, [open, editProduct, fabricEnabled, settings?.enableTailoring]);

  useEffect(() => {
    if (!form.toggles.hasVariants) return;
    setForm((prev) => ({ ...prev, variantRows: rebuildVariantRows(prev) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild when size/color selections change
  }, [
    form.sizeOptions.join("|"),
    form.colorOptions.join("|"),
    form.toggles.hasVariants,
  ]);

  const steps = useMemo(
    () => buildWizardSteps(form, fabricEnabled),
    [form, fabricEnabled],
  );
  const stepIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === stepId),
  );
  const activeStep = steps[stepIndex] ?? steps[0];
  const metrics = useMemo(() => calcFormMetrics(form), [form]);
  const totalVariantStock = useMemo(() => calcTotalVariantStock(form), [form]);

  useEffect(() => {
    if (!form.toggles.hasVariants) return;
    const next = totalVariantStock > 0 ? String(totalVariantStock) : "";
    setForm((prev) =>
      prev.uniformOutputQty === next
        ? prev
        : { ...prev, uniformOutputQty: next },
    );
  }, [form.toggles.hasVariants, totalVariantStock]);

  useEffect(() => {
    if (!steps.some((s) => s.id === stepId) && steps[0]) setStepId(steps[0].id);
  }, [steps, stepId]);

  function patch(partial: Partial<ProductFormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function patchToggle(key: keyof ProductFormState["toggles"], value: boolean) {
    setForm((prev) => {
      const toggles = { ...prev.toggles, [key]: value };
      if (key === "fabricMade" && value) toggles.canBeProduced = true;
      if (key === "canBePurchasedOnly" && value) toggles.canBeSold = false;
      return { ...prev, toggles };
    });
  }

  function ensureSku() {
    if (form.sku.trim()) return form.sku;
    const code = autoProductCode(form.name || "Uniform");
    patch({ sku: code });
    return code;
  }

  async function handleImageFile(file: File, role: ProductImageSlot["role"]) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      toast.error("Use JPG, PNG or WEBP");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    setForm((prev) => {
      const others = prev.images.filter(
        (i) => i.role !== role || role === "gallery",
      );
      return {
        ...prev,
        images: [...others, { role, dataUrl, name: file.name }],
      };
    });
  }

  async function save(draft: boolean) {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      setStepId("basic");
      return;
    }
    if (!(Number(form.sellingPrice) > 0) && form.toggles.canBeSold) {
      toast.error("Enter a selling price");
      setStepId("pricing");
      return;
    }

    if (form.toggles.fabricMade && !form.fabricIssueId) {
      toast.error("Select a fabric stock-out batch from Fabric Stock Out");
      setStepId("fabric");
      return;
    }
    if (
      form.toggles.fabricMade &&
      form.fabricIssueId &&
      !(Number(form.uniformOutputQty) > 0)
    ) {
      toast.error("Enter how many uniforms come from this stock-out");
      setStepId("fabric");
      return;
    }
    if (form.toggles.fabricMade && form.toggles.hasVariants) {
      const variantTotal = calcTotalVariantStock(form);
      if (Number(form.uniformOutputQty) !== variantTotal) {
        toast.error(
          `Uniform output must equal variant stock total (${variantTotal} pieces)`,
        );
        setStepId("fabric");
        return;
      }
    }
    if (form.stockUnit === "__other__" && !form.stockUnitCustom.trim()) {
      toast.error("Enter a custom stock unit");
      setStepId("inventory");
      return;
    }

    setSaving(true);
    try {
      const sku = ensureSku();
      const outputQty = Number(form.uniformOutputQty) || 0;
      const formForSave =
        form.toggles.fabricMade &&
        outputQty > 0 &&
        !form.toggles.hasVariants &&
        !(Number(form.openingStock) > 0)
          ? { ...form, openingStock: String(outputQty) }
          : form;
      const payload = toApiPayload(
        { ...formForSave, sku, academicYear: periodYear, term: periodTerm },
        draft,
        { year: periodYear, term: periodTerm },
      );
      if (editProduct) {
        await uniformApi.products.update(editProduct.id, payload);
        toast.success(draft ? "Draft saved" : "Product updated");
      } else {
        await uniformApi.products.create(payload);
        toast.success(draft ? "Draft saved" : "Uniform item created");
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Save failed",
      );
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (stepIndex < steps.length - 1) setStepId(steps[stepIndex + 1].id);
    else void save(false);
  }

  function goPrev() {
    if (stepIndex > 0) setStepId(steps[stepIndex - 1].id);
  }

  const mainImage =
    form.images.find((i) => i.role === "main") ?? form.images[0];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/40 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-[min(1120px,92vw)] flex-col bg-[#f5f7fb] shadow-2xl">
        {/* Sticky header */}
        <header className="shrink-0 border-b border-border bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-muted">
                Uniforms / Uniform Items / {editProduct ? "Edit" : "New"}{" "}
                Uniform Item
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-navy sm:text-xl">
                  {editProduct ? "Edit Uniform Item" : "New Uniform Item"}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    form.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {form.status === "ACTIVE" ? "Active" : "Hidden"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-secondary !py-2"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-secondary !py-2"
                onClick={() => void save(true)}
                disabled={saving}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="btn-primary !py-2"
                onClick={() => void save(false)}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-muted hover:bg-slate-100 hover:text-navy"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {steps.map((s, i) => {
              const active = s.id === activeStep.id;
              const done = i < stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStepId(s.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-primary text-navy"
                      : done
                        ? "bg-navy/10 text-navy"
                        : "bg-white text-muted ring-1 ring-border"
                  }`}
                >
                  {done ? (
                    <span className="mr-1 inline-flex">
                      <Check size={12} />
                    </span>
                  ) : null}
                  {s.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-6">
            <div className="space-y-4">
              {/* Essential toggles only */}
              <div className="hr-card flex flex-wrap gap-2 p-3">
                <ToggleChip
                  label="Track Inventory"
                  checked={form.toggles.trackInventory}
                  onChange={(v) => patchToggle("trackInventory", v)}
                />
                <ToggleChip
                  label="Has Variants"
                  checked={form.toggles.hasVariants}
                  onChange={(v) => patchToggle("hasVariants", v)}
                />
                {fabricEnabled ? (
                  <ToggleChip
                    label="Fabric-made"
                    checked={form.toggles.fabricMade}
                    onChange={(v) => patchToggle("fabricMade", v)}
                  />
                ) : null}
                <ToggleChip
                  label="Allow Discount"
                  checked={form.toggles.allowDiscount}
                  onChange={(v) => patchToggle("allowDiscount", v)}
                />
              </div>

              {activeStep.id === "basic" ? (
                <SectionCard
                  title="Basic Information"
                  hint="Provide basic details about the uniform item."
                >
                  <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
                    <div>
                      <FieldLabel>Product Image</FieldLabel>
                      <div className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-slate-50">
                        {mainImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mainImage.dataUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlus className="text-muted" size={28} />
                        )}
                        <div className="absolute bottom-2 flex gap-1">
                          <button
                            type="button"
                            className="rounded-lg bg-white/95 p-1.5 shadow"
                            onClick={() => {
                              uploadRole.current = "main";
                              fileRef.current?.click();
                            }}
                          >
                            <Camera size={14} />
                          </button>
                          {mainImage ? (
                            <button
                              type="button"
                              className="rounded-lg bg-white/95 p-1.5 text-danger shadow"
                              onClick={() =>
                                patch({
                                  images: form.images.filter(
                                    (i) => i.role !== "main",
                                  ),
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-muted">
                        JPG, PNG, WEBP · max 2MB
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <FieldLabel>Product Name</FieldLabel>
                        <input
                          className="input"
                          value={form.name}
                          onChange={(e) => patch({ name: e.target.value })}
                          placeholder="Blue Short Sleeve Shirt"
                        />
                      </div>
                      <div>
                        <FieldLabel>Product Code</FieldLabel>
                        <div className="flex gap-2">
                          <input
                            className="input"
                            value={form.sku}
                            onChange={(e) => patch({ sku: e.target.value })}
                            placeholder="Auto generated"
                          />
                          <button
                            type="button"
                            className="btn-secondary shrink-0 !px-3"
                            onClick={() => ensureSku()}
                          >
                            Auto
                          </button>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Gender</FieldLabel>
                        <select
                          className="input"
                          value={form.gender}
                          onChange={(e) =>
                            patch({
                              gender: e.target
                                .value as ProductFormState["gender"],
                            })
                          }
                        >
                          {GENDER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Product Type</FieldLabel>
                        <select
                          className="input"
                          value={form.toggles.fabricMade ? "FABRIC" : "READY"}
                          onChange={(e) =>
                            patchToggle(
                              "fabricMade",
                              e.target.value === "FABRIC",
                            )
                          }
                          disabled={!fabricEnabled}
                        >
                          <option value="READY">Ready-made</option>
                          {fabricEnabled ? (
                            <option value="FABRIC">Fabric-made</option>
                          ) : null}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Status</FieldLabel>
                        <select
                          className="input"
                          value={form.status}
                          onChange={(e) =>
                            patch({
                              status: e.target
                                .value as ProductFormState["status"],
                            })
                          }
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="HIDDEN">Hidden</option>
                        </select>
                      </div>
                      <div className="flex items-end gap-3 sm:col-span-2">
                        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5">
                          <Switch
                            checked={form.toggles.canBeSold}
                            onCheckedChange={(v) =>
                              patchToggle("canBeSold", Boolean(v))
                            }
                          />
                          <span className="text-sm font-medium text-navy">
                            Allow to sell
                          </span>
                        </div>
                      </div>
                      <div className="sm:col-span-2 rounded-md border border-border bg-slate-50 px-3 py-2.5 text-sm text-navy">
                        <span className="text-muted">Academic period: </span>
                        <span className="font-semibold">
                          {periodLoading
                            ? "Loading…"
                            : `${periodYear || "—"} · ${periodTerm || "—"}`}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          From organization academic settings. Change in Academic
                          Settings.
                        </span>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              {activeStep.id === "pricing" ? (
                <SectionCard
                  title="Selling & Cost Information"
                  hint="Prices drive profit margin in the summary."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Selling Price (RWF)</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={form.sellingPrice}
                        onChange={(e) =>
                          patch({ sellingPrice: e.target.value })
                        }
                      />
                    </div>
                    {form.toggles.allowDiscount ? (
                      <div>
                        <FieldLabel>Discount %</FieldLabel>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          max={100}
                          value={form.discountPercent}
                          onChange={(e) =>
                            patch({ discountPercent: e.target.value })
                          }
                        />
                      </div>
                    ) : null}
                    {form.toggles.taxable ? (
                      <div>
                        <FieldLabel>Tax Category</FieldLabel>
                        <select
                          className="input"
                          value={form.taxCategory}
                          onChange={(e) =>
                            patch({ taxCategory: e.target.value })
                          }
                        >
                          <option>Standard</option>
                          <option>Zero-rated</option>
                          <option>Exempt</option>
                        </select>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Switch
                        checked={form.vatIncluded}
                        onCheckedChange={(v) =>
                          patch({ vatIncluded: Boolean(v) })
                        }
                      />
                      <span className="text-sm text-navy">VAT Included</span>
                    </div>
                    <div>
                      <FieldLabel>Purchase Cost (RWF)</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={form.purchaseCost}
                        onChange={(e) =>
                          patch({ purchaseCost: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Preferred Supplier</FieldLabel>
                      <input
                        className="input"
                        value={form.preferredSupplier}
                        onChange={(e) =>
                          patch({ preferredSupplier: e.target.value })
                        }
                        placeholder="Supplier name"
                      />
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              {activeStep.id === "inventory" ? (
                <SectionCard
                  title="Inventory Settings"
                  hint="Opening stock and storage details."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Opening Stock</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={form.openingStock}
                        onChange={(e) =>
                          patch({ openingStock: e.target.value })
                        }
                        disabled={form.toggles.hasVariants}
                      />
                      {form.toggles.hasVariants ? (
                        <p className="mt-1 text-[10px] text-muted">
                          Set stock per variant in Variants step.
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <FieldLabel>Stock Unit</FieldLabel>
                      <select
                        className="input"
                        value={
                          form.stockUnit === "__other__" ||
                          !(STOCK_UNIT_PRESETS as readonly string[]).includes(
                            form.stockUnit,
                          )
                            ? "__other__"
                            : form.stockUnit
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__other__") {
                            patch({ stockUnit: "__other__" });
                          } else {
                            patch({ stockUnit: v, stockUnitCustom: "" });
                          }
                        }}
                      >
                        {STOCK_UNIT_PRESETS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                        <option value="__other__">Other</option>
                      </select>
                      {(form.stockUnit === "__other__" ||
                        !(STOCK_UNIT_PRESETS as readonly string[]).includes(
                          form.stockUnit,
                        )) && (
                        <input
                          className="input mt-2"
                          value={form.stockUnitCustom}
                          onChange={(e) =>
                            patch({
                              stockUnit: "__other__",
                              stockUnitCustom: e.target.value,
                            })
                          }
                          placeholder="e.g. dozen, bundle, roll"
                        />
                      )}
                    </div>
                    <div>
                      <FieldLabel>Minimum Sale Quantity</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={form.minimumSaleQty}
                        onChange={(e) =>
                          patch({ minimumSaleQty: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              {activeStep.id === "variants" ? (
                <SectionCard
                  title="Variant Configuration"
                  hint="Add only sizes and colors your school uses, then set stock and price."
                >
                  <div className="space-y-5">
                    <div className="rounded-xl border border-border bg-slate-50/60 p-4">
                      <FieldLabel>Sizes</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ...PRODUCT_SIZES,
                          ...form.sizeOptions.filter(
                            (s) =>
                              !(PRODUCT_SIZES as readonly string[]).includes(s),
                          ),
                        ].map((size) => {
                          const on = form.sizeOptions.includes(size);
                          return (
                            <button
                              key={size}
                              type="button"
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                                on
                                  ? "bg-primary text-navy ring-primary"
                                  : "bg-white text-muted ring-border"
                              }`}
                              onClick={() =>
                                patch({
                                  sizeOptions: on
                                    ? form.sizeOptions.filter((s) => s !== size)
                                    : [...form.sizeOptions, size],
                                })
                              }
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex max-w-md gap-2">
                        <input
                          className="input !rounded-full !py-2"
                          placeholder="Add custom size…"
                          value={customSize}
                          onChange={(e) => setCustomSize(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const v = customSize.trim();
                            if (!v) return;
                            if (!form.sizeOptions.includes(v))
                              patch({ sizeOptions: [...form.sizeOptions, v] });
                            setCustomSize("");
                          }}
                        />
                        <button
                          type="button"
                          className="btn-secondary shrink-0 !rounded-full !px-3"
                          onClick={() => {
                            const v = customSize.trim();
                            if (!v) return;
                            if (!form.sizeOptions.includes(v))
                              patch({ sizeOptions: [...form.sizeOptions, v] });
                            setCustomSize("");
                          }}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-slate-50/60 p-4">
                      <FieldLabel>Colors</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ...PRODUCT_COLORS,
                          ...form.colorOptions.filter(
                            (c) =>
                              !(PRODUCT_COLORS as readonly string[]).includes(
                                c,
                              ),
                          ),
                        ].map((color) => {
                          const on = form.colorOptions.includes(color);
                          return (
                            <button
                              key={color}
                              type="button"
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                                on
                                  ? "bg-navy text-white ring-navy"
                                  : "bg-white text-muted ring-border"
                              }`}
                              onClick={() =>
                                patch({
                                  colorOptions: on
                                    ? form.colorOptions.filter(
                                        (c) => c !== color,
                                      )
                                    : [...form.colorOptions, color],
                                })
                              }
                            >
                              {color}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex max-w-md gap-2">
                        <input
                          className="input !rounded-full !py-2"
                          placeholder="Add custom color…"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const v = customColor.trim();
                            if (!v) return;
                            if (!form.colorOptions.includes(v))
                              patch({
                                colorOptions: [...form.colorOptions, v],
                              });
                            setCustomColor("");
                          }}
                        />
                        <button
                          type="button"
                          className="btn-secondary shrink-0 !rounded-full !px-3"
                          onClick={() => {
                            const v = customColor.trim();
                            if (!v) return;
                            if (!form.colorOptions.includes(v))
                              patch({
                                colorOptions: [...form.colorOptions, v],
                              });
                            setCustomColor("");
                          }}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                    <table className="sp-table w-full min-w-[480px] text-sm">
                      <thead>
                        <tr>
                          <th>Size</th>
                          <th>Color</th>
                          <th>Stock</th>
                          <th>Selling Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.variantRows.map((row) => (
                          <tr key={row.key}>
                            <td className="font-medium text-navy">
                              {row.size}
                            </td>
                            <td>{row.color}</td>
                            <td>
                              <input
                                className="input !rounded-lg !py-1.5"
                                type="number"
                                min={0}
                                value={row.stock}
                                onChange={(e) =>
                                  patch({
                                    variantRows: form.variantRows.map((r) =>
                                      r.key === row.key
                                        ? { ...r, stock: e.target.value }
                                        : r,
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="input !rounded-lg !py-1.5"
                                type="number"
                                min={0}
                                value={row.sellingPrice}
                                onChange={(e) =>
                                  patch({
                                    variantRows: form.variantRows.map((r) =>
                                      r.key === row.key
                                        ? { ...r, sellingPrice: e.target.value }
                                        : r,
                                    ),
                                  })
                                }
                              />
                            </td>
                          </tr>
                        ))}
                        {form.variantRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="!py-8 text-center text-muted"
                            >
                              Select or add at least one size and color.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}

              {activeStep.id === "fabric" ? (
                <SectionCard
                  title="Fabric Information"
                  hint="Pick an existing fabric stock-out batch, then say how many uniforms it produces."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel>Fabric stock-out batch</FieldLabel>
                      <select
                        className="input"
                        value={form.fabricIssueId}
                        onChange={(e) =>
                          patch({ fabricIssueId: e.target.value })
                        }
                      >
                        <option value="">
                          Choose a stock-out (create under Fabric → Stock Out)
                        </option>
                        {fabricIssues.map((issue) => (
                          <option key={issue.id} value={issue.id}>
                            {fabricIssueLabel(issue)}
                          </option>
                        ))}
                      </select>
                      {fabricIssues.length === 0 ? (
                        <p className="mt-1 text-[11px] text-amber-700">
                          No fabric stock-outs yet. Stock in fabric, then record
                          stock-out meters before linking a uniform item.
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <FieldLabel>Uniform output (pieces)</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        step={1}
                        value={
                          form.toggles.hasVariants
                            ? totalVariantStock > 0
                              ? String(totalVariantStock)
                              : ""
                            : form.uniformOutputQty
                        }
                        readOnly={form.toggles.hasVariants}
                        onChange={(e) => {
                          if (form.toggles.hasVariants) return;
                          const qty = e.target.value;
                          patch({
                            uniformOutputQty: qty,
                            ...(!(Number(form.openingStock) > 0)
                              ? { openingStock: qty }
                              : {}),
                          });
                        }}
                        placeholder="e.g. 50"
                      />
                      <p className="mt-1 text-[10px] text-muted">
                        {form.toggles.hasVariants
                          ? `Auto-calculated from variant stock (${totalVariantStock} pcs total).`
                          : "How many uniforms come from the selected stock-out meters."}
                      </p>
                    </div>
                    <div>
                      <FieldLabel>Estimated Tailoring Cost</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={form.estimatedTailoringCost}
                        onChange={(e) =>
                          patch({ estimatedTailoringCost: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              {activeStep.id === "images" ? (
                <SectionCard title="Photos" hint="Add a clear product photo.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["main", "gallery"] as const).map((role) => {
                      const img = form.images.find((i) => i.role === role);
                      const label =
                        role === "main"
                          ? "Main photo"
                          : "Extra photo (optional)";
                      return (
                        <div key={role}>
                          <FieldLabel>{label}</FieldLabel>
                          <button
                            type="button"
                            className="flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-white"
                            onClick={() => {
                              uploadRole.current = role;
                              fileRef.current?.click();
                            }}
                          >
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img.dataUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <>
                                <ImagePlus className="text-muted" size={22} />
                                <span className="mt-1 text-xs text-muted">
                                  Upload JPG / PNG
                                </span>
                              </>
                            )}
                          </button>
                          {img ? (
                            <button
                              type="button"
                              className="btn-ghost mt-2 text-xs"
                              onClick={() =>
                                patch({
                                  images: form.images.filter(
                                    (i) => i.role !== role,
                                  ),
                                })
                              }
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              ) : null}

              {activeStep.id === "description" ? (
                <SectionCard
                  title="Other notes"
                  hint="Optional notes for staff."
                >
                  <textarea
                    className="input min-h-[120px] !rounded-xl"
                    value={form.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder="e.g. Embroidered logo on left chest · wash cold…"
                  />
                </SectionCard>
              ) : null}

              <div className="flex items-center justify-between rounded-md border border-sky-100 bg-sky-50 px-4 py-3">
                <p className="text-sm text-navy">
                  {stepIndex < steps.length - 1
                    ? `Next: ${steps[stepIndex + 1]?.label}`
                    : "Ready to save this uniform item"}
                </p>
                <button
                  type="button"
                  className="btn-primary !py-2"
                  onClick={goNext}
                  disabled={saving}
                >
                  {stepIndex < steps.length - 1 ? (
                    <>
                      Next Step <ArrowRight size={14} />
                    </>
                  ) : (
                    "Save & Finish"
                  )}
                </button>
              </div>
            </div>

            {/* Summary panel */}
            <aside className="hr-card h-fit space-y-4 p-4 lg:sticky lg:top-4">
              <div className="overflow-hidden rounded-md bg-slate-100">
                {mainImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mainImage.dataUrl}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-muted">
                    <Package size={36} />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-navy">
                    {form.name || "Untitled item"}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      form.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {form.status === "ACTIVE" ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {form.sku || "SKU pending"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-[10px] uppercase text-muted">Selling</p>
                  <p className="font-semibold text-navy">
                    {money(metrics.netSelling || metrics.selling)}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-[10px] uppercase text-muted">Cost</p>
                  <p className="font-semibold text-navy">
                    {money(metrics.productionCost)}
                  </p>
                </div>
                <div className="rounded-md bg-emerald-50 p-3">
                  <p className="text-[10px] uppercase text-emerald-700">
                    Profit
                  </p>
                  <p className="font-semibold text-emerald-700">
                    {money(metrics.profit)}
                  </p>
                </div>
                <div className="rounded-md bg-emerald-50 p-3">
                  <p className="text-[10px] uppercase text-emerald-700">
                    Margin
                  </p>
                  <p className="font-semibold text-emerald-700">
                    {metrics.margin.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Current stock</span>
                  <span className="font-semibold text-navy">
                    {metrics.stock} {form.stockUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Stock value</span>
                  <span className="font-semibold text-navy">
                    {money(metrics.stockValue)}
                  </span>
                </div>
                {form.toggles.fabricMade && form.fabricIssueId ? (
                  <div className="flex justify-between">
                    <span className="text-muted">From stock-out</span>
                    <span className="font-semibold text-navy">
                      {(form.toggles.hasVariants
                        ? totalVariantStock
                        : Number(form.uniformOutputQty) || 0) || "—"}{" "}
                      pcs
                    </span>
                  </div>
                ) : null}
              </div>

              {form.applicableClasses.length ? (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase text-muted">
                    Applicable classes
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {form.applicableClasses.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-navy"
                      >
                        {c
                          .replace("Primary ", "P")
                          .replace("Nursery ", "N")
                          .replace("Senior ", "S")}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>

        {/* Sticky footer */}
        <footer className="shrink-0 border-t border-border bg-white px-5 py-3 sm:px-6">
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Creating uniform item. Step {stepIndex + 1} of {steps.length}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary !py-2"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-secondary !py-2"
                onClick={goPrev}
                disabled={stepIndex === 0 || saving}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-secondary !py-2"
                onClick={() => void save(true)}
                disabled={saving}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="btn-primary !py-2"
                onClick={goNext}
                disabled={saving}
              >
                {stepIndex < steps.length - 1 ? "Save & Continue" : "Save"}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </footer>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageFile(file, uploadRole.current);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

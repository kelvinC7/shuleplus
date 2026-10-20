"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import {
  Scissors,
  Ruler,
  Barcode,
  QrCode,
  BellRing,
  CreditCard,
  Percent,
  MessageSquare,
  ShieldCheck,
  UserX,
  Wand2,
} from "lucide-react";

import { PlatformPageLayout } from "@/components/platform-page-layout";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/contexts/settings-context";
import { resolvePublicAssetUrl } from "@/lib/public-assets";
import type { SchoolUniformSettings } from "@/types";

type FlagKey = Exclude<
  keyof SchoolUniformSettings,
  "id" | "organizationId" | "createdAt" | "updatedAt"
>;

interface ToggleDef {
  key: FlagKey;
  label: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "enableFabricManagement",
    label: "Fabric Management",
    description: "Track fabric rolls, purchases and issues to tailors.",
    icon: Ruler,
  },
  {
    key: "enableTailoring",
    label: "Tailoring",
    description:
      "Manage tailors and production orders for fabric-tailored uniforms.",
    icon: Scissors,
  },
  {
    key: "enableBarcode",
    label: "Barcode Scanning",
    description: "Enable barcode capture for products and variants.",
    icon: Barcode,
  },
  {
    key: "enableQrCodes",
    label: "QR Codes",
    description: "Generate QR codes for uniform items.",
    icon: QrCode,
  },
  {
    key: "enableAutoStockAlerts",
    label: "Automatic Stock Alerts",
    description:
      "Flag variants automatically when stock drops below threshold.",
    icon: BellRing,
  },
  {
    key: "enableInstallments",
    label: "Installment Payments",
    description: "Allow partial / installment payments on sales.",
    icon: CreditCard,
  },
  {
    key: "enableDiscounts",
    label: "Discounts",
    description: "Allow discounts to be applied on sales.",
    icon: Percent,
  },
  {
    key: "enableParentNotifications",
    label: "Parent Notifications",
    description: "Notify parents about distributions and outstanding payments.",
    icon: MessageSquare,
  },
  {
    key: "enableTrackOwnership",
    label: "Track Ownership",
    description: "Track which uniform items each student owns.",
    icon: ShieldCheck,
  },
  {
    key: "enableMissingAlerts",
    label: "Missing Uniform Alerts",
    description: "Surface students who are missing required uniform items.",
    icon: UserX,
  },
  {
    key: "enableSizeRecommendations",
    label: "Size Recommendations",
    description: "Suggest sizes based on recorded student measurements.",
    icon: Wand2,
  },
];

export function SettingsView() {
  const { settings, loading, update } = useSettings();
  const [saving, setSaving] = useState<string | null>(null);

  async function handleToggle(key: FlagKey, value: boolean) {
    setSaving(key);
    try {
      await update({ [key]: value });
      toast.success("Setting updated");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update setting";
      toast.error(message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <PlatformPageLayout>
      <div className="space-y-6">
        <div className="hr-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-navy">Module Settings</h3>
          <p className="mt-1 text-sm text-muted">
            Turn features on or off for this organization. Disabling Fabric
            Management or Tailoring hides their navigation sections.
          </p>
        </div>

        {loading ? (
          <div className="hr-card p-8 text-center text-sm text-muted">
            Loading settings…
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {TOGGLES.map((toggle) => {
              const Icon = toggle.icon;
              const checked = Boolean(settings?.[toggle.key]);
              return (
                <div
                  key={toggle.key}
                  className="hr-card flex items-start justify-between gap-4 p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy/5 text-navy">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {toggle.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {toggle.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={checked}
                    disabled={saving === toggle.key}
                    onCheckedChange={(value) =>
                      handleToggle(toggle.key, Boolean(value))
                    }
                    className="mt-1 shrink-0"
                  />
                </div>
              );
            })}
          </div>
        )}

        {!loading ? (
          <ReceiptBrandingSettings
            settings={settings}
            saving={saving}
            onSave={async (payload) => {
              setSaving("receipt-branding");
              try {
                await update(payload);
                toast.success("Receipt branding saved");
              } catch (err) {
                const message =
                  (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? "Failed to save branding";
                toast.error(message);
              } finally {
                setSaving(null);
              }
            }}
          />
        ) : null}
      </div>
    </PlatformPageLayout>
  );
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function BrandUpload({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value?: string | null;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = value ? resolvePublicAssetUrl(value) : "";

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm font-semibold text-navy">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-slate-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary !py-2"
            onClick={() => inputRef.current?.click()}
          >
            Upload
          </button>
          {value ? (
            <button
              type="button"
              className="btn-ghost !py-2"
              onClick={() => onChange("")}
            >
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void readImageFile(file)
              .then(onChange)
              .catch(() => toast.error("Could not read image"));
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function ReceiptBrandingSettings({
  settings,
  saving,
  onSave,
}: {
  settings: SchoolUniformSettings | null;
  saving: string | null;
  onSave: (
    payload: Pick<SchoolUniformSettings, "receiptSignatureUrl" | "receiptStampUrl">,
  ) => Promise<void>;
}) {
  const [signatureUrl, setSignatureUrl] = useState(
    settings?.receiptSignatureUrl ?? "",
  );
  const [stampUrl, setStampUrl] = useState(settings?.receiptStampUrl ?? "");

  useEffect(() => {
    setSignatureUrl(settings?.receiptSignatureUrl ?? "");
    setStampUrl(settings?.receiptStampUrl ?? "");
  }, [settings?.receiptSignatureUrl, settings?.receiptStampUrl]);

  return (
    <div className="hr-card space-y-4 p-5 sm:p-6">
      <div>
        <h3 className="text-sm font-semibold text-navy">Receipt branding</h3>
        <p className="mt-1 text-sm text-muted">
          Upload the Uniform Department signature and official stamp used on sell
          receipts (PDF and print). School logo and contacts come from your
          organization profile.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BrandUpload
          label="Uniform Department signature"
          hint="Shown on the bottom-right of receipts."
          value={signatureUrl}
          onChange={setSignatureUrl}
        />
        <BrandUpload
          label="Official stamp"
          hint="Placed beside the signature on receipts."
          value={stampUrl}
          onChange={setStampUrl}
        />
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={saving === "receipt-branding"}
        onClick={() =>
          void onSave({
            receiptSignatureUrl: signatureUrl || null,
            receiptStampUrl: stampUrl || null,
          })
        }
      >
        {saving === "receipt-branding" ? "Saving…" : "Save receipt branding"}
      </button>
    </div>
  );
}

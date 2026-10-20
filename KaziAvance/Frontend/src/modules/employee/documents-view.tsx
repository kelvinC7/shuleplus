"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { getToken } from "@/shared/auth-token";
import { SectionCard } from "@/modules/employee/section-card";
import { useEmployeeDashboard } from "@/modules/employee/use-employee-dashboard";

export function DocumentsView() {
  const { documents, loading, error, reload } = useEmployeeDashboard();
  const [uploadCategory, setUploadCategory] = useState("Payslip");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadDocument = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("category", uploadCategory);
      formData.append("file", uploadFile);
      const token = getToken();
      const response = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (response.ok) {
        await reload();
        setUploadFile(null);
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-sm text-muted">Loading documents…</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <SectionCard title="Personal Documents" description="Upload and manage supporting files">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <select
          className="rounded-xl border border-border px-3 py-2.5 text-sm"
          value={uploadCategory}
          onChange={(e) => setUploadCategory(e.target.value)}
        >
          {[
            "Employment Contract",
            "Payslip",
            "National ID",
            "Bank Letter",
            "Tax Certificate",
            "Advance Agreement",
            "Receipt",
            "Other",
          ].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          className="text-sm"
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-50"
          onClick={() => void uploadDocument()}
          disabled={!uploadFile || uploading}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      <div className="mt-5 space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F7FA] px-3 py-3 text-sm"
          >
            <span className="font-medium text-navy">
              {doc.category} — {doc.originalName}
            </span>
            <a
              href={`${API_URL}/uploads/${doc.filePath}`}
              target="_blank"
              className="font-semibold text-primary hover:underline"
              rel="noreferrer"
            >
              View
            </a>
          </div>
        ))}
        {documents.length === 0 ? <p className="text-sm text-muted">No documents uploaded yet.</p> : null}
      </div>
    </SectionCard>
  );
}

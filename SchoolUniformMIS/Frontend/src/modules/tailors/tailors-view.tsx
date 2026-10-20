"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import {
  ItemThumb,
  ListFilterBar,
  ListToolbar,
  StatusBadge,
  timeAgo,
} from "@/components/list-ui";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { uniformApi } from "@/services/uniform-api";
import type { Tailor } from "@/types";

export function TailorsView() {
  const [rows, setRows] = useState<Tailor[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
  });

  async function load() {
    try {
      setRows(await uniformApi.tailors.list());
    } catch {
      toast.error("Failed to load tailors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    try {
      await uniformApi.tailors.create(form);
      toast.success("Tailor added");
      setOpen(false);
      void load();
    } catch {
      toast.error("Create failed");
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "inactive" && r.isActive) return false;
      if (!term) return true;
      return `${r.name} ${r.company ?? ""} ${r.phone ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [rows, search, statusFilter]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  const columns: PlatformTableColumn<Tailor>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div className="flex items-center gap-3">
          <ItemThumb fallback={r.name} />
          <span className="font-semibold text-navy">{r.name}</span>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (r) => <span className="text-muted">{r.company ?? ""}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (r) => <span className="text-muted">{r.phone ?? ""}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={r.isActive ? "success" : "neutral"}>
          {r.isActive ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (r) => <span className="text-muted">{timeAgo(r.updatedAt)}</span>,
    },
  ];

  return (
    <PlatformPageLayout
      title="Tailors"
      subtitle="Manage tailoring partners for in-house production."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" /> Add tailor
        </button>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, company or phone…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ]}
          onReset={() => {
            setSearch("");
            setStatusFilter("");
          }}
        />

        <PlatformDataTable
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No tailors yet"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOpen(true)}
            >
              <Plus size={15} /> Add tailor
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
              resultLabel={`${filtered.length} tailor${filtered.length === 1 ? "" : "s"} found`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="hr-card w-full max-w-md space-y-3 p-6">
            <h2 className="text-lg font-semibold text-navy">Add tailor</h2>
            <input
              className="input"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <input
              className="input"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void save()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PlatformPageLayout>
  );
}

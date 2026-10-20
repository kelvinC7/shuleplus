"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Plus,
  Upload,
  UserRound,
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
  ListToolbar,
  StatusBadge,
} from "@/components/list-ui";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { useAuth } from "@/contexts/auth-context";
import { iamApi } from "@/services/iam-api";
import { uniformApi } from "@/services/uniform-api";
import type { UniformStudent } from "@/types";
import { StudentImportWizard } from "./student-import-wizard";

function hasStudentManagementSlug(slugs: string[]) {
  return slugs.some(
    (s) =>
      s === "student-management" || s === "academic" || s === "academic-1",
  );
}

export function StudentsView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UniformStudent[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [hasStudentManagement, setHasStudentManagement] = useState<
    boolean | null
  >(null);
  const [smReachable, setSmReachable] = useState(false);
  const [smConfigured, setSmConfigured] = useState(false);
  const [smCount, setSmCount] = useState(0);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    className: "",
    academicYear: new Date().getFullYear().toString(),
    gender: "UNISEX",
    phone: "",
  });

  const detectStudentManagement = useCallback(async () => {
    let licensed = hasStudentManagementSlug(user?.modules ?? []);
    try {
      const { data } = await iamApi.get("/iam/org/modules");
      const modules = (data?.data ?? []) as { slug?: string }[];
      const slugs = modules.map((m) => m.slug).filter(Boolean) as string[];
      if (slugs.length) licensed = hasStudentManagementSlug(slugs);
    } catch {
      // JWT fallback already applied
    }

    try {
      const status = await uniformApi.students.academicStatus();
      setSmReachable(status.reachable);
      setSmConfigured(status.configured);
      setSmCount(status.studentCount);
      setHasStudentManagement(
        licensed || (status.configured && status.reachable),
      );
    } catch {
      setHasStudentManagement(licensed);
      setSmReachable(false);
      setSmConfigured(false);
    }
  }, [user?.modules]);

  const load = useCallback(async () => {
    try {
      setRows(await uniformApi.students.list({ search: q || undefined }));
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void detectStudentManagement();
  }, [detectStudentManagement]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLocal() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    try {
      await uniformApi.students.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        className: form.className.trim() || undefined,
        academicYear: form.academicYear.trim() || undefined,
        gender: form.gender,
        phone: form.phone.trim() || undefined,
      });
      toast.success("Student added");
      setOpenAdd(false);
      setForm({
        firstName: "",
        lastName: "",
        className: "",
        academicYear: new Date().getFullYear().toString(),
        gender: "UNISEX",
        phone: "",
      });
      void load();
    } catch {
      toast.error("Create failed");
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const meta = r.profileMeta as { shuleCode?: string } | null | undefined;
      const code = (meta?.shuleCode || r.academicStudentId || "").toLowerCase();
      return `${r.firstName} ${r.lastName} ${r.className ?? ""} ${code}`
        .toLowerCase()
        .includes(term);
    });
  }, [rows, q]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  function shuleCodeOf(r: UniformStudent) {
    const meta = r.profileMeta as { shuleCode?: string } | null | undefined;
    const code = (meta?.shuleCode || r.academicStudentId || "").trim();
    if (!code || /^[0-9a-f-]{36}$/i.test(code)) return "";
    return code;
  }

  const columns: PlatformTableColumn<UniformStudent>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div className="flex items-center gap-3">
          <ItemThumb fallback={`${r.firstName} ${r.lastName}`} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">
              {r.firstName} {r.lastName}
            </p>
            {r.phone ? (
              <p className="truncate text-xs text-muted">{r.phone}</p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "shuleCode",
      header: "ShuleCode",
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-navy">
          {shuleCodeOf(r)}
        </span>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (r) => (
        <span className="font-medium text-navy/80">{r.className ?? ""}</span>
      ),
    },
    {
      key: "year",
      header: "Year",
      render: (r) => <span className="text-muted">{r.academicYear ?? ""}</span>,
    },
    {
      key: "source",
      header: "Source",
      render: (r) => (
        <StatusBadge
          pill
          tone={r.academicStudentId ? "info" : "neutral"}
          icon={r.academicStudentId ? <BookOpen /> : <UserRound />}
        >
          {r.academicStudentId ? "Student Management" : "Local"}
        </StatusBadge>
      ),
    },
    {
      key: "profile",
      header: "Profile",
      className: "text-right",
      render: (r) => (
        <Link
          href={`/students/${r.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-navy/20 hover:bg-slate-50"
        >
          <UserRound className="h-3.5 w-3.5" />
          Open
        </Link>
      ),
    },
  ];

  const subtitle =
    hasStudentManagement === null
      ? "Checking Student Management…"
      : hasStudentManagement
        ? smReachable
          ? `Linked to Student Management · ${smCount || rows.length} students · updates automatically`
          : smConfigured
            ? "Student Management API is configured but unreachable. Ensure it is running on port 3052."
            : "Student Management is licensed but STUDENT_MANAGEMENT_API_URL is not set on Uniform backend"
        : "No Student Management module. Add students manually or upload a spreadsheet.";

  return (
    <PlatformPageLayout
      title="Student Profiles"
      subtitle={subtitle}
      actions={
        hasStudentManagement ? null : (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpenImport(true)}
            >
              <Upload size={15} /> Import Students
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOpenAdd(true)}
            >
              <Plus className="h-4 w-4" /> Add student
            </button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {hasStudentManagement === false ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Student Management module not licensed. Add students manually or
            import a spreadsheet.
          </div>
        ) : null}

        <ListFilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Search by name or class…"
          onReset={() => setQ("")}
          onApply={() => void load()}
        />

        <PlatformDataTable
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.id}
          loading={loading || hasStudentManagement === null}
          emptyMessage={
            hasStudentManagement
              ? "No students yet. Register students in Student Management — they will appear here automatically."
              : "No students yet. Add manually or import a file."
          }
          emptyAction={
            hasStudentManagement ? null : (
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOpenImport(true)}
                >
                  <Upload size={15} /> Import Students
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setOpenAdd(true)}
                >
                  <Plus size={15} /> Add student
                </button>
              </div>
            )
          }
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          toolbar={
            <ListToolbar
              icon={<GraduationCap />}
              resultLabel={`${filtered.length} student${filtered.length === 1 ? "" : "s"} found`}
              resultHint={
                hasStudentManagement
                  ? "Synced automatically from Student Management"
                  : "Showing results from all sources"
              }
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {openAdd ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/40 backdrop-blur-[1px]">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <header className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-medium text-muted">
                Students / New
              </p>
              <h2 className="text-lg font-bold text-navy">Add Student</h2>
            </header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">
                    First name
                  </label>
                  <input
                    className="input"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">
                    Last name
                  </label>
                  <input
                    className="input"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">
                  Class
                </label>
                <input
                  className="input"
                  value={form.className}
                  onChange={(e) =>
                    setForm({ ...form, className: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">
                  Academic year
                </label>
                <input
                  className="input"
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm({ ...form, academicYear: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">
                  Gender
                </label>
                <select
                  className="input"
                  value={form.gender}
                  onChange={(e) =>
                    setForm({ ...form, gender: e.target.value })
                  }
                >
                  <option value="UNISEX">Unisex</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">
                  Phone (optional)
                </label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <footer className="flex gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setOpenAdd(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => void createLocal()}
              >
                Save student
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {openImport ? (
        <StudentImportWizard
          onClose={() => setOpenImport(false)}
          onDone={() => {
            setOpenImport(false);
            void load();
          }}
        />
      ) : null}
    </PlatformPageLayout>
  );
}

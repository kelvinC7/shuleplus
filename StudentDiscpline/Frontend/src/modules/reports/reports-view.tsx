"use client"

import { useAuth } from "@/contexts/auth-context"
import { ExportDropdown } from "@/components/export-dropdown"

export function ReportsView() {
  const { user } = useAuth()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Reports</h1>
          <p className="text-sm text-muted">
            Generate organization-scoped reports here.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">
        No reports configured yet.
      </div>
    </div>
  )
}

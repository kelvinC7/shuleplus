"use client"

import * as React from "react"
import { FileDownIcon, FileTextIcon, FileSpreadsheetIcon, LoaderIcon, AlertTriangle } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { exportToPdf, exportToExcel, type ExportColumn } from "@/lib/export-utils"

export interface ExportDropdownProps {
  title: string
  columns: ExportColumn[]
  data: Record<string, unknown>[]
  fileName?: string
  userName?: string
}

export function ExportDropdown({
  title,
  columns,
  data,
  fileName,
  userName,
}: ExportDropdownProps) {
  const [exporting, setExporting] = React.useState<"pdf" | "excel" | null>(null)
  const [emptyConfirm, setEmptyConfirm] = React.useState<"pdf" | "excel" | null>(null)

  const isEmpty = data.length === 0

  async function doExportPdf() {
    setExporting("pdf")
    try {
      const orientation = columns.length > 6 ? "landscape" : "portrait"
      await exportToPdf({
        title,
        columns,
        data,
        fileName,
        userName,
        orientation,
      })
    } finally {
      setExporting(null)
    }
  }

  function doExportExcel() {
    setExporting("excel")
    try {
      exportToExcel({
        title,
        columns,
        data,
        fileName,
        userName,
      })
    } finally {
      setExporting(null)
    }
  }

  function handleExportPdf() {
    if (isEmpty) {
      setEmptyConfirm("pdf")
      return
    }
    doExportPdf()
  }

  function handleExportExcel() {
    if (isEmpty) {
      setEmptyConfirm("excel")
      return
    }
    doExportExcel()
  }

  function confirmEmptyExport() {
    if (emptyConfirm === "pdf") doExportPdf()
    if (emptyConfirm === "excel") doExportExcel()
    setEmptyConfirm(null)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="btn-secondary h-10 gap-2 px-4 text-sm shadow-sm"
            />
          }
        >
          {exporting ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <FileDownIcon className="size-4" />
          )}
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-200 p-1 shadow-xl">
          <DropdownMenuItem
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#000435]"
          >
            {exporting === 'pdf' ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <FileTextIcon className="size-4 text-red-500" />
            )}
            Export PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#000435]"
          >
            {exporting === 'excel' ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheetIcon className="size-4 text-emerald-600" />
            )}
            Export Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={emptyConfirm !== null} onOpenChange={(open) => { if (!open) setEmptyConfirm(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#000435]">
              <AlertTriangle className="h-5 w-5 text-[#fcb038]" />
              Empty Report
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            The {title} report has no data to export. The downloaded file will be empty.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose render={<button type="button" className="btn-secondary px-4 py-2 text-sm" />}>
              Cancel
            </DialogClose>
            <button type="button" onClick={confirmEmptyExport} className="btn-primary px-4 py-2 text-sm">
              Export Anyway
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

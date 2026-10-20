"use client"

import * as React from "react"
import { FileDownIcon, FileTextIcon, FileSpreadsheetIcon, LoaderIcon, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
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
            <Button variant="outline" size="sm" />
          }
        >
          {exporting ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <FileDownIcon data-icon="inline-start" />
          )}
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={handleExportPdf} disabled={exporting !== null}>
            {exporting === "pdf" ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <FileTextIcon data-icon="inline-start" />
            )}
            Export PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportExcel} disabled={exporting !== null}>
            {exporting === "excel" ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheetIcon data-icon="inline-start" />
            )}
            Export Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={emptyConfirm !== null} onOpenChange={open => { if (!open) setEmptyConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Empty Report
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The {title} report has no data to export. The downloaded file will be empty.
          </p>
          <DialogFooter>
            <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95" />}>
              Cancel
            </DialogClose>
            <button
              onClick={confirmEmptyExport}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-all active:scale-95"
            >
              Export Anyway
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

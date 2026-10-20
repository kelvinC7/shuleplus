"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { EmployeeDashboardData } from "./types";

export function useEmployeeDashboard() {
  const [dashboard, setDashboard] = useState<EmployeeDashboardData | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [advanceHistory, setAdvanceHistory] = useState<any[]>([]);
  const [workflow, setWorkflow] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dash, salary, advance, flow, docs] = await Promise.all([
        apiFetch<EmployeeDashboardData>("/api/employee/dashboard"),
        apiFetch<{ data: any[] }>("/api/employee/salary-history"),
        apiFetch<{ data: any[] }>("/api/employee/advance-history"),
        apiFetch<{ data: any[] }>("/api/employee/workflow"),
        apiFetch<{ data: any[] }>("/api/documents"),
      ]);
      setDashboard(dash);
      setSalaryHistory(salary.data);
      setAdvanceHistory(advance.data);
      setWorkflow(flow.data);
      setDocuments(docs.data);
    } catch {
      setError("Could not load employee data. Check that KaziAdvance backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    dashboard,
    salaryHistory,
    advanceHistory,
    workflow,
    documents,
    loading,
    error,
    reload,
  };
}

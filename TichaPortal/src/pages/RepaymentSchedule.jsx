import React, { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import Drawer from "@mui/material/Drawer";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "../context/AuthContext";
import { kaziGetAdvanceWorkspace } from "../services/kaziApi";
import TablePagination from "../components/TablePagination";
import { downloadReceiptPdf, openReceiptPrint } from "../utils/avanceReceiptPdf";
import {
  FILTERS,
  buildSchedule,
  currentAdvance,
  daysFromToday,
  displayAdvanceStatus,
  formatPlanDate,
  matchesFilter,
  money,
  nextPayment,
  parseFrequency,
  paymentHistory,
  statusPill,
  workspaceKpis,
} from "../utils/repaymentWorkspace";
import { brand } from "../theme/theme";

const TONES = {
  Paid: { color: "#047857", bg: "#ECFDF5", dot: "#10B981" },
  Completed: { color: "#047857", bg: "#ECFDF5", dot: "#10B981" },
  Active: { color: "#0369A1", bg: "#F0F9FF", dot: "#0EA5E9" },
  Approved: { color: "#0369A1", bg: "#F0F9FF", dot: "#0EA5E9" },
  Disbursed: { color: "#0369A1", bg: "#F0F9FF", dot: "#0EA5E9" },
  Partial: { color: "#B45309", bg: "#FFFBEB", dot: "#F59E0B" },
  Pending: { color: "#B45309", bg: "#FFFBEB", dot: "#F59E0B" },
  Overdue: { color: "#B91C1C", bg: "#FEF2F2", dot: "#EF4444" },
  Rejected: { color: "#B91C1C", bg: "#FEF2F2", dot: "#EF4444" },
  Upcoming: { color: "#475569", bg: "#F1F5F9", dot: "#94A3B8" },
  Cancelled: { color: "#475569", bg: "#F1F5F9", dot: "#94A3B8" },
};
const FALLBACK_TONE = { color: "#475569", bg: "#F1F5F9", dot: "#94A3B8" };

function toneFor(status) {
  return TONES[String(status ?? "")] || FALLBACK_TONE;
}

function StatusPill({ status }) {
  const pill = statusPill(status);
  const tone = toneFor(status);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        borderRadius: 999,
        px: 1.25,
        py: 0.5,
        fontSize: 11,
        fontWeight: 600,
        color: tone.color,
        bgcolor: tone.bg,
      }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tone.dot }} />
      {pill.label}
    </Box>
  );
}

function ProgressBar({ percent }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <Box sx={{ height: 10, borderRadius: 999, bgcolor: "#F1F5F9", overflow: "hidden" }}>
      <Box sx={{ height: "100%", width: `${p}%`, borderRadius: 999, bgcolor: brand.primary }} />
    </Box>
  );
}

function MetaRow({ label, value }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ py: 1, fontSize: 14 }}>
      <Box sx={{ color: "#64748B" }}>{label}</Box>
      <Box sx={{ fontWeight: 600, color: brand.navy }}>{value}</Box>
    </Stack>
  );
}

const sectionLabelSx = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#94A3B8",
};

const headCellSx = { px: 2, py: 1.5, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff", whiteSpace: "nowrap" };
const bodyCellSx = { px: 2, py: 1.5, fontSize: 14, whiteSpace: "nowrap" };

export default function RepaymentSchedule() {
  const { teacher } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [apiTeacher, setApiTeacher] = useState(null);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const [payment, setPayment] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await kaziGetAdvanceWorkspace();
      setRows(data.rows);
      setSummary(data.summary || {});
      setApiTeacher(data.teacher);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Could not load repayment schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const teacherInfo = useMemo(
    () => ({
      fullName: apiTeacher?.fullName || teacher?.full_name || teacher?.name,
      employeeCode: apiTeacher?.employeeCode || teacher?.id,
      school: apiTeacher?.school || teacher?.school_name || teacher?.school?.name,
      school_name: teacher?.school_name || teacher?.school?.name,
    }),
    [apiTeacher, teacher]
  );

  const kpis = useMemo(() => workspaceKpis(rows, summary), [rows, summary]);
  const active = useMemo(() => currentAdvance(rows), [rows]);
  const activeSchedule = useMemo(() => (active ? buildSchedule(active) : []), [active]);
  const activePaid = Number(active?.totalPaid) || 0;
  const activeRemaining = Number(active?.remainingBalance) || 0;
  const activePct = active
    ? active.progressPercent ?? (active.amount ? Math.round((activePaid / active.amount) * 100) : 0)
    : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!q) return true;
      const id = String(row.requestNumber || row.requestNo || "").toLowerCase();
      return id.includes(q);
    });
  }, [rows, filter, query]);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const selectedView = useMemo(() => {
    if (!selected) return null;
    const schedule = buildSchedule(selected);
    const history = paymentHistory(schedule);
    const next = nextPayment(schedule);
    const status = displayAdvanceStatus(selected);
    const paidCount = schedule.filter((r) => r.status === "Paid").length;
    return {
      ...selected,
      displayStatus: status,
      frequency: parseFrequency(selected),
      schedule,
      history,
      next,
      paidCount,
      completed:
        status === "Completed" ||
        (["Approved", "Disbursed"].includes(selected.status) &&
          (Number(selected.remainingBalance) || 0) <= 0 &&
          paidCount > 0 &&
          paidCount === schedule.length),
    };
  }, [selected]);

  async function handleDownload(advance, pay = null) {
    setBusy(true);
    try {
      const schedule = buildSchedule(advance);
      await downloadReceiptPdf({
        advance: { ...advance, schedule, frequency: parseFrequency(advance), displayStatus: displayAdvanceStatus(advance) },
        teacher: teacherInfo,
        payment: pay,
      });
    } catch (e) {
      try {
        openReceiptPrint({
          advance: { ...advance, schedule: buildSchedule(advance), frequency: parseFrequency(advance) },
          teacher: teacherInfo,
          payment: pay,
        });
      } catch {
        setError(e.message || "Could not download receipt.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <CircularProgress sx={{ color: brand.navy }} />
      </Box>
    );
  }

  return (
    <Box sx={{ mx: "auto", maxWidth: 1280, display: "flex", flexDirection: "column", gap: 2.5, px: { xs: 2, sm: 3 }, py: 3 }}>
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "#94A3B8" }}>
          Ticha Avance
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", color: brand.navy }}>
          Repayment Schedule
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, color: "#64748B" }}>
          Track every advance, upcoming payroll deductions, and download receipts.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" }, gap: 1.5 }}>
        {[
          { label: "Total Advances", value: kpis.totalAdvances },
          { label: "Active Advances", value: kpis.activeAdvances },
          { label: "Total Borrowed", value: money(kpis.totalBorrowed) },
          { label: "Remaining Balance", value: money(kpis.remainingBalance) },
          { label: "Completed", value: kpis.completed },
        ].map((card) => (
          <Paper key={card.label} variant="outlined" sx={{ borderRadius: 2, px: 2, py: 2 }}>
            <Typography sx={{ ...sectionLabelSx, letterSpacing: "0.04em" }}>{card.label}</Typography>
            <Typography sx={{ mt: 1, fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: brand.navy }}>
              {card.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {active ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
          <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
            <Box>
              <Typography sx={{ ...sectionLabelSx, letterSpacing: "0.04em" }}>Current Advance</Typography>
              <Typography sx={{ mt: 0.5, fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: brand.navy }}>
                {active.requestNumber || active.requestNo}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{activePct}% Paid</Typography>
          </Stack>
          <Box sx={{ mt: 1.5 }}>
            <ProgressBar percent={activePct} />
          </Box>
          <Stack direction="row" flexWrap="wrap" spacing={3} sx={{ mt: 1.5, fontSize: 14 }}>
            <Box component="span" sx={{ color: "#64748B" }}>Paid: <Box component="strong" sx={{ color: brand.navy }}>{money(activePaid)}</Box></Box>
            <Box component="span" sx={{ color: "#64748B" }}>Remaining: <Box component="strong" sx={{ color: brand.navy }}>{money(activeRemaining)}</Box></Box>
            {activeSchedule.length ? (
              <Box component="span" sx={{ color: "#64748B" }}>
                {activeSchedule.filter((r) => r.status === "Paid").length} of {activeSchedule.length} payments completed
              </Box>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ borderBottom: "1px solid #F1F5F9", p: { xs: 2, sm: 2.5 } }}
        >
          <Box>
            <Typography sx={{ ...sectionLabelSx, letterSpacing: "0.12em" }}>All Advance Requests</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: brand.navy }}>Your advances</Typography>
          </Box>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Advance ID"
            size="small"
            sx={{ width: "100%", maxWidth: { sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 17, color: "#94A3B8" }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ px: { xs: 2, sm: 2.5 }, pb: 2 }}>
          {FILTERS.map((f) => (
            <ButtonBase
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              sx={{
                borderRadius: 999,
                px: 1.5,
                py: 0.75,
                fontSize: 12,
                fontWeight: 600,
                bgcolor: filter === f ? brand.navy : "#F1F5F9",
                color: filter === f ? "#fff" : brand.navy,
                "&:hover": { bgcolor: filter === f ? brand.navy : "#E2E8F0" },
              }}
            >
              {f}
            </ButtonBase>
          ))}
        </Stack>

        <Box sx={{ display: { xs: "block", md: "none" }, px: 2, pb: 2 }}>
          <Stack spacing={1.5}>
            {pageRows.length === 0 ? (
              <Typography sx={{ py: 5, textAlign: "center", fontSize: 14, color: "#94A3B8" }}>
                No advances match this filter.
              </Typography>
            ) : (
              pageRows.map((row) => {
                const status = displayAdvanceStatus(row);
                return (
                  <ButtonBase
                    key={row.id}
                    type="button"
                    onClick={() => { setSelected(row); setPayment(null); }}
                    sx={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 2,
                      border: "1px solid #F1F5F9",
                      p: 2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                      <Box>
                        <Typography sx={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: brand.navy }}>
                          {row.requestNumber || row.requestNo}
                        </Typography>
                        <Typography sx={{ mt: 0.5, fontSize: 12, color: "#94A3B8" }}>
                          {formatPlanDate(row.submittedAt || row.date)}
                        </Typography>
                      </Box>
                      <StatusPill status={status} />
                    </Stack>
                    <Typography sx={{ mt: 1.5, fontSize: 18, fontWeight: 700, color: brand.navy }}>{money(row.amount)}</Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 12, color: "#64748B" }}>Remaining {money(row.remainingBalance)}</Typography>
                  </ButtonBase>
                );
              })
            )}
          </Stack>
        </Box>

        <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: brand.navy }}>
              <TableRow>
                {["Advance ID", "Requested Date", "Amount", "Period", "Frequency", "Paid", "Remaining", "Status", "Action"].map((h) => (
                  <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ px: 2.5, py: 7, textAlign: "center", color: "#94A3B8" }}>
                    No advances match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const status = displayAdvanceStatus(row);
                  return (
                    <TableRow key={row.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                      <TableCell sx={{ ...bodyCellSx, fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: brand.navy }}>
                        {row.requestNumber || row.requestNo}
                      </TableCell>
                      <TableCell sx={{ ...bodyCellSx, color: "#475569" }}>{formatPlanDate(row.submittedAt || row.date)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, fontWeight: 600, color: brand.navy }}>{money(row.amount)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, color: "#475569" }}>{row.months} Months</TableCell>
                      <TableCell sx={{ ...bodyCellSx, color: "#475569" }}>{parseFrequency(row)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, color: "#475569" }}>{money(row.totalPaid)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, color: "#475569" }}>{money(row.remainingBalance)}</TableCell>
                      <TableCell sx={bodyCellSx}><StatusPill status={status} /></TableCell>
                      <TableCell sx={bodyCellSx}>
                        <Button
                          type="button"
                          size="small"
                          onClick={() => { setSelected(row); setPayment(null); }}
                          sx={{ height: 32, borderRadius: 1, bgcolor: brand.primary, color: brand.navy, fontSize: 11, fontWeight: 600, "&:hover": { bgcolor: brand.primary } }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={pageSize}
          itemCount={pageRows.length}
          pageStartIndex={filtered.length === 0 ? 0 : (page - 1) * pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      </Paper>

      <Drawer
        anchor="right"
        open={Boolean(selectedView)}
        onClose={() => { setSelected(null); setPayment(null); }}
        PaperProps={{ sx: { width: "100%", maxWidth: 640 } }}
      >
        {selectedView ? (
          <AdvanceDrawer
            row={selectedView}
            payment={payment}
            busy={busy}
            onClose={() => { setSelected(null); setPayment(null); }}
            onSelectPayment={setPayment}
            onDownload={(pay) => handleDownload(selectedView, pay)}
          />
        ) : null}
      </Drawer>
    </Box>
  );
}

function AdvanceDrawer({ row, payment, busy, onClose, onSelectPayment, onDownload }) {
  const next = row.next;
  const overdueDays = next && next.status === "Overdue" ? Math.abs(daysFromToday(next.dueDate)) : 0;
  const upcomingDays = next && next.status !== "Overdue" ? daysFromToday(next.dueDate) : 0;
  const nextTone = next?.status === "Overdue" ? { border: "#FEE2E2", bg: "#FEF2F2", text: "#B91C1C" } : { border: "#FEF3C7", bg: "#FFFBEB", text: "#92400E" };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#fff" }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ bgcolor: brand.navy, px: 2.5, py: 2, color: "#fff" }}>
        <Box>
          <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "rgba(255,255,255,0.5)" }}>
            Advance overview
          </Typography>
          <Typography sx={{ mt: 0.5, fontFamily: "monospace", fontSize: 18, fontWeight: 600 }}>
            {row.requestNumber || row.requestNo}
          </Typography>
          <Box sx={{ mt: 1 }}><StatusPill status={row.displayStatus} /></Box>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Stack spacing={2.5} sx={{ minHeight: 0, flex: 1, overflowY: "auto", p: 2.5 }}>
        {row.completed ? (
          <Box sx={{ borderRadius: 2, border: "1px solid #D1FAE5", bgcolor: "#ECFDF5", p: 2 }}>
            <Typography sx={{ ...sectionLabelSx, color: "#047857" }}>Advance completed</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 20, fontWeight: 700, color: brand.navy }}>{money(row.amount)} Fully repaid</Typography>
            <Box sx={{ mt: 1.5, "& > * + *": { borderTop: "1px solid #D1FAE5" } }}>
              <MetaRow label="Total Amount" value={money(row.amount)} />
              <MetaRow label="Total Paid" value={money(row.totalPaid || row.amount)} />
              <MetaRow label="Remaining" value={money(0)} />
              <MetaRow label="Completed Date" value={formatPlanDate(row.completedAt || row.schedule.at(-1)?.paidAt || row.schedule.at(-1)?.dueDate)} />
            </Box>
            <Typography sx={{ mt: 1.5, fontSize: 14, fontWeight: 600, color: "#047857" }}>Fully repaid</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
              <Button type="button" disabled={busy} onClick={() => onDownload(null)} sx={{ borderRadius: 1.5, bgcolor: brand.navy, color: "#fff", fontSize: 12, fontWeight: 600, "&:hover": { bgcolor: brand.navy2 } }}>
                Download Final Receipt
              </Button>
              <Button type="button" variant="outlined" onClick={() => onSelectPayment(null)} sx={{ borderRadius: 1.5, borderColor: "#E2E8F0", color: brand.navy, fontSize: 12, fontWeight: 600 }}>
                View Repayment History
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ borderRadius: 2, border: "1px solid #F1F5F9", p: 2 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: brand.navy }}>{money(row.amount)}</Typography>
            <Box sx={{ mt: 1.5, "& > * + *": { borderTop: "1px solid #F1F5F9" } }}>
              <MetaRow label="Requested" value={formatPlanDate(row.submittedAt)} />
              <MetaRow label="Approved" value={formatPlanDate(row.approvedAt)} />
              <MetaRow label="Start Date" value={formatPlanDate(row.startDate || row.disbursedAt || row.approvedAt)} />
              <MetaRow label="Loan Period" value={`${row.months} Months`} />
              <MetaRow label="Frequency" value={row.frequency} />
            </Box>
          </Box>
        )}

        <Box>
          <Typography sx={sectionLabelSx}>Repayment progress</Typography>
          <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <Box sx={{ borderRadius: 2, bgcolor: "#F8FAFC", p: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>Paid</Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.navy }}>{money(row.totalPaid)}</Typography>
            </Box>
            <Box sx={{ borderRadius: 2, bgcolor: "#F8FAFC", p: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>Remaining</Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.navy }}>{money(row.remainingBalance)}</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5, fontSize: 12, fontWeight: 600, color: "#64748B" }}>
              <span>{row.progressPercent || 0}%</span>
              <span>{row.paidCount} of {row.schedule.length} payments completed</span>
            </Stack>
            <ProgressBar percent={row.progressPercent} />
          </Box>
        </Box>

        {next && !row.completed ? (
          <Box sx={{ borderRadius: 2, border: `1px solid ${nextTone.border}`, bgcolor: nextTone.bg, p: 2 }}>
            <Typography sx={{ ...sectionLabelSx, color: "#64748B" }}>
              {next.status === "Overdue" ? "Overdue repayment" : "Next repayment"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 700, color: brand.navy }}>{money(next.amount)}</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 14, color: "#475569" }}>Due {formatPlanDate(next.dueDate)}</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 14, fontWeight: 600, color: nextTone.text }}>
              {next.status === "Overdue"
                ? `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`
                : `${Math.max(0, upcomingDays)} day${Math.abs(upcomingDays) === 1 ? "" : "s"} remaining`}
            </Typography>
            <Button
              type="button"
              onClick={() => onSelectPayment(next)}
              sx={{ mt: 1.5, borderRadius: 1.5, bgcolor: brand.navy, color: "#fff", fontSize: 12, fontWeight: 600, "&:hover": { bgcolor: brand.navy2 } }}
            >
              View Payment Details
            </Button>
          </Box>
        ) : null}

        <Box>
          <Typography sx={{ ...sectionLabelSx, mb: 1 }}>Repayment schedule</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: brand.navy }}>
                <TableRow>
                  {["#", "Due Date", "Amount", "Paid", "Balance", "Status"].map((h) => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {row.schedule.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ px: 2, py: 4, textAlign: "center", color: "#94A3B8" }}>Schedule appears after approval.</TableCell>
                  </TableRow>
                ) : (
                  row.schedule.map((item) => (
                    <TableRow key={item.id} hover onClick={() => onSelectPayment(item)} sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}>
                      <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: "tabular-nums" }}>{item.n}</TableCell>
                      <TableCell sx={bodyCellSx}>{formatPlanDate(item.dueDate)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{money(item.amount)}</TableCell>
                      <TableCell sx={bodyCellSx}>{money(item.paid)}</TableCell>
                      <TableCell sx={bodyCellSx}>{money(item.balance)}</TableCell>
                      <TableCell sx={bodyCellSx}><StatusPill status={item.status} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box>
          <Typography sx={{ ...sectionLabelSx, mb: 1 }}>Payment history</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: brand.navy }}>
                <TableRow>
                  {["Payment ID", "Date", "Amount", "Method", "Reference", "Receipt"].map((h) => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {row.history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ px: 2, py: 4, textAlign: "center", color: "#94A3B8" }}>No completed repayments yet.</TableCell>
                  </TableRow>
                ) : (
                  row.history.map((item) => (
                    <TableRow key={item.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                      <TableCell sx={{ ...bodyCellSx, fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{item.id}</TableCell>
                      <TableCell sx={bodyCellSx}>{formatPlanDate(item.date)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{money(item.amount)}</TableCell>
                      <TableCell sx={bodyCellSx}>{item.method}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, fontFamily: "monospace", fontSize: 12 }}>{item.reference}</TableCell>
                      <TableCell sx={bodyCellSx}>
                        <ButtonBase
                          type="button"
                          disabled={busy}
                          onClick={() => onDownload(item.installment)}
                          sx={{ fontSize: 12, fontWeight: 600, color: brand.primaryStrong, "&:hover": { textDecoration: "underline" }, "&.Mui-disabled": { opacity: 0.5 } }}
                        >
                          PDF
                        </ButtonBase>
                        <ButtonBase
                          type="button"
                          onClick={() => onSelectPayment(item.installment)}
                          sx={{ ml: 1.5, fontSize: 12, fontWeight: 600, color: brand.navy, "&:hover": { textDecoration: "underline" } }}
                        >
                          View
                        </ButtonBase>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {payment ? (
          <Box sx={{ borderRadius: 2, border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", p: 2 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
              <Box>
                <Typography sx={sectionLabelSx}>Payment details</Typography>
                <Typography sx={{ mt: 0.5, fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: brand.navy }}>{payment.reference}</Typography>
              </Box>
              <ButtonBase type="button" sx={{ fontSize: 12, fontWeight: 600, color: "#64748B" }} onClick={() => onSelectPayment(null)}>
                Close
              </ButtonBase>
            </Stack>
            <Box sx={{ mt: 1.5, "& > * + *": { borderTop: "1px solid #E2E8F0" } }}>
              <MetaRow label="Due date" value={formatPlanDate(payment.dueDate)} />
              <MetaRow label="Amount" value={money(payment.amount)} />
              <MetaRow label="Paid" value={money(payment.paid)} />
              <MetaRow label="Method" value={payment.method} />
              <MetaRow label="Status" value={payment.status} />
            </Box>
            {payment.status === "Paid" ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() => onDownload(payment)}
                sx={{ mt: 2, borderRadius: 1.5, bgcolor: brand.navy, color: "#fff", fontSize: 12, fontWeight: 600, "&:hover": { bgcolor: brand.navy2 } }}
              >
                Download Receipt
              </Button>
            ) : null}
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

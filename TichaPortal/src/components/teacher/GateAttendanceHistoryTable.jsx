import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const NAVY = "#000435";
const PAGE_SIZE = 10;

function fmt12(t) {
  if (!t) return "-";
  const [h, m] = String(t).split(":").map(Number);
  return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function StatusChip({ status }) {
  const map = {
    on_time: { bg: "#ecfdf5", color: "#059669", label: "On time" },
    late: { bg: "#fffbeb", color: "#d97706", label: "Late" },
    missed: { bg: "#fff1f2", color: "#dc2626", label: "Missed" },
  };
  const s = map[status] || map.missed;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", padding: "4px 10px", borderRadius: 99, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function GateAttendanceHistoryTable({ logs, loading, termRate }) {
  const [filter, setFilter] = useState("week");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    let list = [...(logs || [])];
    if (filter === "today") {
      list = list.filter((l) => l.date === todayStr);
    } else if (filter === "week") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 6);
      const cut = cutoff.toISOString().slice(0, 10);
      list = list.filter((l) => l.date >= cut);
    } else if (filter === "term") {
      // show all loaded gate history (term window loaded by parent)
    } else if (filter === "range" && from && to) {
      list = list.filter((l) => l.date >= from && l.date <= to);
    }
    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [logs, filter, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #edf1fb", overflow: "hidden" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #edf1fb", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={16} color={NAVY} />
          <span style={{ fontWeight: 800, fontSize: 15, color: NAVY }}>Attendance History</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "Week" },
            { id: "term", label: "Term" },
            { id: "range", label: "Range" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setFilter(f.id); setPage(1); }}
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                background: filter === f.id ? NAVY : "#f0f2f9",
                color: filter === f.id ? "#fff" : "#64748b",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filter === "range" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 18px", borderBottom: "1px solid #edf1fb" }}>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} style={{ borderRadius: 10, border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 12 }} />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} style={{ borderRadius: 10, border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 12 }} />
        </div>
      )}

      {termRate != null && (
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #edf1fb" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", margin: "0 0 8px", textTransform: "uppercase" }}>Term on-time performance</p>
          <div style={{ height: 8, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, termRate)}%`, background: "linear-gradient(90deg,#FCB038,#10b981)", borderRadius: 99 }} />
          </div>
          <p style={{ fontSize: 12, fontWeight: 800, color: NAVY, margin: "6px 0 0" }}>{termRate}% gate days on time</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          <p style={{ fontWeight: 800, margin: 0 }}>No records</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#64748b" }}>
                  <th style={{ padding: "12px 14px" }}>#</th>
                  <th style={{ padding: "12px 14px" }}>Date</th>
                  <th style={{ padding: "12px 14px" }}>Check-in</th>
                  <th style={{ padding: "12px 14px" }}>Check-out</th>
                  <th style={{ padding: "12px 14px" }}>Status</th>
                  <th style={{ padding: "12px 14px" }}>Late</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log, i) => (
                  <tr key={log.id || log.date} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: NAVY }}>{log.date}</td>
                    <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>{fmt12(log.entry_time)}</td>
                    <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>{fmt12(log.exit_time)}</td>
                    <td style={{ padding: "12px 14px" }}><StatusChip status={log.status} /></td>
                    <td style={{ padding: "12px 14px", color: log.late_mins > 0 ? "#d97706" : "#94a3b8" }}>{log.late_mins > 0 ? `+${log.late_mins}m` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid #edf1fb", fontSize: 12, color: "#64748b" }}>
            <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 8px", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>
                <ChevronLeft size={16} />
              </button>
              <span>{page}/{totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 8px", background: "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// @ts-nocheck
import "./index.css";
import "./app.css";
/* ================= helpers ================= */
const $ = (s) => document.querySelector(s);
const svgI = (p) => `<svg viewBox="0 0 24 24">${p}</svg>`;
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const rwf = (n) => "RWF " + fmt(n);
const ini = (first, full) => {
  const parts = String(full || "")
    .trim()
    .split(/\s+/);
  return (String(first || parts[0] || "?")[0] || "?") + (parts[1]?.[0] || "");
};
const subjName = (k, i) => k?.subj?.[i]?.[0] || "Free period";
function toast(m) {
  const t = $("#toast");
  t.querySelector("span").textContent = m;
  t.classList.add("on");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("on"), 2300);
}
function go(v) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.toggle("active", t.dataset.v === v));
  document
    .querySelectorAll(".view")
    .forEach((x) => x.classList.toggle("active", x.id === "v-" + v));
  $("#v-" + v).scrollTop = 0;
  PST.slice().forEach(() => popPanel());
}
document
  .querySelectorAll(".tab")
  .forEach((t) => (t.onclick = () => go(t.dataset.v)));
let _sh = 0;
function openSheet(h) {
  const s = $("#sheet");
  s.className = "sheet";
  s.innerHTML = '<div class="grab"></div>' + h;
  const grab = s.querySelector(".grab");
  grab.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      grab.dataset.startY = String(e.touches[0].clientY);
      s.classList.add("dragging");
    },
    { passive: true },
  );
  grab.addEventListener(
    "touchmove",
    (e) => {
      if (!grab.dataset.startY || e.touches.length !== 1) return;
      const distance = e.touches[0].clientY - Number(grab.dataset.startY);
      if (distance > 0) {
        e.preventDefault();
        s.style.transform = `translateY(${distance}px)`;
      }
    },
    { passive: false },
  );
  grab.addEventListener(
    "touchend",
    (e) => {
      const startY = Number(grab.dataset.startY);
      const endY = e.changedTouches[0]?.clientY || startY;
      delete grab.dataset.startY;
      s.classList.remove("dragging");
      if (endY - startY > 90) {
        closeSheet();
      } else {
        s.style.transform = "";
      }
    },
    { passive: true },
  );
  grab.addEventListener("touchcancel", () => {
    delete grab.dataset.startY;
    s.classList.remove("dragging");
    s.style.transform = "";
  });
  $("#scrim").classList.add("on");
  cancelAnimationFrame(_sh);
  _sh = requestAnimationFrame(() => s.classList.add("on"));
}
function closeSheet() {
  cancelAnimationFrame(_sh);
  $("#scrim").classList.remove("on");
  const s = $("#sheet");
  s.classList.remove("on", "dragging");
  s.style.transform = "";
}
$("#scrim").addEventListener("click", closeSheet);
const PST = [];
const chk =
  '<span class="ck"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>';
function pushPanel(o) {
  const el = document.createElement("div");
  el.className = "panel";
  el.style.zIndex = 25 + PST.length;
  el.innerHTML = `<div class="pnh"><div class="r1"><button class="iconbtn" onclick="popPanel()">${svgI('<path d="m15 18-6-6 6-6"/>')}</button><div><small>${o.k || ""}</small><h2>${o.t}</h2>${o.s ? `<p>${o.s}</p>` : ""}</div>${o.act || ""}</div></div><div class="pnb">${o.b}</div>`;
  document.querySelector(".views").appendChild(el);
  PST.push({ el, o });
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add("on")),
  );
  return el;
}
function popPanel() {
  const p = PST.pop();
  if (!p) return;
  p.el.classList.remove("on");
  setTimeout(() => p.el.remove(), 340);
}
const repaint = (el, b) => (el.querySelector(".pnb").innerHTML = b);
const COL = {
  navy: "var(--navy)",
  amber: "var(--amber)",
  green: "var(--green)",
  red: "var(--red)",
};
const card = (h, b, sub) =>
  `<div class="card dcard"><h4>${h}${sub ? `<small>${sub}</small>` : ""}</h4>${b}</div>`;
const dk = (a) =>
  `<div class="dk">${a.map(([v, l, d, c]) => `<div class="card"><b>${v}</b><small>${l}</small>${d ? `<em style="color:${c === "red" ? "var(--red)" : c === "amber" ? "#9A5B00" : "var(--green)"}">${d}</em>` : ""}</div>`).join("")}</div>`;
const hls = (rows, max = 100) =>
  rows
    .map(
      ([l, v, x, c]) =>
        `<div class="hl"><div class="r"><span>${l}</span><span>${x ?? v + "%"}</span></div><div class="t"><i style="width:${Math.min(100, (v / max) * 100)}%;background:${COL[c || "navy"]}"></i></div></div>`,
    )
    .join("");
const tbl = (h, rows) =>
  `<table class="tb"><tr>${h.map((x, i) => `<th class="${i && i === h.length - 1 ? "n" : ""}">${x}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((x, i) => `<td class="${i && i === r.length - 1 ? "n" : ""}">${x}</td>`).join("")}</tr>`).join("")}</table>`;
const ev = (c, t) =>
  `<div class="ev"><i style="background:${COL[c]}"></i><span>${t}</span></div>`;
const src = (t) => ``;
function line(vals, labels, o = {}) {
  const W = 300,
    H = 110,
    P = 24,
    min = o.min,
    max = o.max;
  const X = (i) => P + (i * (W - 2 * P)) / (vals.length - 1),
    Y = (v) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const pts = vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  const cls = o.cls ? o.cls.map((v, i) => `${X(i)},${Y(v)}`).join(" ") : "";
  return `<svg viewBox="0 0 ${W} ${H + 20}" width="100%"><defs><linearGradient id="g${o.id || 0}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5A623" stop-opacity=".35"/><stop offset="1" stop-color="#F5A623" stop-opacity="0"/></linearGradient></defs>
 <polygon points="${X(0)},${H - P} ${pts} ${X(vals.length - 1)},${H - P}" fill="url(#g${o.id || 0})"/>${cls ? `<polyline points="${cls}" fill="none" stroke="#C9D1E3" stroke-width="2" stroke-dasharray="4 4"/>` : ""}
 <polyline points="${pts}" fill="none" stroke="#13213D" stroke-width="2.6" stroke-linejoin="round"/>${vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === vals.length - 1 ? 5 : 3.5}" fill="${i === vals.length - 1 ? "#F5A623" : "#13213D"}" stroke="#fff" stroke-width="2"/><text x="${X(i)}" y="${Y(v) - 10}" font-size="10" font-weight="800" fill="#13213D" text-anchor="middle" font-family="Montserrat">${v}%</text>`).join("")}
 ${labels.map((l, i) => `<text x="${X(i)}" y="${H + 15}" font-size="9.5" font-weight="600" fill="#6B7385" text-anchor="middle" font-family="Montserrat">${l}</text>`).join("")}</svg>`;
}
const PHONE =
  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>';
const BELL =
  '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>';
const scoreCol = (v) =>
  v >= 75
    ? ["#E3F6EE", "#12784F"]
    : v >= 60
      ? ["#E7ECF7", "#13213D"]
      : v >= 50
        ? ["#FFF3DC", "#9A5B00"]
        : ["#FDE7E8", "#B4262B"];

/* ================= sample data (replace with Shule+ parent API) ================= */
let PARENT = {
  id: "parent-alice",
  n: "Alice Uwase",
  first: "Alice",
  ph: "250788123456",
  email: "alice.uwase@example.com",
};
let KIDS = [
  {
    id: "kevin",
    n: "Kevin Uwase",
    first: "Kevin",
    cls: "Senior 3",
    lvl: "O-Level",
    code: "KGS-2026-001",
    sdms: "SDM-2026-0001",
    cardno: "SHU-8801-2233",
    type: "Boarder",
    ct: "Mr. Jean Mugabo",
    dorm: "Kigali Dormitory · Room B-204",
    patron: "Mrs. Diane Mukandori",
    card: 45000,
    lastTop: ["18 Oct", 50000],
    fees: 300000,
    att: 80.0,
    avg: 74.5,
    prev: 73.3,
    trend: [71.5, 73.3, 74.5],
    cls_avg: [63.0, 64.5, 65.0],
    rank: "9 of 42",
    conduct: 75,
    today: {
      where: "In class · Room 12",
      what: "Mathematics · Quadratic Equations",
      with: "Mr. Patrick Niyonzima",
      period: "Period 1 · 07:30–08:20",
      trail: [
        ["ok", "Gate", "07:15"],
        ["cur", "In class", "07:30"],
        ["", "Lunch", "12:00"],
      ],
    },
    subj: [
      [
        "Mathematics",
        85,
        "Mr. Patrick Niyonzima",
        "Active participation in class.",
      ],
      ["English", 82, "Ms. Diane Uwase", "Strong reading and grammar."],
      ["Kinyarwanda", 88, "Mr. Emmanuel", "Umusaruro mwiza cyane."],
      ["Physics", 72, "Mr. Eric Habimana", "Practise formula derivations."],
      ["Chemistry", 76, "Ms. Jane", "Good laboratory report writing."],
      ["Biology", 80, "Mr. Alfred", "Very careful diagrams."],
      ["ICT", 90, "Mr. Samuel", "Fast touch-typing progress."],
    ],
    hw: [
      [
        "24",
        "OCT",
        "Mathematics",
        "Quadratic equations problems 1–20",
        "Due tomorrow",
        "amber",
      ],
      [
        "23",
        "OCT",
        "English",
        "Essay: The Role of Youth",
        "Submitted",
        "green",
      ],
    ],
    tests: [
      ["5 Nov", "Mathematics exam", "Mid-Term"],
      ["8 Nov", "Physics exam", "Mid-Term"],
      ["12 Nov", "English exam", "End of Term"],
    ],
    cardtx: [
      ["18 Oct 12:00", "Canteen purchase", -5000],
      ["04 Oct 12:00", "Parent top-up via MTN", 50000],
    ],
    feeLines: [
      ["Tuition & Boarding Fees", "1,500,000", "1,200,000", "300,000"],
      ["Learning Materials", "120,000", "120,000", "0"],
    ],
    health: [
      [
        "22 Oct",
        "Medication",
        "Inhaler administered for mild asthma episode · Salbutamol",
        "green",
      ],
      [
        "18 Oct",
        "Checkup",
        "Routine school clinic checkup · vitals normal",
        "green",
      ],
    ],
    disc: [
      [
        "12 Oct",
        "Merit",
        "Helped organize class library & peer tutoring",
        "green",
      ],
      ["29 Sep", "Merit", "Won inter-house Mathematics quiz", "green"],
    ],
    kit: {
      for: "Senior 3 (2027)",
      items: [
        ["Exercise Books (Pack of 5)", 2, 6000],
        ["Mathematics Set", 1, 8000],
        ["Gym Kit (Shirt + Shorts)", 1, 18000],
        ["School Blazer", 1, 35000],
      ],
      shoe: "39",
      uni: "M",
    },
    bus: {
      n: "KBA 123 A",
      route: "Kicukiro – Remera Route",
      drv: "Jean Bosco",
      ph: "+250788000111",
      pick: "06:15",
      drop: "17:00",
      st: "At school",
    },
  },
  {
    id: "emely",
    n: "Emely Uwase",
    first: "Emely",
    cls: "Senior 1",
    lvl: "O-Level",
    code: "KGS-2026-002",
    sdms: "SDM-2026-0002",
    cardno: "SHU-8801-3344",
    type: "Day scholar",
    ct: "Ms. Diane Uwase",
    bus: {
      n: "KBA 123 A",
      route: "Kicukiro – Remera Route",
      drv: "Jean Bosco",
      ph: "+250788000111",
      pick: "06:15",
      drop: "17:00",
      st: "At school",
    },
    card: 15000,
    lastTop: ["12 Oct", 15000],
    fees: 0,
    att: 100.0,
    avg: 82.0,
    prev: 80.5,
    trend: [78.0, 80.5, 82.0],
    cls_avg: [64.0, 65.0, 66.0],
    rank: "5 of 45",
    conduct: 100,
    today: {
      where: "In class · Room 8",
      what: "English · Literature",
      with: "Ms. Diane Uwase",
      period: "Period 1 · 07:30–08:20",
      trail: [
        ["ok", "Gate", "07:15"],
        ["cur", "In class", "07:30"],
        ["", "Lunch", "12:00"],
      ],
    },
    subj: [
      ["English", 88, "Ms. Diane Uwase", "Excellent reading skills."],
      ["Mathematics", 80, "Mr. Patrick Niyonzima", "Consistent performance."],
      ["Kinyarwanda", 85, "Mr. Emmanuel", "Inyandiko nziza cyane."],
      ["ICT", 86, "Mr. Samuel", "Enthusiastic in lab exercises."],
    ],
    hw: [
      [
        "24",
        "OCT",
        "ICT",
        "Typing Practice for 20 minutes daily",
        "Due Friday",
        "amber",
      ],
    ],
    tests: [["10 Nov", "English quiz", "Reading comprehension"]],
    cardtx: [["12 Oct 09:30", "Top-up · MTN MoMo", 15000]],
    feeLines: [["Tuition Fees, Term 1", "260,000", "260,000", "0"]],
    health: [
      ["18 Oct", "Checkup", "Routine clinic checkup · vitals normal", "green"],
    ],
    disc: [
      ["15 Oct", "Merit", "Outstanding presentation in assembly", "green"],
    ],
    kit: {
      for: "Senior 1 (2027)",
      items: [
        ["Exercise Books (Pack of 5)", 2, 6000],
        ["Mathematics Set", 1, 8000],
      ],
      shoe: "37",
      uni: "S",
    },
  },
];
let K = 0;
const kitTotal = (k: any) => {
  if (!k || !k.kit) return 0;
  if (typeof KW !== "undefined" && KW.items && KW.items[k.id]) {
    return kitSelTotal(k);
  }
  const items = Array.isArray(k.kit.items) ? k.kit.items : [];
  const base = items.reduce((a: number, item: any) => {
    const q = Number(String(item[1] || 1).replace(/,/g, "")) || 1;
    const p = Number(String(item[2] || 0).replace(/,/g, "")) || 0;
    return a + q * p;
  }, 0);
  return base + (KIT.shoe ? 12000 : 0) + (KIT.uni ? 9800 : 0);
};
let KIT = { enrolled: {}, shoe: true, uni: true, plan: "save", step: 0 };

/* ================= header ================= */
function selectKid(i: number) {
  K = i;
  (window as any).K = i;
  renderAll();
}
function hero0(title, sub) {
  const currentKid = KIDS[K] || KIDS[0];
  const greetingDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const initials = ini(PARENT.first, PARENT.n) || "P";
  return `<div class="hero" style="padding-bottom:${title ? "22px" : "78px"}"><div class="toprow"><div class="school" onclick="showLanding()" style="cursor:pointer" title="Back to the start page"><div class="crest">${svgI('<path d="m15 18-6-6 6-6"/>').replace("<svg", '<svg width="16" height="16" fill="none" stroke="#13213D" stroke-width="2.6"')}</div><div><b>${title || currentKid?.schoolName || "Parent console"}</b></div></div>
 <div style="display:flex;gap:8px"><button class="iconbtn" onclick="openNotif()">${svgI(BELL)}<span class="dot"></span></button><button class="iconbtn" onclick="openMore()" style="font-size:11px;font-weight:800;color:#fff">${initials}</button></div></div>
 ${title ? "" : `<div class="greet"><p>${greetingDate} · ${currentKid?.term || "Term 1"}</p><h2>Hello, ${PARENT.first}</h2></div>`}
 <div class="kids">${KIDS.map((k, i) => `<button class="kid ${i === K ? "on" : ""}" onclick="selectKid(${i})"><span class="av" style="overflow:hidden;padding:0">${avatar(k)}</span><span>${k.first}<small>${k.cls} · ${k.type || "Student"}</small></span></button>`).join("")}</div>${sub || ""}</div>`;
}

/* ================= HOME ================= */
const IC = {
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  kit: '<path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><rect x="3" y="7" width="18" height="14" rx="2"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  wallet:
    '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><circle cx="17" cy="14" r="1.5"/>',
  pay: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  bus: '<rect x="3" y="4" width="18" height="13" rx="3"/><path d="M3 11h18M7 21h.01M17 21h.01"/>',
};
const todoRow = (c, ic, t, s, f) =>
  `<div class="lr" onclick="${f}"><span class="pic" style="background:${c === "red" ? "#FDE7E8" : c === "amber" ? "#FFF3DC" : "#E7ECF7"}"><svg viewBox="0 0 24 24" stroke="${c === "red" ? "#B4262B" : c === "amber" ? "#9A5B00" : "#13213D"}">${IC[ic]}</svg></span><div><b>${t}</b><small>${s}</small></div><span style="color:var(--muted)">›</span></div>`;
function renderHome0() {
  const k = kid();
  const hwDue = k.hw.filter((h) => h[5] !== "green").length;
  $("#v-home").innerHTML =
    hero() +
    `<div class="wrap">
  <div class="card glance"><div class="gh"><b>${k.first} at a glance</b><small>Term 3 · Week 8</small></div>
   <div class="gg">
    <button class="gm" onclick="openCard()"><small>Pocket money</small><b style="${k.card < 3000 ? "color:var(--red)" : ""}">${fmt(k.card)}</b><em style="color:${k.card < 3000 ? "var(--red)" : "var(--muted)"}">${k.card < 3000 ? "Low · top up" : "RWF on ShuleCard"}</em></button>
    <button class="gm" onclick="openAttendance()"><small>Attendance</small><b>${k.att}%</b><em style="color:var(--green)">This term</em></button>
    <button class="gm" onclick="go('learn')"><small>Term average</small><b>${k.avg}%</b><em style="color:${k.avg >= k.prev ? "var(--green)" : "var(--red)"}">${k.avg >= k.prev ? "▲" : "▼"} ${Math.abs(k.avg - k.prev).toFixed(1)} pts</em></button>
    <button class="gm" onclick="go('pay')"><small>Fees due</small><b style="${k.fees ? "color:var(--red)" : ""}">${k.fees ? fmt(k.fees / 1000) + "K" : "0"}</b><em style="color:${k.fees ? "var(--red)" : "var(--green)"}">${k.fees ? "RWF · Term 3" : "All paid"}</em></button>
    <button class="gm" onclick="openHomework()"><small>Homework</small><b>${hwDue} due</b><em style="color:#9A5B00">${k.hw[0]?.[4] || "Nothing due"}</em></button>
    <button class="gm" onclick="openDiscipline()"><small>Conduct</small><b>${k.conduct}<span style="font-size:10px;color:var(--muted)">/100</span></b><em style="color:var(--green)">${k.disc.filter((d) => d[1] === "Merit").length} merits</em></button>
   </div></div>
  <div class="sec"><h3>Quick actions</h3></div>
  <div class="qa">
    <button onclick="document.querySelectorAll('.qa button').forEach(b=>b.classList.remove('selected'));this.classList.add('selected');reportAbsence()"><span class="sq">${svgI(IC.cal)}</span>Report absence</button>
    <button onclick="document.querySelectorAll('.qa button').forEach(b=>b.classList.remove('selected'));this.classList.add('selected');getBabyeyi()"><span class="sq">${svgI(IC.doc)}</span>Get Babyeyi</button>
    <button onclick="document.querySelectorAll('.qa button').forEach(b=>b.classList.remove('selected'));this.classList.add('selected');openTrips()"><span class="sq">${svgI('<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 11h16M9 4v7M15 4v7M7.5 18v2M16.5 18v2"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>')}</span>School trips</button>
    <button onclick="document.querySelectorAll('.qa button').forEach(b=>b.classList.remove('selected'));this.classList.add('selected');topUp()"><span class="sq">${svgI(IC.wallet)}</span>Top up</button>
  </div>
  <div class="sec"><h3>To do</h3></div>
  <div class="card todo">
   ${
     KIDS.some((x) => x.fees)
       ? todoRow(
           "red",
           "pay",
           `Pay ${rwf(KIDS.reduce((a, x) => a + x.fees, 0))} school fees`,
           "Term 3 balance · " +
             KIDS.filter((x) => x.fees)
               .map((x) => x.first)
               .join(" and ") +
             " · 41 days overdue",
           "payFees()",
         )
       : ""
   }
   ${KIDS.some((x) => !KIT.enrolled[x.id]) ? todoRow("amber", "kit", "Request ShuleKit for Term 1 2027", "Closes 15 Nov · save from RWF 5,000 a week", "go('kit')") : ""}
   ${k.card < 3000 ? todoRow("amber", "wallet", `Top up ${k.first}’s ShuleCard`, `${rwf(k.card)} left for the canteen`, "topUp()") : ""}
   ${todoRow("amber", "cal", "Reply to the Sports Day invitation", "Saturday 7 Nov · confirm by 30 Oct", "openCircular()")}
  </div>
  <div class="sec"><h3>Today in class</h3><a onclick="openToday()">Full day</a></div>
  <div class="card" onclick="openToday()" style="cursor:pointer;display:flex;gap:12px;align-items:center"><span class="pic" style="width:42px;height:42px;border-radius:13px;background:var(--amber-soft);display:grid;place-items:center;flex-shrink:0"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9A5B00" stroke-width="2">${IC.book}</svg></span><div style="flex:1;min-width:0"><b style="font-size:12.5px;display:block">${k.today.what}</b><small style="font-size:10.5px;color:var(--muted)">${k.today.period} · ${k.today.with}</small></div><span class="chip green">Present</span></div>
  ${k.bus ? `<div class="sec"><h3>School bus</h3></div><div class="card bus-home-card"><div class="bus-home-main"><span class="bus-home-badge">Bus ${k.bus.n}</span><div class="bus-home-info"><b>${k.bus.route} route</b><div class="bus-home-meta"><span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Pick-up ${k.bus.pick}</span><span><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>Driver ${k.bus.drv.split(" ")[0]}</span></div></div></div><a class="callbtn bus-home-call" href="tel:${k.bus.ph}" onclick="event.stopPropagation();toast('Calling the bus driver')" title="Call driver">${svgI(PHONE)}</a></div>` : ""}
  </div>`;
}
function openToday() {
  const k = kid();
  const todayKey = new Date().toISOString().slice(0, 10);
  const rec =
    (k.attendance || []).find((r) => r.date === todayKey) ||
    (k.attendance || []).slice(-1)[0];
  const label = rec ? ATT_STATUS_LABEL[rec.status] || String(rec.status) : "No record";
  const detailColor =
    rec && rec.status === "ABSENT" ? "red" : rec && rec.status === "LATE" ? "amber" : "";
  const dateLabel = new Date(todayKey + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lessons = k.todayLessons || [];
  const rows = lessons.map((l) => [
    ["P" + l.period, l.startTime].filter(Boolean).join(" "),
    l.subject || "Lesson",
    [l.teacher, l.room].filter(Boolean).join(" · ") || "—",
  ]);
  pushPanel({
    k: k.n + " · " + k.cls,
    t: "Today at school",
    s: dateLabel,
    b: `${src("Digital Attendance, Timetable and TichaPortal")}
  ${dk([
    [label, "Attendance today", rec && rec.notes ? rec.notes : "", detailColor],
    [k.today.where || "—", "Where", k.today.period || ""],
  ])}
  ${card(
    "Today’s lessons",
    rows.length
      ? tbl(["Period", "Subject", "Teacher / room"], rows)
      : `<p class="qlnote">No timetable slots have been published for today${k.today.what ? " · " + k.today.what : ""}.</p>`,
  )}
  ${
    k.today.trail && k.today.trail.length
      ? card(
          "Gate & class trail",
          k.today.trail
            .map(([c, t, d]) => ev(c || "navy", `<b>${t}</b> · ${d}`))
            .join(""),
        )
      : ""
  }
  ${card("Spent today on ShuleCard", k.cardtx[0] ? `<b style="font-size:16px">${rwf(Math.abs(k.cardtx[0][2]))}</b><p class="qlnote" style="margin-top:4px">${k.cardtx[0][1]} at ${k.cardtx[0][0].split(" ")[2] || ""}</p>` : '<p class="qlnote" style="margin-top:0">No ShuleCard spending today.</p>')}`,
  });
}

/* ================= LEARNING ================= */
let lTab = "overview";
function renderLearn() {
  const k = kid();
  $("#v-learn").innerHTML =
    hero("Learning journey") +
    `<div class="seg" style="padding-top:14px">${[
      ["overview", "Overview"],
      ["academics", "Academics"],
      ["attendance", "Attendance"],
    ]
      .map(
        ([x, l]) =>
          `<button class="${lTab === x ? "on" : ""}" onclick="lTab='${x}';renderLearn()">${l}</button>`,
      )
      .join("")}</div><div class="wrap" id="lbody">${learnBody(k)}</div>`;
}
function learnBody(k) {
  if (lTab === "overview") {
    const sorted = [...k.subj].sort((a, b) => b[1] - a[1]);
    const trend = Array.isArray(k.trend) ? k.trend : [];
    const trendLabels =
      k.trendLabels && k.trendLabels.length === trend.length
        ? k.trendLabels
        : trend.map((_, i) => "Term " + (i + 1));
    const trendMin = trend.length ? Math.max(0, Math.min(...trend) - 5) : 0;
    const trendMax = trend.length ? Math.min(100, Math.max(...trend) + 5) : 100;
    const hasCls = Array.isArray(k.cls_avg) && k.cls_avg.length === trend.length && trend.length > 0;
    const trendCard =
      trend.length >= 2
        ? line(trend, trendLabels, {
            min: trendMin,
            max: trendMax,
            cls: hasCls ? k.cls_avg : undefined,
            id: 1,
          }) +
          `<div class="legend"><span><i style="background:var(--navy)"></i>${k.first}</span>${hasCls ? `<span><i style="background:#C9D1E3"></i>Class average</span>` : ""}</div>`
        : `<p class="qlnote">Not enough published terms to chart a trend yet.</p>`;
    const delta = k.prev
      ? (k.avg >= k.prev ? "▲ " : "▼ ") + Math.abs(k.avg - k.prev).toFixed(1) + " pts"
      : "";
    return `${src("Academic, TichaPortal and Digital Attendance")}
  ${card("Term average across the year", trendCard, k.rank === "—" ? "" : k.rank + " in class")}
  ${dk([
    [
      k.avg + "%",
      (k.term || "Current") + " average",
      delta,
      k.prev && k.avg < k.prev ? "red" : "",
    ],
    [k.att + "%", "Attendance", "This term"],
    [
      String(k.subj.filter((s) => s[1] >= 50).length) + " / " + k.subj.length,
      "Subjects passed",
      "Pass mark 50%",
    ],
    [k.conduct + "/100", "Conduct", ""],
  ])}
  ${card(
    "Doing well",
    sorted
      .slice(0, 3)
      .map((s) => ev("green", `<b>${s[0]}</b> · ${s[1]}% · ${s[3]}`))
      .join(""),
  )}
  ${card(
    "Needs support",
    sorted
      .slice(-3)
      .reverse()
      .map((s) =>
        ev(s[1] < 60 ? "red" : "amber", `<b>${s[0]}</b> · ${s[1]}% · ${s[3]}`),
      )
      .join(""),
  )}
  ${card("Coming up", k.tests.map(([d, t, s]) => `<div class="hw"><div class="d"><b>${d.split(" ")[0]}</b><small>${d.split(" ")[1].toUpperCase()}</small></div><div class="m"><b>${t}</b><small>${s}</small></div></div>`).join(""))}`;
  }
  if (lTab === "academics") return academicsBody(k);
  if (lTab === "attendance") return attendanceBody(k);
  return attendanceBody(k);
}
function academicsBody(k) {
  return `${src("Academic · marks, reports and homework")}
  <div class="sec"><h3>Subject marks</h3></div>
  <div class="card" style="margin-top:4px">${k.subj
    .map(([n, v, t, c], i) => {
      const [bg, fg] = scoreCol(v);
      return `<div class="subj" onclick="openSubject(${i})"><span class="sc" style="background:${bg};color:${fg}">${v}</span><div><b>${n}</b><small>${t}</small><div class="bar"><i style="width:${v}%;background:${fg}"></i></div></div><span style="color:var(--muted)">›</span></div>`;
    })
    .join("")}</div>
  <div class="sec"><h3>Report cards</h3></div>
  ${
    (k.reportCards || []).length
      ? (k.reportCards || [])
          .map((r, i) => {
            const title =
              [r.term, r.academicYear].filter(Boolean).join(" ") || "Report card";
            const kindLabel =
              r.reportKind === "midterm"
                ? "Mid-term report"
                : r.reportKind === "beginning"
                  ? "Beginning-of-term report"
                  : "End-of-term report";
            const meta = [kindLabel, r.className].filter(Boolean).join(" · ");
            const ready = r.allowed;
            const note = r.message || (r.publishedAt ? "Published " + r.publishedAt : "");
            const icon = svgI(
              '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
            ).replace(
              "<svg",
              '<svg width="18" height="18" fill="none" stroke-width="2" stroke="' +
                (ready ? "#12784F" : "#B4262B") +
                '"',
            );
            return `<div class="card cprof" style="cursor:default"><div class="h"><span class="pic" style="width:42px;height:42px;border-radius:13px;background:${ready ? "#E3F6EE" : "#FDE7E8"};display:grid;place-items:center">${icon}</span><div class="m"><b>${title}</b><small class="s">${meta}${note ? " · " + note : ""}</small></div>${ready ? `<button class="chip green" onclick="openReportCard(${i})">View report</button>` : `<button class="chip red" onclick="payFees()">Pay to unlock</button>`}</div></div>`;
          })
          .join("")
      : `<div class="card"><p class="qlnote">No report cards have been published for this term yet.</p></div>`
  }
  
  <div class="sec"><h3>Homework</h3></div>
  ${homeworkBody(k)}`;
}
function openSubject(i) {
  const k = kid(),
    [n, v, t] = k.subj[i];
  const key = String(n || "").trim().toLowerCase();
  const marks = (k.subjectMarks && k.subjectMarks[key]) || [];
  const rows = marks.map((m) => [
    m.title + (m.date ? ` · ${m.date}` : ""),
    m.pct,
    m.pct + "%",
    m.pct >= 60 ? "navy" : "amber",
  ]);
  const teacher = t || "Subject Teacher";
  pushPanel({
    k: k.n + " · " + k.cls,
    t: n,
    s: "Teacher: " + teacher,
    b: `${src("Academic · marks published in TichaPortal")}${dk([
      [
        v + "%",
        "Term average",
        marks.length
          ? marks.length + " assessment" + (marks.length === 1 ? "" : "s")
          : "No marks yet",
        v >= 60 ? "" : "amber",
      ],
      [String(k.rank || "—"), "Class rank", ""],
    ])}
  ${
    marks.length
      ? card("Assessments this term", hls(rows))
      : `<div class="card"><p class="qlnote">No individual assessments have been published for ${n} yet.</p></div>`
  }
  <button class="bigbtn" onclick="openChat('${teacher}')">Message ${teacher.split(" ")[0]}</button>`,
  });
}
function reportKindLabel(kind) {
  return kind === "midterm"
    ? "Mid-term report"
    : kind === "beginning"
      ? "Beginning-of-term report"
      : "End-of-term report";
}
function renderReport(report) {
  const subjects = (report && report.subjects) || [];
  const rows = subjects.map((s) => [
    s.subject || s.subjectName || "Subject",
    Math.round(Number(s.percentage ?? s.totalScore ?? 0)) + "%",
    s.grade || "—",
  ]);
  const overall =
    report && report.overallScore != null
      ? Math.round(Number(report.overallScore)) + "%"
      : "—";
  const pos =
    report && report.position
      ? `${report.position} of ${report.classSize || "?"}`
      : "—";
  return `${src("Academic · published report card")}${dk([
    [overall, "Overall", report && report.overallGrade ? "Grade " + report.overallGrade : ""],
    [pos, "Position", ""],
  ])}${
    rows.length
      ? card("Subjects", tbl(["Subject", "Score", "Grade"], rows))
      : `<div class="card"><p class="qlnote">No subject rows are available in this report yet.</p></div>`
  }`;
}
async function openReportCard(i) {
  const k = kid();
  const rc = (k.reportCards || [])[i];
  if (!rc) return;
  const title = [rc.term, rc.academicYear].filter(Boolean).join(" ") || "Report card";
  const el = pushPanel({
    k: k.n + " · " + k.cls,
    t: title,
    s: reportKindLabel(rc.reportKind) + (rc.className ? " · " + rc.className : ""),
    b: `<p class="qlnote">Loading report…</p>`,
  });
  try {
    const data = await parentRealApi.getReportCard({
      studentId: k.id,
      classId: rc.classId,
      academicYear: rc.academicYear,
      term: rc.term,
      reportKind: rc.reportKind,
    });
    repaint(el, renderReport(data?.report || data));
  } catch (e) {
    repaint(el, `<p class="qlnote">${String((e && e.message) || e)}</p>`);
  }
}
const ATT_STATUS_CLASS = {
  PRESENT: "P",
  LATE: "L",
  ABSENT: "A",
  EXCUSED: "E",
};
const ATT_STATUS_LABEL = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  EXCUSED: "Excused",
};
function attendanceBody(k) {
  const sm = k.attendanceSummary || {};
  const records = [...(k.attendance || [])].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const monthKey = records.length
    ? String(records[records.length - 1].date).slice(0, 7)
    : new Date().toISOString().slice(0, 7);
  const [yy, mm] = monthKey.split("-").map(Number);
  const monthLabel = new Date(yy, mm - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const byDay = new Map();
  for (const r of records) {
    if (String(r.date).slice(0, 7) === monthKey) {
      byDay.set(Number(String(r.date).slice(8, 10)), r);
    }
  }
  const firstDow = (new Date(yy, mm - 1, 1).getDay() + 6) % 7;
  const pad = firstDow < 5 ? firstDow : 0;
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const cells = [];
  for (let i = 0; i < pad; i++) cells.push(`<div class="pad"></div>`);
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = (new Date(yy, mm - 1, day).getDay() + 6) % 7;
    if (dow >= 5) continue;
    const rec = byDay.get(day);
    const cls = rec ? ATT_STATUS_CLASS[rec.status] || "F" : "F";
    const dateStr = rec
      ? String(rec.date).slice(0, 10)
      : `${monthKey}-${String(day).padStart(2, "0")}`;
    cells.push(
      `<button class="${cls}" onclick="attDay('${dateStr}')">${day}<i></i></button>`,
    );
  }
  return `${src("Digital Attendance · gate and class registers")}${dk([
    [k.att + "%", "Attendance rate", "This month", ""],
    [String(sm.monthlyPresent ?? 0), "Present", "This month", ""],
    [String(sm.monthlyLate ?? 0), "Late", "This month", "amber"],
    [
      String(sm.monthlyAbsent ?? 0),
      "Absent",
      sm.monthlyExcused ? sm.monthlyExcused + " excused" : "This month",
      "red",
    ],
  ])}
  ${card(
    monthLabel,
    `<div class="cal">${["Mon", "Tue", "Wed", "Thu", "Fri"].map((x) => `<div class="hd">${x}</div>`).join("")}${cells.join("")}</div>
   <div class="pslegend" style="margin-top:10px"><span><i style="background:var(--green)"></i>Present</span><span><i style="background:var(--amber)"></i>Late</span><span><i style="background:var(--red)"></i>Absent</span><span><i style="background:var(--navy)"></i>Excused</span></div>`,
    "Tap a day",
  )}
  <button class="bigbtn" onclick="reportAbsence()">Report an absence</button>`;
}
function attDay(dateStr) {
  const k = kid();
  const rec = (k.attendance || []).find((r) => r.date === dateStr);
  const title = new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (!rec) {
    openSheet(
      `<h3>${title}</h3><p class="lead">No attendance record was published for this day.</p><button class="go" onclick="closeSheet()">Close</button>`,
    );
    return;
  }
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  const bits = [
    rec.checkInTime ? "Gate in " + String(rec.checkInTime).slice(11, 16) : "",
    rec.checkOutTime ? "Gate out " + String(rec.checkOutTime).slice(11, 16) : "",
    rec.notes ? esc(rec.notes) : "",
  ].filter(Boolean);
  const label = ATT_STATUS_LABEL[rec.status] || esc(rec.status);
  openSheet(
    `<h3>${title}</h3><p class="lead">${label}${bits.length ? " · " + bits.join(" · ") : ""}</p>${rec.status === "ABSENT" ? '<button class="go" onclick="closeSheet();reportAbsence()">Explain this absence</button>' : '<button class="go" onclick="closeSheet()">Close</button>'}`,
  );
}
function _x_reportAbsence() {
  openSheet(`<h3>Report an absence</h3><p class="lead">The class teacher and the school are notified immediately.</p>
 <div class="lbl2" style="margin-top:14px">Child</div><div class="chips">${KIDS.map((x, i) => `<button class="${i === K ? "on" : ""}" onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">${x.first}</button>`).join("")}</div>
 <div class="lbl2">When</div><div class="chips"><button class="on" onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">Tomorrow</button><button onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">Friday</button><button onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">Pick dates</button></div>
 <div class="lbl2">Reason</div><div class="chips">${["Sick", "Medical appointment", "Family", "Other"].map((r, i) => `<button class="${i ? "" : "on"}" onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">${r}</button>`).join("")}</div>
 <textarea placeholder="Optional note to the school"></textarea><button class="go" onclick="closeSheet();toast('Absence reported to the class teacher')">Send to school</button>`);
}
function homeworkBody(k) {
  return `${src("TichaPortal · homework published by teachers")}<div class="card" style="margin-top:4px">${k.hw.map(([d, m, s, t, st, c]) => `<div class="hw"><div class="d"><b>${d}</b><small>${m}</small></div><div class="m"><b>${s}</b><small>${t}</small></div><span class="chip ${c}">${st}</span></div>`).join("")}</div>`;
}
const openAttendance = () => {
  lTab = "attendance";
  go("learn");
  renderLearn();
};
const openHomework = () => {
  lTab = "academics";
  go("learn");
  renderLearn();
};

/* ================= PAY ================= */
function renderPay() {
  const k = kid(),
    tot = KIDS.reduce((a, x) => a + x.fees, 0);
  $("#v-pay").innerHTML =
    hero("Payments") +
    `<div class="wrap">
  <div class="fac" style="margin-top:16px"><small>School fees due · Term 3 · ${
    KIDS.filter((x) => x.fees)
      .map((x) => x.first)
      .join(" and ") || "all paid"
  }</small><div class="big">${rwf(tot)}</div>
   <div class="row" style="margin-top:6px">${KIDS.filter((x) => x.fees)
     .map((x) => `<span>${x.first} · ${x.cls}<b>${rwf(x.fees)}</b></span>`)
     .join("")}<span style="text-align:right">Overdue<b>41 days</b></span></div>
   <button class="btn amber" style="width:100%;height:44px;border-radius:13px;margin-top:14px;font-size:13px;position:relative;z-index:1" onclick="payFees()">Pay school fees</button></div>
  <div class="card" style="margin-top:10px;display:flex;gap:12px;align-items:center;cursor:pointer" onclick="kaziAdvance()"><span class="ic" style="width:40px;height:40px;border-radius:12px;background:var(--amber-soft);display:grid;place-items:center">${svgI('<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>').replace("<svg", '<svg width="18" height="18" fill="none" stroke="#9A5B00" stroke-width="2"')}</span><div style="flex:1"><b style="font-size:12.5px">Spread fees over 3 months</b><br><small style="font-size:10.5px;color:var(--muted)">Kazi Advance for Parents · Edupoto Finance</small></div><span style="color:var(--muted)">›</span></div>
  <div class="sec"><h3>${k.first}’s fee statement</h3><a onclick="toast('Statement PDF downloaded')">Download</a></div>
  <div class="card">${tbl(["Item", "Billed", "Paid", "Balance"], k.feeLines)}</div>
  <div class="sec"><h3>Trips and goals</h3><a onclick="openGoals()">My goals</a></div>
  ${TRIPS.filter((t) => KIDS.some((x) => x.id === t.kid) && t.paid < t.cost)
    .map(tripCard)
    .join("")}${GOALS.filter((g) => KIDS.some((x) => x.id === g.kid))
    .map(goalCard)
    .join("")}
  <div class="sec"><h3>ShuleCard wallets</h3></div>
  <div class="money">${KIDS.map((x, i) => `<div class="card mcard" onclick="K=${i};renderAll();openCard()"><small>${x.first} · ${x.cls}</small><b style="${x.card < 3000 ? "color:var(--red)" : ""}">${rwf(x.card)}</b><small>Last top-up ${x.lastTop[0]}</small><button class="btn amber" onclick="event.stopPropagation();K=${i};topUp()">Top up</button></div>`).join("")}</div>
  <div class="sec"><h3>Recent payments</h3><a onclick="toast('Showing all transactions')">All</a></div>
  <div class="card">${tbl(["Date", "For", "RWF"], KIDS.flatMap((x) => (x.cardtx || []).map((t) => [t[0], x.first + " · " + t[1], fmt(Math.abs(t[2]))])).slice(0, 5))}<p class="qlnote">Every payment has a receipt in the app. Tap a row in the full list to download it.</p></div>
 </div>`;
}
function payFlow(
  title,
  lead,
  amounts,
  def,
  methods,
  cta,
  done,
  collectPayerPhone = false,
) {
  let amt = def,
    m = methods[0],
    payerPhone = PARENT.ph || "";
  const draw = () =>
    openSheet(`<h3>${title}</h3><p class="lead">${lead}</p><div class="bigamt"><input id="amt" value="${fmt(amt)}" oninput="this.value=this.value.replace(/[^0-9,]/g,'')"><small>RWF</small></div>
  <div class="amt">${amounts.map((a) => `<button class="${a === amt ? "on" : ""}" data-a="${a}">${a >= 1e6 ? a / 1e6 + "M" : a >= 1e3 ? a / 1e3 + "K" : a}</button>`).join("")}</div>
  <div class="lbl2">Pay with</div>${methods.map((x) => `<div class="opt ${x === m ? "on" : ""}" data-m="${x}"><i></i>${x}</div>`).join("")}
  ${collectPayerPhone && m !== "Card" ? `<div class="lbl2">Pay from phone number</div><input id="payer-phone" type="tel" autocomplete="tel" placeholder="+250 7XX XXX XXX" value="${payerPhone}" style="width:100%;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;font:inherit;color:var(--navy);background:#fff">` : ""}
  <button class="go" id="paygo">${cta}</button>`);
  draw();
  const bind = () => {
    $("#sheet")
      .querySelectorAll(".amt button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            amt = +b.dataset.a;
            draw();
            bind();
          }),
      );
    $("#sheet")
      .querySelectorAll(".opt")
      .forEach(
        (o) =>
          (o.onclick = () => {
            m = o.dataset.m;
            draw();
            bind();
          }),
      );
    const phoneInput = $("#payer-phone");
    if (phoneInput) phoneInput.oninput = () => (payerPhone = phoneInput.value);
    $("#paygo").onclick = () => {
      const v = +$("#amt").value.replace(/,/g, "") || amt;
      if (collectPayerPhone && m !== "Card" && !payerPhone.trim()) {
        toast("Enter the phone number to pay from");
        return;
      }
      openSheet(
        `<h3>Confirm on your phone</h3><p class="lead">A ${m} prompt for ${rwf(v)} has been sent to ${collectPayerPhone && m !== "Card" ? payerPhone.trim() : PARENT.ph}. Enter your PIN on your phone to approve.</p><div class="wdone" style="padding:20px 0"><div class="em">${svgI('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>').replace("<svg", '<svg width="34" height="34" fill="none" stroke="#13213D" stroke-width="2.4"')}</div></div><button class="go" id="paidok">I have approved it</button>`,
      );
      $("#paidok").onclick = async () => {
        closeSheet();
        try {
          await done(
            v,
            m,
            collectPayerPhone && m !== "Card" ? payerPhone.trim() : PARENT.ph,
          );
        } catch (error) {
          console.warn("Payment submission:", error);
          toast("Payment could not be submitted. Please try again.");
        }
      };
    };
  };
  bind();
}
let PF = {
  step: 0,
  child: 0,
  other: "",
  items: [],
  amt: 0,
  method: "MTN MoMo",
};
const PFS = ["Student", "Fees", "Choose", "Amount", "Availability", "Review"];
const PFI = [
  '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h8M8 18h5"/>',
  '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  '<path d="M20 6 9 17l-5-5"/>',
];
const METH = [
  ["MTN MoMo", "Mobile money"],
  ["Airtel Money", "Mobile money"],
  ["Bank of Kigali", "Bank transfer"],
  ["Bank of Africa", "Bank transfer"],
  ["Equity Bank", "Bank transfer"],
  ["Visa / Mastercard", "Card"],
];
const unpaid = (k) =>
  k.feeLines.map((l, i) => [i, l]).filter(([i, l]) => l[3] !== "0");
const num = (x) => +String(x).replace(/,/g, "");
function payFees() {
  PF.step = 0;
  const mk = myKids();
  PF.child = mk.includes(K) ? K : mk.length ? mk[0] : null;
  if (PF.child == null) {
    PF.items = [];
    PF.amt = 0;
    pfStep();
    return;
  }
  PF.items = unpaid(kid()).map(([i]) => i);
  PF.amt = 0;
  pfStep();
}
function pfStep0() {
  const k = PFK();
  const sel = k.feeLines.filter((l, i) => PF.items.includes(i));
  const due = sel.reduce((a, l) => a + num(l[3]), 0);
  if (!PF.amt || PF.amt > due) PF.amt = due;
  const body = [
    () => {
      const mk = myKids();
      return `<div class="boxc"><h5>My children</h5>${
        mk.length
          ? mk
              .map((i) => {
                const x = KIDS[i];
                return `<div class="pr ${PF.child === i ? "on" : ""}" onclick="PF.child=${i};PF.items=unpaid(KIDS[${i}]).map(([j])=>j);PF.amt=0;pfStep()"><span class="pic">${x.first[0]}I</span><div><b>${x.n} · ${x.cls}</b><small>${x.sdms} · balance ${rwf(x.fees)}</small></div>${chk}</div>`;
              })
              .join("")
          : '<div class="empty2">No linked children found. Search by SDMS ID below.</div>'
      }</div>
   <div class="orline"><span>OR</span></div>
   <div class="boxc"><b style="font-size:13px;font-weight:800;color:var(--navy)">Search by SDMS code / ID</b><div class="sdmsin" style="margin-top:10px"><span class="ic">${svgI('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}</span><input id="pfq" placeholder="SDMS code / ShuleCard no." value="${PF.other}" oninput="PF.other=this.value"><button class="go2" onclick="(()=>{const i=findKid($('#pfq').value);if(i<0){toast('No learner found for that code');return}PF.child=i;PF.items=unpaid(KIDS[i]).map(([j])=>j);PF.amt=0;PF.other='';pfStep();toast('Found '+KIDS[i].n)})()">${svgI('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button></div>
   ${PF.child != null && !mk.includes(PF.child) ? `<div class="found"><div class="r"><span class="av">${KIDS[PF.child].first[0]}I</span><div><b>${KIDS[PF.child].n}</b><small>${KIDS[PF.child].cls} · Umucyo SS</small></div></div></div>` : ""}</div>`;
    },
    () =>
      `<div class="rev"><div class="rr"><span>Student</span><b>${k.n} · ${k.cls}</b></div><div class="rr"><span>School</span><b></b></div><div class="rr"><span>Term</span><b>Term 3 2026</b></div></div><div class="lbl2" style="margin-top:14px">Fee account</div>${tbl(["Item", "Billed", "Paid", "Balance"], k.feeLines)}<div class="rev" style="margin-top:10px"><div class="rr"><span>Total balance</span><b style="color:var(--red)">${rwf(k.fees)}</b></div></div>`,
    () =>
      `<p class="lead">Select what you are paying for now.</p><div style="margin-top:8px">${k.feeLines.map((l, i) => (l[3] === "0" ? `<div class="feeitem" style="opacity:.45;cursor:default"><span class="ck"></span><div><b>${l[0]}</b><small>Paid in full</small></div><b>0</b></div>` : `<div class="feeitem ${PF.items.includes(i) ? "on" : ""}" onclick="(a=>a.includes(${i})?a.splice(a.indexOf(${i}),1):a.push(${i}))(PF.items);PF.amt=0;pfStep()">${chk}<div><b>${l[0]}</b><small>Billed ${l[1]} · paid ${l[2]}</small></div><b>${l[3]}</b></div>`)).join("")}</div>`,
    () =>
      `<p class="lead">Pay the full amount for the selected items, or part of it.</p><div class="bigamt"><input id="pfamt" value="${fmt(PF.amt)}" oninput="PF.amt=Math.min(${due},num(this.value)||0)"><small>RWF · of ${rwf(due)}</small></div><div class="amt">${[
        due,
        Math.round(due / 2 / 1000) * 1000,
        100000,
        50000,
      ]
        .filter((v, i, a) => v > 0 && v <= due && a.indexOf(v) === i)
        .map(
          (v) =>
            `<button class="${PF.amt === v ? "on" : ""}" onclick="PF.amt=${v};pfStep()">${v === due ? "Full" : fmt(v / 1000) + "K"}</button>`,
        )
        .join(
          "",
        )}</div><p class="qlnote">Partial payments are applied to the selected items in order.</p>`,
    () =>
      `<p class="lead">School-fee payments are not connected in this app. You can review the amount, but no payment can be made here.</p><div class="found" style="margin-top:12px"><small>Use a payment channel provided directly by the school. Your balance will only change after a verified payment is recorded.</small></div>`,
    () =>
      `<div class="rev"><div class="rr"><span>Student</span><b>${k.n} · ${k.cls}</b></div><div class="rr"><span>For</span><b>${sel.map((l) => l[0]).join(", ")}</b></div><div class="rr"><span>Amount</span><b>${rwf(PF.amt)}</b></div><div class="rr"><span>Payment status</span><b>Not connected</b></div><div class="rr"><span>Current balance</span><b>${rwf(k.fees)}</b></div></div><p class="qlnote">No payment has been started. Use a verified school payment channel; this statement changes only after the school records payment.</p>`,
  ];
  const last = PF.step === PFS.length - 1;
  openSheet(`<div class="wzh"><small>Pay school fees · Step ${PF.step + 1} of ${PFS.length}</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">${["Pay school fees", "Fee account", "Choose items", "Amount", "Payment method", "Review and pay"][PF.step]}</h3>
  <div class="istep">${PFI.map((ic, i) => `${i ? "<s></s>" : ""}<i class="${i < PF.step ? "done" : i === PF.step ? "on" : ""}">${svgI(ic)}</i>`).join("")}</div><div class="steplbl">${PFS.map((n, i) => `<span class="${i <= PF.step ? "on" : ""}">${n}</span>`).join("")}</div>
  <div style="margin-top:12px">${body[PF.step]()}</div>
  <div style="display:flex;gap:8px;margin-top:16px">${PF.step > (PF.child === -1 ? 1 : 0) ? '<button class="go" style="background:var(--bg);color:var(--navy);flex:1" onclick="PF.step--;pfStep()">Back</button>' : ""}<button class="go" style="flex:2;${(PF.step === 2 && !PF.items.length) || PF.child == null ? "opacity:.35;pointer-events:none" : ""}" onclick="${last ? "pfPay()" : "PF.step++;pfStep()"}">${last ? "Check payment availability" : "Continue"}</button></div>`);
}
function pfPay() {
  openSheet(
    `<h3>Fee payment unavailable</h3><p class="lead">This app does not have a connected school-fee payment gateway. No payment has been started, and your balance will not change.</p><p class="qlnote">Please use the school’s verified payment channel. Your fee statement remains available here.</p><button class="go" onclick="closeSheet()">Close</button>`,
  );
}
function pfDone(ref) {
  pfPay();
}
/* ---- Get Babyeyi (school list, fees, term dates) ---- */
let BB = { step: 0, lang: "EN", child: 0 };
function getBabyeyi() {
  BB.step = 0;
  BB.child = K;
  bbStep();
}
function bbStep0() {
  if (BB.child === -1 && BB.step === 1) BB.step = 2;
  const k = BB.child === -1 ? G : KIDS[BB.child];
  const S = ["Language", "Student", "Your Babyeyi"];
  const body = [
    () =>
      `<p class="lead">Your Babyeyi notice will be generated in this language.</p><div class="lang">${[
        ["RW", "Ikinyarwanda"],
        ["EN", "English"],
        ["FR", "Français"],
      ]
        .map(
          ([c, n]) =>
            `<button class="${BB.lang === c ? "on" : ""}" onclick="BB.lang='${c}';bbStep()"><i>${c}</i><b>${n}</b></button>`,
        )
        .join("")}</div>`,
    () =>
      `<p class="lead">Choose your child, or enter a student code (SDMS).</p>${KIDS.map((x, i) => `<div class="pr ${BB.child === i ? "on" : ""}" onclick="BB.child=${i};bbStep()"><span class="pic">${x.first[0]}I</span><div><b>${x.n}</b><small>${x.cls} now · going to ${x.kit.for}</small></div><span class="ck"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span></div>`).join("")}<div class="lbl2">Another learner</div><div class="codein"><input placeholder="e.g. SDM-2026-004821"><button onclick="toast('Camera opens to scan the ShuleCard QR')">${svgI('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>')}Scan QR</button></div>`,
    () => {
      const fees =
        k.type === "Boarder"
          ? [
              ["Tuition", "480,000"],
              ["Boarding", "320,000"],
              ["Exam fees", "40,000"],
              ["ShuleCard and ICT", "20,000"],
              ["Development fund", "100,000"],
            ]
          : [
              ["Tuition", "480,000"],
              ["Transport (optional)", "120,000"],
              ["Lunch programme", "60,000"],
              ["Exam fees", "40,000"],
              ["ShuleCard and ICT", "20,000"],
            ];
      const tot = fees.reduce((a, f) => a + num(f[1]), 0);
      return `<div class="bdoc"><div class="bh"><small>BABYEYI · TERM 1 2027 · ${BB.lang}</small><b>${k.n} · ${k.kit.for}</b><span>Kigali Green Hills School · approved by the school, district and NESA</span></div><div class="bb">
    <h5>Term dates</h5>${tbl(
      ["", ""],
      [
        ["Reporting day", "Sunday 10 January 2027"],
        ["Classes begin", "Monday 11 January 2027"],
        ["Term ends", "Friday 9 April 2027"],
      ],
    )}
    <h5>School fees</h5>${tbl(["Item", "RWF"], [...fees, ["<b>Total</b>", "<b>" + fmt(tot) + "</b>"]])}<p class="qlnote">Pay by ${"7 January 2027"} through your bank or mobile money.</p>
    <h5>School list (requirements)</h5>${k.kit.items.map(([n, q]) => `<div class="kit"><span class="q">${q}</span><div><b>${n}</b></div></div>`).join("")}<div class="kit"><span class="q">1</span><div><b>School shoes (black)</b></div></div><div class="kit"><span class="q">1</span><div><b>Uniform set</b></div></div>
    <div class="src" style="margin-top:12px">${svgI('<path d="M20 6 9 17l-5-5"/>')}QR-verified · Ref. US/BBY/2027/T1</div></div></div>
   ${BB.child === -1 ? "" : `<button class="go" style="background:var(--amber);color:var(--navy)" onclick="KSEL='custom';kitSelect()">Order the school list with ShuleKit</button>`}
   <button class="go" style="margin-top:8px" onclick="closeSheet();toast('Babyeyi PDF downloaded')">Download Babyeyi (PDF)</button>`;
    },
  ];
  openSheet(`<div class="wzh"><small>Get Babyeyi · Step ${BB.step + 1} of 3</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">${["Choose your language", "Student details", "Your Babyeyi"][BB.step]}</h3>
  <div class="wz-prog">${S.map((_, i) => `<i class="${i < BB.step ? "on" : i === BB.step ? "cur" : ""}"></i>`).join("")}</div><div class="steplbl">${S.map((n, i) => `<span class="${i <= BB.step ? "on" : ""}">${n}</span>`).join("")}</div>
  <div style="margin-top:12px">${body[BB.step]()}</div>
  ${BB.step < 2 ? `<div style="display:flex;gap:8px;margin-top:16px">${BB.step ? '<button class="go" style="background:var(--bg);color:var(--navy);flex:1" onclick="BB.step--;bbStep()">Back</button>' : ""}<button class="go" style="flex:2" onclick="BB.step++;bbStep()">Continue</button></div>` : `<button class="go" style="background:var(--bg);color:var(--navy)" onclick="BB.step=${"${BB.child===-1?0:1}"};bbStep()">Back</button>`}`);
}
function topUp_p10() {
  const k = kid();
  payFlow(
    "Top up ShuleCard",
    `${k.first}’s pocket money for the canteen and school shop. Balance ${rwf(k.card)}.`,
    [2000, 5000, 10000, 20000],
    5000,
    ["MTN MoMo", "Airtel Money", "Card"],
    "Top up",
    async (v, method, phone) => {
      if (parentRealApi.getToken()) {
        const result = await parentRealApi.topUpWallet({
          studentId: k.id,
          amount: v,
          phone,
          method,
        });
        if (!result || result.success === false) {
          throw new Error("Wallet top-up was not accepted by the server");
        }
      }
      k.card += v;
      k.cardtx.unshift(["Just now", "Top-up", v]);
      renderAll();
      toast(`${rwf(v)} added to ${k.first}’s ShuleCard`);
    },
    true,
  );
}
function _q0_openCard() {
  const k = kid();
  pushPanel({
    k: "ShuleCard · " + k.code,
    t: k.first + "’s wallet",
    s: "Pocket money for canteen, shop and library",
    b: `${src("ShuleCard and School Canteen")}
 <div class="fac"><small>Available balance</small><div class="big">${rwf(k.card)}</div><div class="row"><span>Last top-up<b>${rwf(k.lastTop[1])} · ${k.lastTop[0]}</b></span><span style="text-align:right">Daily limit<b>RWF 1,500</b></span></div><button class="btn amber" style="width:100%;height:42px;border-radius:13px;margin-top:12px;position:relative;z-index:1" onclick="topUp()">Top up</button></div>
 ${card(
   "Spending this week",
   hls([
     ["Canteen", 72, "RWF 1,650", "amber"],
     ["School shop", 22, "RWF 1,200"],
     ["Library fines", 0, "RWF 0"],
   ]),
 )}
 ${card(
   "Recent transactions",
   tbl(
     ["When", "What", "RWF"],
     k.cardtx.map(([d, t, a]) => [
       d,
       t,
       `<b style="color:${a > 0 ? "var(--green)" : "var(--text)"}">${a > 0 ? "+" : ""}${fmt(a)}</b>`,
     ]),
   ),
 )}
 ${card(
   "Card controls",
   `<div class="chan on" onclick="this.classList.toggle('on');toast(this.classList.contains('on')?'Daily limit on':'Daily limit off')"><span class="ci">${svgI('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>')}</span><div><b>Daily spending limit</b><small>RWF 1,500 a day</small></div><span class="sw"></span></div>
  <div class="chan" onclick="this.classList.toggle('on');toast(this.classList.contains('on')?'Card blocked · ask the bursary for a replacement':'Card unblocked')"><span class="ci" style="background:#FDE7E8">${svgI('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>')}</span><div><b>Block card</b><small>If the card is lost or stolen</small></div><span class="sw"></span></div>`,
 )}`,
  });
}
function kaziAdvance() {
  const tot = KIDS.reduce((a, x) => a + x.fees, 0),
    m = Math.round((tot * 1.045) / 3 / 100) * 100;
  openSheet(`<h3>Spread fees over 3 months</h3><p class="lead">Kazi Advance for Parents pays the school today. You repay in monthly instalments through mobile money.</p>
 <div class="rev" style="margin-top:14px"><div class="rr"><span>Fees paid to school now</span><b>${rwf(tot)}</b></div><div class="rr"><span>Monthly instalment</span><b>${rwf(m)} × 3</b></div><div class="rr"><span>Lender</span><b>Edupoto Finance partner</b></div><div class="rr"><span>Decision</span><b>Usually within 24 hours</b></div></div>
 <p class="qlnote">Your fee payment history in yoShule helps your application. Example terms only.</p><button class="go" onclick="closeSheet();toast('Application sent to Edupoto Finance')">Apply now</button>`);
}

/* ================= SHULEKIT ================= */
function _old_renderKit() {
  const done = KIDS.every((x) => KIT.enrolled[x.id]);
  $("#v-kit").innerHTML =
    hero("ShuleKit") +
    `<div class="wrap">
  <div class="fac" style="margin-top:16px"><small>Term 1 2027 · enrolment closes 15 Nov · 25 days left</small><div class="big">${done ? "All set" : "Get ready for next term"}</div>
   <div class="row" style="margin-top:6px"><span style="font-weight:500;line-height:1.5">Every item on your children’s school list, delivered to school and handed to them on the first day of term.</span></div></div>
  <div class="sec"><h3>Your children’s kits</h3></div>
  ${KIDS.map((x, i) => {
    const e = KIT.enrolled[x.id];
    return `<div class="card cprof" onclick="kitDetail(${i})"><div class="h"><span class="cid in" style="width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-weight:800;font-size:12px;flex-shrink:0">${ini(x.first, x.n)}</span><div class="m"><b>${x.first} · kit for ${x.kit.for}</b><small class="s">${x.kit.items.length + 2} items incl. shoes (size ${x.kit.shoe}) and uniform (${x.kit.uni})</small></div><div class="att"><b>${rwf(kitTotal(x))}</b></div></div><div class="tags">${e ? `<span class="chip green">Enrolled · ${e}</span>` : '<span class="chip amber">Not enrolled yet</span>'}</div></div>`;
  }).join("")}
  ${done ? "" : `<button class="bigbtn amber" onclick="kitSelect()">Request ShuleKit for Term 1 2027</button>`}
  <div class="sec"><h3>How ShuleKit works</h3></div>
  <div class="card"><div class="vstep">${[
    [
      "ok",
      "The school publishes each class list",
      "Approved in the Babyeyi circular",
    ],
    [
      done ? "ok" : "cur",
      "You enrol and choose how to pay",
      "Pay in full, save weekly, or use ShuleKit Credit",
    ],
    ["", "One school order is placed", "After 15 Nov"],
    ["", "Kits are delivered to school", "8 January 2027"],
    [
      "",
      "Your child receives the kit",
      "First week of term · confirmed with ShuleCard",
    ],
  ]
    .map(
      ([s, t, d]) => `<div class="${s}"><b>${t}</b><small>${d}</small></div>`,
    )
    .join("")}</div></div>
  <div class="sec"><h3>Last term’s kits</h3></div>
  <div class="card">${tbl(
    ["Child", "Kit", "Status"],
    KIDS.map((x) => [
      x.first,
      x.cls + " · 2026",
      '<span class="chip green">Active kit</span>',
    ]),
  )}</div>
 </div>`;
}
function _old_kitDetail(i) {
  const x = KIDS[i];
  pushPanel({
    k: "ShuleKit · Term 1 2027",
    t: x.first + "’s kit",
    s: "School list for " + x.kit.for,
    b: `${src("ShuleKit · class requirement list from the school")}
 ${card("Items", x.kit.items.map(([n, q, p]) => `<div class="kit"><span class="q">${q}</span><div><b>${n}</b><small>${p ? rwf(p) + " each" : "Included free with the kit"}</small></div><span class="p">${p ? fmt(q * p) : "Free"}</span></div>`).join("") + `<div class="kit"><span class="q">1</span><div><b>School shoes · size ${x.kit.shoe}</b><small>School Shoe voucher</small></div><span class="p">12,000</span></div><div class="kit"><span class="q">1</span><div><b>Uniform set · size ${x.kit.uni}</b><small>Uniform voucher</small></div><span class="p">9,800</span></div>`, "RWF")}
 ${card("Total", `<b style="font-size:20px">${rwf(kitTotal(x))}</b><p class="qlnote">Mentor products: durable and made for African learners. Delivered to school, no queues in town.</p>`)}
 ${KIT.enrolled[x.id] ? "" : `<button class="bigbtn amber" onclick="popPanel();kitSelect()">Enrol ${x.first}</button>`}`,
  });
}
let KW = {
  kids: ["keza", "ganza"],
  shoe: { keza: "38", ganza: "35" } as Record<string, string>,
  uni: { keza: "M", ganza: "S" } as Record<string, string>,
  plan: "save",
  items: {} as Record<string, string[]>,
};
const kitLines = (x: any) => {
  if (!x || !x.kit) return [];
  const items = Array.isArray(x.kit.items) ? x.kit.items : [];
  return [
    ...items.map(([n, q, p]: any, i: number) => {
      const qty = Number(String(q || 1).replace(/,/g, "")) || 1;
      const priceEach = Number(String(p || 0).replace(/,/g, "")) || 0;
      return {
        id: "i" + i,
        n,
        q: qty,
        p: priceEach,
        price: qty * priceEach,
      };
    }),
    { id: "shoe", n: "School shoes", q: 1, p: 12000, price: 12000 },
    { id: "uni", n: "Uniform set", q: 1, p: 9800, price: 9800 },
  ];
};
const kitLineIds = (x: any): string[] => kitLines(x).map((l: any) => l.id);

function kitSel(x: any): string[] {
  if (!x) return [];
  if (!KW.items[x.id]) {
    KW.items[x.id] = kitLineIds(x);
  }
  return KW.items[x.id];
}
function kitSelTotal(x: any): number {
  if (!x) return 0;
  const sel = kitSel(x);
  return kitLines(x).reduce((a: number, l: any) => (sel.includes(l.id) ? a + l.price : a), 0);
}
function kitToggle(childOrId: any, itemId: string) {
  const child = typeof childOrId === "string" ? KIDS.find((y) => y.id === childOrId) : childOrId;
  if (!child) return;
  const sel = kitSel(child);
  const at = sel.indexOf(itemId);
  if (at >= 0) {
    sel.splice(at, 1);
  } else {
    sel.push(itemId);
  }
  kitStep();
}
function kitSelectAll(childOrId: any, selectAll: boolean) {
  const child = typeof childOrId === "string" ? KIDS.find((y) => y.id === childOrId) : childOrId;
  if (!child) return;
  KW.items[child.id] = selectAll ? kitLineIds(child) : [];
  kitStep();
}
function kitToggleKid(childId: string) {
  const at = KW.kids.indexOf(childId);
  if (at >= 0) {
    KW.kids.splice(at, 1);
  } else {
    KW.kids.push(childId);
    const child = KIDS.find((y) => y.id === childId);
    if (child && !KW.items[childId]) {
      KW.items[childId] = kitLineIds(child);
      KW.shoe[childId] ||= child.kit?.shoe || "38";
      KW.uni[childId] ||= child.kit?.uni || "M";
    }
  }
  kitStep();
}
function kitSum(): number {
  return KIDS.filter((x) => KW.kids.includes(x.id)).reduce(
    (a, x) => a + kitSelTotal(x),
    0,
  );
}

// Bind ShuleKit helpers directly to window so inline onclick handlers succeed in all environments
(window as any).kitLines = kitLines;
(window as any).kitLineIds = kitLineIds;
(window as any).kitSel = kitSel;
(window as any).kitSelTotal = kitSelTotal;
(window as any).kitToggle = kitToggle;
(window as any).kitSelectAll = kitSelectAll;
(window as any).kitToggleKid = kitToggleKid;
(window as any).kitSum = kitSum;

let KSEL = "custom";
function kitSelect() {
  openSheet(`<div class="wzh"><small>ShuleKit</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">ShuleKit selection</h3>
 <div class="kitsel"><div style="display:flex;justify-content:center;align-items:center"><img src="/kitImage.png" alt="ShuleKit" style="width:200px;height:auto;border-radius:12px;margin-top:8px;display:block" /></div>
  <button class="kopt std ${KSEL === "standard" ? "on" : ""}" aria-pressed="${KSEL === "standard"}" onclick="selectKitType('standard')"><span class="ic">${svgI('<path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>')}</span><div><b>Standard ShuleKit</b><small>Kits by grade level (P1, S1, etc.)</small></div><span>›</span></button>
  <button class="kopt cus ${KSEL === "custom" ? "on" : ""}" aria-pressed="${KSEL === "custom"}" onclick="selectKitType('custom')"><span class="ic">${svgI('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>')}</span><div><b>Custom ShuleKit</b><small>Your school’s own list · Umucyo SS</small></div><span>›</span></button>
 </div></div>
 <button class="go" onclick="startKit()">Request ${KSEL === "standard" ? "Standard" : "Custom"} ShuleKit</button>`);
}
function selectKitType(type) {
  KSEL = type;
  const sheet = $("#sheet");
  sheet.querySelectorAll(".kopt").forEach((button) => {
    const selected = button.classList.contains(
      type === "standard" ? "std" : "cus",
    );
    button.classList.toggle("on", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const requestButton = sheet.querySelector(".go");
  if (requestButton)
    requestButton.textContent = `Request ${type === "standard" ? "Standard" : "Custom"} ShuleKit`;
}
function startKit() {
  KIT.step = 0;
  KW.kids = myKids().map((i) => KIDS[i].id);
  if (!KW.kids.length) KW.kids = [kid().id];
  KW.items = {};
  for (const child of KIDS.filter((item) => KW.kids.includes(item.id))) {
    KW.shoe[child.id] ||= child.kit?.shoe || "38";
    KW.uni[child.id] ||= child.kit?.uni || "M";
    KW.items[child.id] = kitLineIds(child);
  }
  kitStep();
}
function kitStep() {
  const S = [
    [
      "Choose children",
      () =>
        `<div class="lbl2">Who needs a kit?</div>${KIDS.map((x) => `<div class="pr ${KW.kids.includes(x.id) ? "on" : ""}" onclick="kitToggleKid('${x.id}')"><span class="pic">${x.first[0]}I</span><div><b>${x.first} · going to ${x.kit?.for || "School"}</b><small>${rwf(kitTotal(x))}</small></div><span class="ck"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span></div>`).join("")}`,
    ],
    [
      "Sizes",
      () =>
        KIDS.filter((x) => KW.kids.includes(x.id))
          .map((x) => {
            const sel = kitSel(x);
            const shoe = sel.includes("shoe")
              ? `<div class="lbl2">${x.first}’s shoe size</div><div class="chips">${["34", "35", "36", "37", "38", "39", "40"].map((s) => `<button class="${KW.shoe[x.id] === s ? "on" : ""}" onclick="KW.shoe['${x.id}']='${s}';kitStep()">${s}</button>`).join("")}</div>`
              : "";
            const uni = sel.includes("uni")
              ? `<div class="lbl2">${x.first}’s uniform size</div><div class="chips">${["XS", "S", "M", "L", "XL"].map((s) => `<button class="${KW.uni[x.id] === s ? "on" : ""}" onclick="KW.uni['${x.id}']='${s}';kitStep()">${s}</button>`).join("")}</div>`
              : "";
            return `<div class="lbl2" style="margin-top:10px">${x.first} · ${x.kit.for}</div>${shoe}${uni}`;
          })
          .join("")],
    [
      "Choose items",
      () =>
        KIDS.filter((x) => KW.kids.includes(x.id))
          .map((x) => {
            const sel = kitSel(x);
            return `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;margin-bottom:6px">
              <div class="lbl2" style="margin:0">${x.first} · ${x.kit?.for || "Kit"}</div>
              <div style="font-size:11px">
                <button type="button" onclick="kitSelectAll('${x.id}',true)" style="background:none;border:none;color:var(--navy);font-weight:700;cursor:pointer;padding:0 4px">Select all</button>
                <span style="color:var(--muted)">·</span>
                <button type="button" onclick="kitSelectAll('${x.id}',false)" style="background:none;border:none;color:var(--muted);font-weight:600;cursor:pointer;padding:0 4px">Deselect all</button>
              </div>
            </div>
            ${kitLines(x)
              .map((l: any) => {
                const isSelected = sel.includes(l.id);
                const size =
                  l.id === "shoe" && KW.shoe[x.id]
                    ? ` · size ${KW.shoe[x.id]}`
                    : l.id === "uni" && KW.uni[x.id]
                      ? ` · size ${KW.uni[x.id]}`
                      : "";
                return `<div class="feeitem ${isSelected ? "on" : ""}" onclick="kitToggle('${x.id}','${l.id}')" style="cursor:pointer;${isSelected ? "" : "opacity:0.65"}"><input type="checkbox" ${isSelected ? "checked" : ""} onclick="event.stopPropagation()" onchange="kitToggle('${x.id}','${l.id}')" aria-label="${l.n}" style="width:18px;height:18px;accent-color:var(--navy);margin:0;flex-shrink:0;cursor:pointer"><div><b>${l.n}${size}</b><small>${l.p ? rwf(l.p) + (l.q > 1 ? " each · " + l.q + " pcs" : " each") : "Included free"}</small></div><b>${l.p ? (isSelected ? fmt(l.price) : `<span style="text-decoration:line-through;color:var(--muted)">${fmt(l.price)}</span>`) : "Free"}</b></div>`;
              })
              .join("")}`;
          })
          .join("") +
        `<div class="rev" style="margin-top:10px"><div class="rr"><span>Selected total</span><b>${rwf(kitSum())}</b></div></div>`,
    ],
    [
      "How to pay",
      () => {
        const t = kitSum();
        return `<div class="lbl2">Total for ${KW.kids.length} kit${KW.kids.length > 1 ? "s" : ""} · ${rwf(t)}</div>${[
          ["full", "Pay in full now", `${rwf(t)} by mobile money`],
          [
            "save",
            "Save weekly until 15 Dec",
            `${rwf(Math.ceil(t / 8 / 100) * 100)} a week for 8 weeks`,
          ],
          [
            "credit",
            "ShuleKit Credit",
            `Kit now, repay ${rwf(Math.ceil((t * 1.04) / 3 / 100) * 100)} a month for 3 months`,
          ],
        ]
          .map(
            ([k, n, d]) =>
              `<div class="chan ${KW.plan === k ? "on" : ""}" onclick="KW.plan='${k}';kitStep()"><span class="ci">${svgI(k === "full" ? '<path d="M20 6 9 17l-5-5"/>' : k === "save" ? '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/>' : '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>')}</span><div><b>${n}</b><small>${d}</small></div><span class="radio" style="border:${KW.plan === k ? "6px solid var(--navy)" : "2px solid var(--line)"};width:20px;height:20px;border-radius:50%;flex-shrink:0"></span></div>`,
          )
          .join(
            "",
          )}${KW.plan === "credit" ? '<p class="qlnote">Credit is provided by Edupoto Finance’s lending partners and needs a quick approval. Example terms only.</p>' : ""}`;
      },
    ],
    [
      "Confirm",
      () => {
        const t = kitSum();
        const plan = {
          full: "Pay in full",
          save: "Save weekly",
          credit: "ShuleKit Credit",
        }[KW.plan];
        return `<div class="rev">${KIDS.filter((x) => KW.kids.includes(x.id))
          .map(
            (x) =>
              `<div class="rr"><span>${x.first} · ${x.kit.for}</span><b>${kitSel(x).length} of ${kitLines(x).length} items${kitSel(x).includes("shoe") ? " · shoes " + KW.shoe[x.id] : ""}${kitSel(x).includes("uni") ? " · uniform " + KW.uni[x.id] : ""}</b></div>`,
          )
          .join(
            "",
          )}<div class="rr"><span>Total</span><b>${rwf(t)}</b></div><div class="rr"><span>Plan</span><b>${plan}</b></div><div class="rr"><span>Delivery</span><b>To school · 8 Jan 2027</b></div></div>`;
      },
    ],
  ];
  const [t, b] = S[KIT.step];
  const kitType = KSEL === "standard" ? "Standard ShuleKit" : "Custom ShuleKit";
  const last = KIT.step === S.length - 1;
  const picked = KIDS.filter((child) => KW.kids.includes(child.id));
  const sizesComplete =
    KIT.step !== 1 ||
    picked.every(
      (child) =>
        (!kitSel(child).includes("shoe") || KW.shoe[child.id]) &&
        (!kitSel(child).includes("uni") || KW.uni[child.id]),
    );
  const itemsComplete =
    KIT.step !== 2 || picked.every((child) => kitSel(child).length > 0);
  const canContinue = KW.kids.length > 0 && sizesComplete && itemsComplete;
  openSheet(`<div class="wz-top"><small style="font-size:10.5px;font-weight:700;color:var(--amber);letter-spacing:.6px">${kitType.toUpperCase()} · STEP ${KIT.step + 1} OF ${S.length}</small><button onclick="closeSheet()" style="width:30px;height:30px;border-radius:10px;background:var(--bg)">✕</button></div><h3 style="margin-top:4px">${t}</h3><div class="wz-prog">${S.map((_, i) => `<i class="${i < KIT.step ? "on" : i === KIT.step ? "cur" : ""}"></i>`).join("")}</div><div style="margin-top:12px">${b()}</div>
  <div style="display:flex;gap:8px;margin-top:16px">${KIT.step ? '<button class="go" style="background:var(--bg);color:var(--navy);flex:1" onclick="KIT.step--;kitStep()">Back</button>' : ""}<button class="go" style="flex:2;${canContinue ? "" : "opacity:.35"}" ${canContinue ? "" : "disabled"} onclick="${canContinue ? (last ? (KW.plan === "full" ? "kitPay()" : "kitDone()") : "KIT.step++;kitStep()") : ""}">${last ? (KW.plan === "full" ? "Pay and send request" : KW.plan === "save" ? "Send request and start saving" : "Send request and apply") : "Next"}</button></div>`);
}
function _old_kitDone() {
  const lbl = { full: "paid", save: "saving weekly", credit: "credit pending" }[
    KW.plan
  ];
  KW.kids.forEach((id) => (KIT.enrolled[id] = lbl));
  closeSheet();
  renderAll();
  toast(
    KW.plan === "credit"
      ? "Application sent · you will get an SMS with the decision"
      : "Enrolled · first payment request sent to your phone",
  );
}

/* ================= CHAT ================= */
const TEACHERS = (k) => [
  [
    k.ct,
    "Class teacher · " + subjName(k, 1),
    "Thank you, I will check her essay plan tomorrow.",
    "09:12",
    1,
  ],
  ...k.subj
    .slice(0, 6)
    .filter((s) => s[2] !== k.ct)
    .map((s, i) => [
      s[2],
      s[0],
      i === 0 ? "Test on 28 Oct, please encourage revision." : "",
      i === 0 ? "Yesterday" : "",
      i === 0 ? 1 : 0,
    ]),
];
function renderChat() {
  const k = kid();
  $("#v-chat").innerHTML =
    hero("Messages") +
    `<div class="wrap">
  <div class="sec" style="margin-top:18px"><h3>${k.first}’s teachers</h3></div>
  <div class="card chatlist">${TEACHERS(k)
    .map(
      ([n, r, m, t, u]) =>
        `<div class="lr" onclick="openChat('${n}')"><span class="pic">${n
          .replace("Dr. ", "")
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(
            0,
            2,
          )}</span><div><b>${n}</b><small>${m || r}</small></div>${u ? '<span class="chip amber">New</span>' : t ? `<small style="font-size:10px;color:var(--muted)">${t}</small>` : ""}</div>`,
    )
    .join("")}</div>
  <div class="sec"><h3>School circulars</h3></div>
  <div class="card">${[
    [
      "Sports Day invitation",
      "Saturday 7 Nov · confirm by 30 Oct",
      "amber",
      "Confirm",
    ],
    ["Term 3 Babyeyi", "Fees and requirements · verified", "green", "Read"],
    ["Mid-term break", "No break this term · classes continue", "navy", "Read"],
  ]
    .map(
      ([t, s, c, a]) =>
        `<div class="lr" onclick="openCircular()"><span class="pic" style="background:var(--amber-soft);color:#9A5B00">${svgI('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>').replace("<svg", '<svg width="15" height="15" fill="none" stroke="#9A5B00" stroke-width="2"')}</span><div><b>${t}</b><small>${s}</small></div><span class="chip ${c}">${a}</span></div>`,
    )
    .join("")}</div>
  <div class="sec"><h3>Upcoming events</h3></div>
  <div class="card">${[
    ["28", "OCT", "S3 parents’ meeting", "14:00 · Main hall"],
    ["7", "NOV", "Sports Day", "09:00 · Sports field"],
    ["4", "DEC", "End of term", "Pick-up from 12:00"],
  ]
    .map(
      ([d, m, t, s]) =>
        `<div class="hw"><div class="d"><b>${d}</b><small>${m}</small></div><div class="m"><b>${t}</b><small>${s}</small></div><button class="chip navy" onclick="toast('Added to your calendar')">Add</button></div>`,
    )
    .join("")}</div>
 </div>`;
}
function openChat(name) {
  const k = kid();
  const el = pushPanel({
    k: "ShuleChat",
    t: name,
    s: "Teacher of " + k.first + " · replies within school hours",
    b: `
 <div class="bub in">Good morning Mrs. Uwimana. ${k.first} did very well in today’s ${subjName(k, 1)} lesson.<small>09:02</small></div>
 <div class="bub out">Thank you! She mentioned the essay plan, could you check it?<small>09:10</small></div>
 <div class="bub in">Thank you, I will check her essay plan tomorrow.<small>09:12</small></div>
 <div class="composer"><input id="cmsg" placeholder="Write a message…" onkeydown="if(event.key==='Enter'){event.preventDefault();sendMsg()}"><button onclick="sendMsg()">${svgI('<path d="m22 2-7 20-4-9-9-4z"/>')}</button></div>
 `,
  });
}
function sendMsg() {
  const i = $("#cmsg");
  if (!i.value.trim()) return;
  const b = document.createElement("div");
  b.className = "bub out";
  b.append(document.createTextNode(i.value));
  const timestamp = document.createElement("small");
  timestamp.textContent = "Just now";
  b.append(timestamp);
  i.parentNode.before(b);
  i.value = "";
  toast("Message sent");
}
function openCircular() {
  openSheet(`<h3>Sports Day invitation</h3><p class="lead">Kigali Green Hills School · 19 October · Ref. US/CIR/2026/041</p>
 <p style="font-size:12px;line-height:1.7;margin-top:12px">Dear parents, you are warmly invited to our annual Sports Day on Saturday 7 November from 09:00 at the school sports field. ${KIDS.map((k) => k.first).join(" and ")} will take part in athletics and team games. Lunch will be served.</p>
 <div class="src" style="margin-top:12px">${svgI('<path d="M20 6 9 17l-5-5"/>')}Verified by QR · signed by the school director</div>
 <div class="lbl2" style="margin-top:14px">Will you attend?</div><div class="chips"><button class="on" onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">Yes, 2 people</button><button onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">Yes, 1 person</button><button onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">No</button></div>
 <button class="go" onclick="closeSheet();toast('Thank you, the school has your reply')">Send reply</button>`);
}

/* ================= MORE (profile, health, discipline, leave, documents) ================= */
let DOC_TAB = "list";
let DOCS = [
  {
    id: "doc-1",
    name: "report.pdf",
    size: 1048576,
    uploadedAt: "2026-11-11T05:29:00",
    url: "",
  },
];
const docFmtSize = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / Math.pow(1024, i);
  return `${v >= 10 || i === 0 ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(1)} ${units[i]}`;
};
const docFmtDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
function renderDocumentsBody() {
  const listTab = DOC_TAB === "list";
  const tabs = `
    <div style="background:#F4F6FA;border:1px solid #E5E8EF;border-radius:16px;padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px">
      <button onclick="DOC_TAB='list';openDocuments()" style="border:none;border-radius:12px;padding:10px 12px;font:600 13px/1.2 Montserrat,system-ui;background:${listTab ? "#fff" : "transparent"};color:${listTab ? "#13213D" : "#6B7385"};box-shadow:${listTab ? "0 1px 2px rgba(19,33,61,.06)" : "none"};cursor:pointer">Document list</button>
      <button onclick="DOC_TAB='upload';openDocuments()" style="border:none;border-radius:12px;padding:10px 12px;font:600 13px/1.2 Montserrat,system-ui;background:${!listTab ? "#fff" : "transparent"};color:${!listTab ? "#13213D" : "#6B7385"};box-shadow:${!listTab ? "0 1px 2px rgba(19,33,61,.06)" : "none"};cursor:pointer">Upload a Document</button>
    </div>`;
  const upload = `
    <div style="background:#fff;border:1px solid #E5E8EF;border-radius:24px;padding:18px;box-shadow:0 8px 24px rgba(19,33,61,.04)">
      <div style="margin-bottom:14px">
        <h3 style="margin:0;font:800 20px/1.2 Montserrat,system-ui;color:#13213D">Upload a New Document</h3>
        <p style="margin:6px 0 0;font:500 13px/1.5 Montserrat,system-ui;color:#6B7385">Add files for this student. Supported files can be selected or dropped below.</p>
      </div>
      <div onclick="document.getElementById('doc-file-input').click()" ondragover="event.preventDefault();this.style.borderColor='#F5A623';this.style.background='linear-gradient(180deg,#FFF9EF,#F7F4FF)'" ondragleave="this.style.borderColor='#D7DCEA';this.style.background='linear-gradient(180deg,#F8FAFF,#F4F1FF)'" ondrop="event.preventDefault();this.style.borderColor='#D7DCEA';this.style.background='linear-gradient(180deg,#F8FAFF,#F4F1FF)';handleDocFiles(event.dataTransfer.files)" style="border:2px dashed #D7DCEA;border-radius:22px;padding:34px 18px;text-align:center;background:linear-gradient(180deg,#F8FAFF,#F4F1FF);cursor:pointer;transition:.2s">
        <div style="width:56px;height:56px;border-radius:16px;margin:0 auto 12px;display:grid;place-items:center;background:#13213D;color:#F5A623;box-shadow:0 8px 18px rgba(19,33,61,.18)">${svgI('<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5"/>')}</div>
        <div style="font:700 15px/1.3 Montserrat,system-ui;color:#13213D">Click to select files to upload</div>
        <div style="margin-top:6px;font:500 12px/1.4 Montserrat,system-ui;color:#6B7385">or drag and drop files here</div>
        <div style="margin-top:14px;display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #E5E8EF;border-radius:12px;padding:9px 13px;font:700 12px Montserrat,system-ui;color:#13213D">Choose files</div>
      </div>
      <input id="doc-file-input" type="file" multiple style="display:none" onchange="handleDocFiles(this.files);this.value=''" />
      <div style="margin-top:14px;background:#F7FAFF;border:1px solid #DCE8FF;border-radius:16px;padding:12px 14px;font:500 12px/1.5 Montserrat,system-ui;color:#4A5B7C">Tip: Use clear names like <b>Term Report - November.pdf</b> so documents are easy to find later.</div>
    </div>`;
  const rows = DOCS.map(
    (d) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border:1px solid #E5E8EF;border-radius:18px;background:#FCFCFD;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">
          <div style="width:42px;height:42px;border-radius:12px;background:#13213D;color:#F5A623;display:grid;place-items:center;flex-shrink:0">${svgI(IC.doc)}</div>
          <div style="min-width:0">
            <div style="font:700 14px/1.3 Montserrat,system-ui;color:#13213D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.name}</div>
            <div style="margin-top:4px;font:500 12px/1.3 Montserrat,system-ui;color:#6B7385">${docFmtSize(d.size)} &nbsp;•&nbsp; ${docFmtDate(d.uploadedAt)}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button onclick="downloadDocItem('${d.id}')" style="border:1px solid #DCE3EF;background:#fff;color:#13213D;border-radius:12px;padding:8px 12px;font:700 12px Montserrat,system-ui;cursor:pointer">Download</button>
          <button onclick="deleteDocItem('${d.id}')" style="border:1px solid #F3D4D7;background:#FFF7F7;color:#B42318;border-radius:12px;padding:8px 12px;font:700 12px Montserrat,system-ui;cursor:pointer">Delete</button>
        </div>
      </div>`
  ).join("");
  const list = `
    <div style="background:#fff;border:1px solid #E5E8EF;border-radius:24px;padding:18px;box-shadow:0 8px 24px rgba(19,33,61,.04)">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div>
          <h3 style="margin:0;font:800 20px/1.2 Montserrat,system-ui;color:#13213D">Uploaded Documents</h3>
          <p style="margin:6px 0 0;font:500 12px/1.4 Montserrat,system-ui;color:#6B7385">${DOCS.length} ${DOCS.length === 1 ? "file" : "files"} available</p>
        </div>
        <button onclick="DOC_TAB='upload';openDocuments()" style="border:none;background:#13213D;color:#fff;border-radius:12px;padding:9px 12px;font:700 12px Montserrat,system-ui;cursor:pointer">Upload</button>
      </div>
      ${DOCS.length ? rows : `<div style="border:1px dashed #D7DCEA;border-radius:18px;padding:28px 16px;text-align:center;background:#F9FAFC"><div style="font:700 14px Montserrat,system-ui;color:#13213D">No documents yet</div><div style="margin-top:6px;font:500 12px Montserrat,system-ui;color:#6B7385">Upload a document to see it here.</div></div>`}
    </div>`;
  return `${tabs}${listTab ? list : upload}`;
}
function openDocuments() {
  const b = `<div style="padding-bottom:8px">
    <div style="margin-bottom:14px">
      <div style="font:700 11px/1 Montserrat,system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8A95AD">Student files</div>
      <h2 style="margin:6px 0 0;font:800 24px/1.15 Montserrat,system-ui;color:#13213D">Documents</h2>
      <p style="margin:6px 0 0;font:500 13px/1.5 Montserrat,system-ui;color:#6B7385">Manage and upload important documents in a clean, organized space.</p>
    </div>
    ${renderDocumentsBody()}
  </div>`;
  if (PST.length && PST[PST.length - 1].o && PST[PST.length - 1].o.t === "Documents") {
    repaint(PST[PST.length - 1].el, b);
  } else {
    pushPanel({ k: "Student files", t: "Documents", s: kid().n + " · " + kid().cls, b });
  }
}
function handleDocFiles(files) {
  if (!files || !files.length) return;
  const arr = Array.from(files);
  const now = new Date().toISOString();
  arr.forEach((f, i) => {
    DOCS.unshift({
      id: "doc-" + Date.now() + "-" + i + "-" + Math.random().toString(36).slice(2, 6),
      name: f.name,
      size: f.size || 0,
      uploadedAt: now,
      url: f && typeof URL !== "undefined" ? URL.createObjectURL(f) : "",
    });
  });
  DOC_TAB = "list";
  toast(arr.length === 1 ? "Document uploaded" : arr.length + " documents uploaded");
  openDocuments();
}
function deleteDocItem(id) {
  DOCS = DOCS.filter((d) => d.id !== id);
  toast("Document removed");
  openDocuments();
}
function downloadDocItem(id) {
  const d = DOCS.find((x) => x.id === id);
  if (!d) return;
  if (d.url) {
    const a = document.createElement("a");
    a.href = d.url;
    a.download = d.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    toast("Download started");
  }
}

function openMore_p9() {
  const k = kid();
  pushPanel({
    k: PARENT.ph,
    t: PARENT.n,
    s: "Parent of " + KIDS.map((x) => x.first).join(", "),
    b: `<div class="sec" style="margin-top:4px"><h3>My children</h3><a onclick="linkChild()">Link a child</a></div><div class="card">${KIDS.map((x, i) => `<div class="lr" style="cursor:pointer" onclick="K=${i};renderAll();openProfile()"><span class="pic" style="background:var(--amber-soft);color:#9A5B00">${x.first[0]}I</span><div><b>${x.n} · ${x.cls}</b><small>SDMS ${x.sdms} · ShuleCard ${x.cardno}</small></div><span class="chip green">Linked</span></div>`).join("")}</div><div class="sec"><h3>Account</h3></div><div class="card menu">${[
      [
        "Student profile",
        "Personal, emergency contacts, transport, dorm",
        '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        "openProfile()",
      ],
      [
        "Documents",
        "Upload and manage student documents",
        IC.doc,
        "openDocuments()",
      ],
      [
        "Health records",
        "School clinic visits and check-ups",
        '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
        "openHealth()",
      ],
      [
        "Discipline and conduct",
        "Merits, demerits and conduct score",
        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        "openDiscipline()",
      ],
      [
        "Leave and permission",
        "Request leave, see permission passes",
        '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        "openLeave()",
      ],
      [
        "My orders",
        "Uniform and shoe orders, delivery and instalments",
        '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
        "openOrders()",
      ],
      [
        "My goals",
        "Savings for ShuleKit, trips and more",
        '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        "openGoals()",
      ],
      [
        "School trips",
        "Consent, payment and trip savings",
        '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 11h16M9 4v7M15 4v7M7.5 18v2M16.5 18v2"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
        "openTrips()",
      ],
      [
        "Start page",
        "Quick fees, Babyeyi, ShuleKit and top-ups",
        '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        "showLanding()",
      ],
      [
        "Tools and services",
        "ShuleKit, fees, uniforms, shoes and goals",
        '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        "openServices()",
      ],
      [
        "Notification settings",
        "Fee reminders, receipts, attendance alerts",
        '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>',
        "openNotifSettings()",
      ],
    ]
      .map(
        ([t, s, ic, f]) =>
          `<div class="lr" onclick="${f}"><span class="pic">${svgI(ic)}</span><div><b>${t}</b><small>${s}</small></div><span style="color:var(--muted)">›</span></div>`,
      )
      .join("")}</div>
 <button class="bigbtn ghost" onclick="logout()">Sign out</button>`,
  });
}
function _old_addChild() {
  openSheet(
    `<h3>Add a child</h3><p class="lead">Enter the SDMS code or ShuleCard number. The school confirms the link with the phone number on the child’s profile.</p><div class="sdmsin" style="margin-top:12px"><span class="ic">${svgI('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}</span><input placeholder="SDMS code / ShuleCard no."><button class="go2" onclick="closeSheet();toast('Link request sent to the school')">${svgI('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button></div><button class="go" style="margin-top:14px;background:var(--bg);color:var(--navy)" onclick="toast('Camera opens to scan the ShuleCard QR')">Scan ShuleCard QR instead</button>`,
  );
}
function _x_openProfile() {
  const k = kid();
  pushPanel({
    k: "Student · " + k.code,
    t: k.n,
    s: k.cls + " · " + k.type,
    b: `${src("Student Management")}
 ${card(
   "Personal details",
   tbl(
     ["", ""],
     [
       ["Full name", k.n],
       ["SDMS code", k.sdms],
       ["ShuleCard number", k.cardno],
       ["School code", k.code],
       ["Class", k.cls + " · " + k.lvl],
       ["Class teacher", k.ct],
       ["Student type", k.type],
     ],
   ),
 )}
 ${card(
   "Parents and emergency",
   tbl(
     ["", ""],
     [
       [
         k.role || "Primary Guardian",
         PARENT.n + " · " + (PARENT.ph || MYPHONE),
       ],
       ["Emergency contact", "School Administration · +250 788 123 456"],
     ],
   ),
 )}
 ${
   k.bus
     ? card(
         "Transport",
         tbl(
           ["", ""],
           [
             ["Mode", "School bus"],
             ["Bus", `Bus ${k.bus.n} · ${k.bus.route}`],
             ["Pick-up", k.bus.pick],
             [
               "Driver",
               k.bus.drv +
                 " · " +
                 k.bus.ph.replace(
                   /(\+250)(\d{3})(\d{3})(\d{3})/,
                   "$1 $2 $3 $4",
                 ),
             ],
           ],
         ),
       )
     : card(
         "Boarding",
         tbl(
           ["", ""],
           [
             ["Dormitory", k.dorm],
             ["Patron", k.patron + " · +250 788 610 106"],
           ],
         ),
       )
 }
 <p class="qlnote">To correct details, contact the school office. Changes are made by the school.</p>`,
  });
}
function openHealth() {
  const k = kid();
  pushPanel({
    k: k.n,
    t: "Health records",
    s: "From the school clinic",
    b: `${src("School clinic")}<div class="card">${k.health.map(([d, t, s, c]) => ev(c, `<b>${d} · ${t}</b><br><small style="color:var(--muted)">${s}</small>`)).join("")}</div><p class="qlnote">You are notified by SMS whenever ${k.first} visits the sick bay.</p>`,
  });
}
function openDiscipline() {
  const k = kid();
  pushPanel({
    k: k.n,
    t: "Discipline and conduct",
    s: "This term",
    b: `${src("Student Discipline")}${dk([
      [k.conduct + " / 100", "Conduct score", "Good standing"],
      [String(k.disc.filter((d) => d[1] === "Merit").length), "Merits", ""],
      [
        String(k.disc.filter((d) => d[1] !== "Merit").length),
        "Demerits",
        "",
        "amber",
      ],
      ["0", "Open cases", ""],
    ])}<div class="card dcard">${k.disc.map(([d, t, s, c]) => ev(c, `<b>${t} · ${d}</b><br><small style="color:var(--muted)">${s}</small>`)).join("")}</div>`,
  });
}
function openLeave() {
  const k = kid();
  const panel = pushPanel({
    k: k.n,
    t: "Leave and permission",
    s: "Requests and passes",
    b: "",
  });
  void loadLeavePanel(panel, k.id);
}
function leaveDateLabel(value, time) {
  if (!value) return "—";
  const date = new Date(value);
  const label = Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${escapeLinkValue(label)}${time ? ` ${escapeLinkValue(time)}` : ""}`;
}
function leaveStatusBadge(status) {
  const label = String(status || "Pending").replace(/_/g, " ");
  const normalized = label.toUpperCase();
  const tone = ["APPROVED", "RETURNED", "COMPLETED"].includes(normalized)
    ? "green"
    : ["REJECTED", "CANCELLED", "OVERDUE"].includes(normalized)
      ? "red"
      : "amber";
  return `<span class="chip ${tone}">${escapeLinkValue(label)}</span>`;
}
function leavePanelMarkup(requests, permissions, loading = false, requestError = "", permissionError = "") {
  const today = new Date().toISOString().slice(0, 10);
  const requestRows = requests.map((request) => [
    leaveDateLabel(request.date),
    `${escapeLinkValue(request.type || "Leave")}${request.reason ? `<small style="display:block;color:var(--muted);font-size:9px;margin-top:3px">${escapeLinkValue(request.reason)}</small>` : ""}`,
    leaveStatusBadge(request.status),
  ]);
  const permissionRows = permissions.map((permission) => {
    const departure = leaveDateLabel(permission.departureAt, permission.departureTime);
    const returnAt = permission.actualReturnAt || permission.expectedReturnAt;
    const returnTime = permission.actualReturnAt
      ? leaveDateLabel(returnAt, permission.actualReturnTime)
      : leaveStatusBadge(permission.status);
    return [departure, escapeLinkValue(permission.reason || permission.destination || permission.type || "Permission"), returnTime];
  });
  const requestsContent = loading
    ? '<p class="qlnote">Loading leave requests…</p>'
    : requestError
      ? `<p class="leave-section-error">${escapeLinkValue(requestError)}</p><button type="button" class="leave-retry">Retry</button>`
      : requestRows.length
      ? tbl(["Date", "Type", "Status"], requestRows)
      : '<p class="qlnote">No leave requests found.</p>';
  const permissionsContent = loading
    ? '<p class="qlnote">Loading permission passes…</p>'
    : permissionError
      ? `<p class="leave-section-error">${escapeLinkValue(permissionError)}</p><button type="button" class="leave-retry">Retry</button>`
      : permissionRows.length
      ? tbl(["Date", "Reason", "Status / back"], permissionRows)
      : '<p class="qlnote">No permission passes found.</p>';
  return `
    <form id="leave-request-form" class="leave-request-form" hidden>
      <label for="leave-date">Leave date</label><input id="leave-date" name="date" type="date" min="${today}" required>
      <label for="leave-type">Type</label><select id="leave-type" name="type"><option>Permission</option><option>Medical</option><option>Family</option><option>Other</option></select>
      <label for="leave-reason">Reason</label><textarea id="leave-reason" name="reason" rows="3" required placeholder="Reason for the leave request"></textarea>
      <p class="leave-form-error" role="alert" hidden></p>
      <button type="submit" class="bigbtn amber">Submit request</button>
    </form>
    ${card("Requests", requestsContent)}
    ${card("Permission passes", permissionsContent)}`;
}
function renderLeavePanel(panel, studentId, requests, permissions, loading = false, requestError = "", permissionError = "") {
  repaint(panel, leavePanelMarkup(requests, permissions, loading, requestError, permissionError));
  const requestButton = panel.querySelector("#leave-request-open");
  const form = panel.querySelector("#leave-request-form");
  if (requestButton && form) {
    requestButton.addEventListener("click", () => {
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector("input")?.focus();
    });
  }
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const submit = form.querySelector('button[type="submit"]');
      const errorText = form.querySelector(".leave-form-error");
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Submitting…";
      }
      if (errorText) errorText.hidden = true;
      try {
        const result = await parentApi.requestLeave({
          studentId,
          date: String(formData.get("date") || ""),
          type: String(formData.get("type") || "Permission"),
          reason: String(formData.get("reason") || "").trim(),
        });
        if (!result || result.success === false || result.simulated) {
          throw new Error(result?.message || "Could not submit the leave request.");
        }
        toast("Leave request submitted to school");
        await loadLeavePanel(panel, studentId);
      } catch (submitError) {
        if (errorText) {
          errorText.textContent = submitError?.message || "Could not submit the leave request.";
          errorText.hidden = false;
        }
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Submit request";
        }
      }
    });
  }
  panel.querySelectorAll(".leave-retry").forEach((retry) => {
    retry.addEventListener("click", () => void loadLeavePanel(panel, studentId));
  });
}
async function loadLeavePanel(panel, studentId) {
  if (!PST.some((entry) => entry.el === panel)) return;
  renderLeavePanel(panel, studentId, [], [], true);
  const [leaveResponse, permissionResponse] = await Promise.all([
    parentApi.getLeave(studentId),
    parentApi.getPermissions(studentId),
  ]);
  if (!PST.some((entry) => entry.el === panel)) return;
  const unwrapList = (response) => {
    const data = response?.data ?? response;
    return Array.isArray(data) ? data : [];
  };
  renderLeavePanel(
    panel,
    studentId,
    unwrapList(leaveResponse),
    unwrapList(permissionResponse),
    false,
    leaveResponse == null ? "Could not load leave requests. Check your connection and retry." : "",
    permissionResponse == null ? "Could not load permission passes. Check your connection and retry." : "",
  );
}
function openNotifSettings() {
  const granted =
    typeof Notification !== "undefined" && Notification.permission === "granted";
  openSheet(
    `<h3>Notifications</h3>${!granted ? `<div class="found" style="border-color:var(--amber);background:var(--amber-soft);margin-bottom:10px"><small style="color:#9A5B00;font-size:11px;line-height:1.5"><b style="display:block;font-size:12px;color:#9A5B00">Turn on phone notifications</b>Allow yoShule to send school alerts and module updates to this device.</small><button class="go" style="margin-top:8px" onclick="registerPushNotifications()">Enable notifications</button></div>` : '<div class="srcline" style="margin-bottom:10px"><i></i>Phone notifications are enabled</div>'}${[
      ["Arrival, departure and attendance", 1],
      ["Discipline and conduct", 1],
      ["Academic marks and reports", 1],
      ["Fees, receipts and reminders", 1],
      ["ShuleKit and store updates", 1],
      ["Babyeyi wizard updates", 1],
      ["Student Management profile updates", 1],
    ]
      .map(
        ([t, o]) =>
          `<div class="chan ${o ? "on" : ""}" onclick="this.classList.toggle('on');try{const p=JSON.parse(localStorage.getItem('yoshule_notification_prefs_v1')||'{}');p['${String(t).replace(/[^a-z]/gi,'_')}']=this.classList.contains('on');localStorage.setItem('yoshule_notification_prefs_v1',JSON.stringify(p));}catch(e){}"><div><b>${t}</b></div><span class="sw"></span></div>`,
      )
      .join("")}<button class="go" onclick="closeSheet();toast('Preferences saved')">Save</button>`,
  );
}
function openNotif() {
  const colorFor = (n: any) => {
    const t = String(n?.type || "").toLowerCase();
    const title = String(n?.title || "").toLowerCase();
    if (t.includes("discipline") || t.includes("fee") || t.includes("wallet") || title.includes("due") || title.includes("low")) return "amber";
    if (t.includes("attendance") || t.includes("gate") || t.includes("academic") || t.includes("merit") || title.includes("arrived")) return "green";
    return "navy";
  };
  const render = (list: any[]) => {
    const body = list.length
      ? list
          .map((n: any) => {
            const c = colorFor(n);
            const title = n?.title || "School notification";
            const msg = n?.body || n?.message || "";
            const when = n?.time || (n?.createdAt ? new Date(n.createdAt).toLocaleString() : "");
            return `<div class="ni"><span class="av" style="background:${c === "green" ? "#E3F6EE" : c === "amber" ? "#FFF3DC" : "#E7ECF7"}"><svg viewBox="0 0 24 24" stroke="${c === "green" ? "#12784F" : c === "amber" ? "#9A5B00" : "#13213D"}">${BELL}</svg></span><div class="t"><b>${title}</b><p>${msg}</p><small>${when}</small></div></div>`;
          })
          .join("")
      : `<div class="empty2">No notifications yet. Alerts from discipline, attendance, academic, fees, ShuleKit, Babyeyi wizard and Student Management will appear here via web push.</div>`;
    openSheet(
      `<h3>Notifications</h3><p class="lead">Push alerts for all linked parent modules</p>${body}${typeof Notification !== "undefined" && Notification.permission !== "granted" ? `<button class="go" onclick="registerPushNotifications()">Enable phone notifications</button>` : ""}`,
    );
  };
  import("./services/push")
    .then((m) => {
      const list = (m.getStoredNotifications?.() || []).slice(0, 50);
      render(list);
      try { m.markAllNotificationsReadLocal?.(); } catch {}
    })
    .catch(() => render([]));
}

/* ================= landing / start page ================= */
let SAVED = [];
try {
  SAVED = JSON.parse(localStorage.getItem("sp_saved") || "[]");
} catch (e) {}
const saveSaved = () => {
  try {
    localStorage.setItem("sp_saved", JSON.stringify(SAVED));
  } catch (e) {}
};
let FOUND = null,
  LOOK = "",
  LOGGED = false;
const findKid = (q) => {
  q = q.trim().toUpperCase().replace(/\s+/g, "");
  return KIDS.findIndex((k) =>
    [k.code, k.sdms, k.cardno].some((c) => c.replace(/\s+/g, "") === q),
  );
};
function _v0_lookUp() {
  const v = ($("#sdmsq") || {}).value || "";
  LOOK = v;
  if (!v.trim()) {
    toast("Enter an SDMS code or ShuleCard number");
    return;
  }
  const i = findKid(v);
  if (i < 0 && typeof findAny === "function") {
    const r = findAny(v);
    if (r && !r.linked) {
      LOOK = "";
      FOUND = null;
      renderLanding();
      linkChild(v);
      return;
    }
  }
  FOUND = i < 0 ? -1 : i;
  renderLanding();
}
function saveKid(i) {
  if (!SAVED.includes(KIDS[i].id)) SAVED.push(KIDS[i].id);
  saveSaved();
  FOUND = null;
  LOOK = "";
  LSEL = i;
  renderLanding();
  toast(KIDS[i].first + " saved on this phone");
}
function unsaveKid(id) {
  SAVED = SAVED.filter((x) => x !== id);
  saveSaved();
  renderLanding();
}
const myKids = () =>
  LOGGED
    ? KIDS.map((k, i) => i)
    : SAVED.map((id) => KIDS.findIndex((k) => k.id === id)).filter(
        (i) => i >= 0,
      );
const ART = `<svg class="bg" viewBox="0 0 200 200"><circle cx="120" cy="120" r="80" fill="#F5A623" opacity=".18"/><rect x="70" y="70" width="70" height="90" rx="10" fill="#F5A623"/><rect x="70" y="60" width="70" height="20" rx="8" fill="#FFC457"/><rect x="82" y="92" width="46" height="6" rx="3" fill="#13213D" opacity=".6"/><rect x="82" y="106" width="34" height="6" rx="3" fill="#13213D" opacity=".4"/><rect x="146" y="88" width="10" height="56" rx="4" fill="#fff" transform="rotate(14 151 116)"/><circle cx="58" cy="150" r="16" fill="#fff" opacity=".9"/><path d="M50 150h16M58 142v16" stroke="#13213D" stroke-width="3"/></svg>`;
function quickRow(i) {
  return `<div class="qs"><button onclick="guestDo(${i},'pay')">${svgI(IC.pay)}Pay fees</button><button onclick="guestDo(${i},'bby')">${svgI(IC.doc)}Babyeyi</button><button onclick="guestDo(${i},'kit')">${svgI(IC.kit)}ShuleKit</button><button onclick="guestDo(${i},'top')">${svgI(IC.wallet)}Top up</button></div>`;
}
function guestDo(i, a) {
  K = i;
  if (a === "pay") {
    payFees();
  } else if (a === "bby") {
    getBabyeyi();
  } else if (a === "kit") {
    kitSelect();
  } else topUp();
}
let LSEL = null;
const DECO = `<img class="lphoto" src="data:image/webp;base64,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" alt="">`;
const _DECO_old = `<svg class="deco" viewBox="0 0 100 100"><circle cx="58" cy="50" r="40" fill="#fff" opacity=".35"/><rect x="34" y="34" width="44" height="52" rx="8" fill="#13213D"/><rect x="34" y="28" width="44" height="14" rx="6" fill="#24396A"/><rect x="42" y="50" width="28" height="4" rx="2" fill="#F5A623"/><rect x="42" y="60" width="20" height="4" rx="2" fill="#F5A623" opacity=".6"/><circle cx="26" cy="72" r="11" fill="#fff"/><path d="M21 72h10M26 67v10" stroke="#13213D" stroke-width="2.6"/></svg>`;
const SVC = [
  ["pay", "Pay fees", IC.pay, 1],
  ["bby", "Babyeyi", IC.doc, 1],
  ["kit", "ShuleKit", IC.kit, 1],
  ["top", "Top up card", IC.wallet, 1],
  [
    "Uniforms",
    "Uniforms",
    '<path d="M20.4 6.6 16 4l-4 2-4-2-4.4 2.6 2 4.4H6v9h12v-9h.4z"/>',
  ],
  [
    "Shoes voucher",
    "Shoes",
    '<path d="M4 16v-4a4 4 0 0 1 4-4h1l3 4h6a3 3 0 0 1 3 3v1z"/><path d="M4 16h17v2H4z"/>',
  ],
  [
    "help",
    "Help",
    '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  ],
];
function _v0_landDo(a) {
  if (a === "help") {
    toast("yoShule support · +250 793 903 847");
    return;
  }
  const sv = SAVED.map((id) => KIDS.findIndex((k) => k.id === id)).filter(
    (i) => i >= 0,
  );
  if (LSEL == null && sv.length) LSEL = sv[0];
  if (LSEL == null) {
    toast("Enter your child’s SDMS code or ShuleCard number first");
    const q = $("#sdmsq");
    if (q) q.focus();
    return;
  }
  K = LSEL;
  if (a === "pay") payFees();
  else if (a === "bby") getBabyeyi();
  else if (a === "kit") kitSelect();
  else if (a === "top") topUp();
  else shopFor(a);
}
function renderLanding0() {
  const L = $("#login");
  const f = FOUND;
  const sv = SAVED.map((id) => KIDS.findIndex((k) => k.id === id)).filter(
    (i) => i >= 0,
  );
  if (LSEL != null && !sv.includes(LSEL)) LSEL = null;
  if (LSEL == null && sv.length) LSEL = sv[0];
  L.className = "land" + (SHOW ? "" : " gone");
  L.innerHTML = `<div class="top"><div class="logo">Shule<span>+</span></div><button class="lng" onclick="toast('Language: English · Ikinyarwanda · Français')">EN</button></div>
 <div class="lhead">${DECO}<h1>Equitable School Readiness</h1><p>Pay fees, get the Babyeyi, order ShuleKit and top up pocket money with your child’s code.</p></div>
 <div class="body">
  <div class="sdms"><b class="t">${sv.length ? "Add another child" : "Find your child"}</b><small class="s">SDMS code or ShuleCard number</small>
   <div class="sdmsin"><span class="ic">${svgI('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}</span><input id="sdmsq" placeholder="e.g. SDM-2026-004821" value="${LOOK}" onkeydown="if(event.key==='Enter')lookUp()"><button class="go2" onclick="lookUp()">${svgI('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button></div>
   ${f === -1 ? `<div class="found" style="border-color:var(--red);background:#FDE7E8"><small style="color:#B4262B">No learner found for “${LOOK}”. Check the code on the ShuleCard or report card.</small></div>` : ""}
   ${f != null && f >= 0 ? `<div class="found"><div class="r"><span class="av">${KIDS[f].first[0]}I</span><div style="flex:1"><b>${KIDS[f].n}</b><small>${KIDS[f].cls} ·</small></div><button class="btn navy" style="height:38px;border-radius:12px;padding:0 14px" onclick="saveKid(${f});LSEL=${f};renderLanding()">${SAVED.includes(KIDS[f].id) ? "Saved" : "Save"}</button></div></div>` : ""}
   ${sv.length ? "" : '<div class="hint">Demo: SDM-2024-004121 (Keza) · SC-1187-2290 (Ganza)</div>'}</div>
  ${
    sv.length
      ? `<div class="lsec">My children<small>Tap to choose</small></div>
  <div class="kidrow">${sv
    .map((i) => {
      const k = KIDS[i];
      return `<button class="kc ${LSEL === i ? "on" : ""}" onclick="LSEL=${i};renderLanding()"><span class="x" onclick="event.stopPropagation();unsaveKid('${k.id}')">×</span><span class="av">${k.first[0]}I</span><b>${k.first}</b><small>${k.cls} · Umucyo SS</small><div class="ln"><span>Fees</span><b style="color:${k.fees ? "var(--red)" : "var(--green)"}">${k.fees ? rwf(k.fees) : "Paid"}</b></div><div class="ln" style="margin-top:3px"><span>ShuleCard</span><b style="color:${k.card < 3000 ? "#9A5B00" : "var(--navy)"}">${rwf(k.card)}</b></div></button>`;
    })
    .join(
      "",
    )}<button class="kc add" onclick="document.getElementById('sdmsq').focus()"><span>+</span>Add child</button></div>`
      : ""
  }
  <div class="lsec">What do you need?${LSEL != null ? `<small>For ${KIDS[LSEL].first}</small>` : ""}</div>
  <div class="sgrid">${SVC.map(([a, l, ic, m]) => `<button class="sg ${m ? "main" : ""}" onclick="landDo('${a}')"><i>${svgI(ic)}</i>${l}</button>`).join("")}</div>
  <button class="console" onclick="enterConsole()"><span class="ic">${svgI('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>')}</span><div><b>Enter parent console</b><small>Marks, attendance, homework, messages and more</small></div>${svgI('<path d="m9 18 6-6-6-6"/>')}</button>
  <div class="lfoot">powered by Shule+</div>
 </div>`;
}
function formatParentPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("250")) return "0" + d.slice(3).replace(/^0+/, "");
  if (d.startsWith("0")) return d;
  if (d.length === 9) return "0" + d;
  return d;
}
function loginPortal() {
  closeSheet();
  let page = document.getElementById("parent-login-page");
  if (!page) {
    page = document.createElement("section");
    page.id = "parent-login-page";
    page.className = "parent-login-page";
    page.setAttribute("aria-label", "Parent sign in");
    document.getElementById("screen")?.append(page);
  }
  page.innerHTML = `<header class="parent-login-header"><img class="parent-login-logo" src="${LOGO}" alt="yoShule"><button type="button" class="parent-login-back" onclick="closeLoginPortal()" aria-label="Back to start page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg><span>Back</span></button></header>
  <main class="parent-login-content"><div class="parent-login-intro"><small>PARENT ACCOUNT</small><h1>Sign in</h1></div>
  <form class="parent-login-form" onsubmit="event.preventDefault();doLogin()"><label for="lph">Phone number</label><input id="lph" placeholder="0788 123 456" inputmode="tel" autocomplete="tel" oninput="clearLoginInvalid(this)"><label for="lpin">PIN / Password</label><input id="lpin" type="password" inputmode="numeric" maxlength="5" placeholder="Enter your 5-digit PIN" autocomplete="current-password" oninput="clearLoginInvalid(this)"><button type="submit" class="parent-login-submit" id="loginBtn">Sign in</button><p id="loginMsg" role="status" aria-live="polite"></p></form></main>`;
}
function closeLoginPortal() {
  document.getElementById("parent-login-page")?.remove();
}
function markLoginInvalid(fields) {
  fields.forEach((field) => {
    if (!field) return;
    field.classList.remove("login-shake");
    void field.offsetWidth;
    field.classList.add("login-invalid", "login-shake");
    window.setTimeout(() => field.classList.remove("login-shake"), 500);
  });
}
function clearLoginInvalid(field) {
  field.classList.remove("login-invalid", "login-shake");
}
function doLogin() {
  const phEl = document.getElementById("lph");
  const pinEl = document.getElementById("lpin");
  const btn = document.getElementById("loginBtn");
  const msg = document.getElementById("loginMsg");
  const setMsg = (t) => {
    if (msg) msg.textContent = t;
  };
  const reset = () => {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  };
  let phone = (phEl?.value || "").replace(/\D/g, "");
  if (!phone) {
    markLoginInvalid([phEl]);
    setMsg("Enter your phone number");
    toast("Enter your phone number");
    return;
  }
  phone = formatParentPhone(phone);
  const pin = (pinEl?.value || "").replace(/\D/g, "");
  if (!pin) {
    markLoginInvalid([pinEl]);
    setMsg("Enter your PIN");
    toast("Enter PIN");
    return;
  }
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Signing in…";
  }
  setMsg("");
  import("./services/parentRealApi")
    .then((m) => {
      m.parentRealApi
        .login(phone, pin)
        .then(async (res) => {
          if (res && res.token) {
            try {
              localStorage.setItem("parent_access_token", res.token);
              localStorage.setItem("parent_login_data", JSON.stringify(res));
            } catch (e) {}
            MYPHONE = phone;
            LOGGED = true;
            SHOW = true;
            CHILDREN_LOADING = true;
            KIDS = [];
            SAVED = [];
            if (res.parent) {
              PARENT = {
                id: res.parent.id,
                n:
                  (
                    (res.parent.firstName || "") +
                    " " +
                    (res.parent.lastName || "")
                  ).trim() || "Parent",
                first: res.parent.firstName || "Parent",
                ph: res.parent.phone || phone,
                email: res.parent.email || "",
              };
            }
            if (Array.isArray(res.students)) {
              KIDS = res.students.map((s) => ({
                id: s.id,
                n: s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim(),
                first: s.firstName || s.name?.split(" ")[0] || "Child",
                cls: s.className || "Student",
                lvl: s.className?.startsWith("S")
                  ? "Secondary"
                  : s.className?.startsWith("P")
                    ? "Primary"
                    : "School",
                code: s.studentCode || "",
                sdms: s.studentCode || "",
                cardno: "",
                photo: s.photo || null,
                gender: s.gender || "MALE",
                role: s.role || "FATHER",
                organizationId: s.organizationId || "",
                academicYear: s.academicYear || "",
                term: s.term || "",
                type: "Day scholar",
                ct: "",
                dorm: "",
                patron: "",
                card: 0,
                lastTop: ["—", 0],
                fees: 0,
                att: 0,
                avg: 0,
                prev: 0,
                trend: [],
                cls_avg: [],
                rank: "—",
                conduct: 0,
                today: {
                  where: "",
                  what: "",
                  with: "",
                  period: "",
                  trail: [],
                },
                subj: [],
                hw: [],
                tests: [],
                cardtx: [],
                feeLines: [],
                health: [],
                disc: [],
                kit: {
                  for: (s.className || "Student") + " (2027)",
                  items: [],
                  shoe: "",
                  uni: "M",
                },
                bus: null,
                guardians: [phone],
                schoolName: "",
              }));
            }
            SAVED = KIDS.map((k) => k.id);
            try {
              localStorage.setItem("sp_saved", JSON.stringify(SAVED));
            } catch (e) {}
            K = 0;
            LSEL = 0;
            closeLoginPortal();
            closeSheet();
            renderAll();
            renderLanding();
            toast(`Welcome, ${PARENT.first}`);
            try {
              await syncRealBackend();
            } finally {
              CHILDREN_LOADING = false;
              renderAll();
              renderLanding();
            }
          } else {
            reset();
            markLoginInvalid([phEl, pinEl]);
            setMsg("Login failed. Check your phone and PIN.");
            toast("Login failed. Check phone/PIN.");
          }
        })
        .catch(() => {
          reset();
          setMsg("Login failed. Check your connection.");
          toast("Login failed. Check your connection.");
        });
    })
    .catch(() => {
      reset();
      setMsg("Login unavailable. Try again.");
      toast("Login unavailable. Try again.");
    });
}
function loginOtp() {
  doLogin();
}
function _old_logout() {
  LOGGED = false;
  PST.slice().forEach(() => popPanel());
  renderLanding();
}
function openServices() {
  openSheet(
    `<h3>Tools and services</h3><p class="lead">Use them with your child’s SDMS code or ShuleCard number.</p>${[
      ["ShuleKit", "Purchase school materials and kits", IC.kit, "kitSelect()"],
      ["School fees", "Pay tuition and check balances", IC.doc, "payFees()"],
      [
        "Shoes voucher",
        "Order school shoes with ease",
        '<path d="M4 16v-4a4 4 0 0 1 4-4h1l3 4h6a3 3 0 0 1 3 3v1z"/><path d="M4 16h17v2H4z"/>',
        "closeSheet();shopFor('Shoes voucher')",
      ],
      [
        "Papeterie",
        "Stationery and supplies shop",
        '<path d="M3 9 5 4h14l2 5M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
        "closeSheet();shopFor('Papeterie')",
      ],
      [
        "Uniforms",
        "Official school uniforms",
        '<path d="M20.4 6.6 16 4l-4 2-4-2-4.4 2.6 2 4.4H6v9h12v-9h.4z"/>',
        "closeSheet();shopFor('Uniforms')",
      ],
      [
        "ShuleCard top-up",
        "Pocket money for the canteen",
        IC.wallet,
        "topUp()",
      ],
    ]
      .map(
        ([t, s, ic, f]) =>
          `<button class="svc" onclick="${f}"><span class="ic">${svgI(ic)}</span><div><b>${t}</b><small>${s}</small></div><span>›</span></button>`,
      )
      .join(
        "",
      )}<p class="qlnote" style="text-align:center;margin-top:14px">Need help? Contact yoShule support · +250 793 903 847</p>`,
  );
}
function _q0_shopFor(n) {
  const items = {
    "Shoes voucher": [
      ["Black leather school shoes", "12,000"],
      ["Canvas PE shoes", "6,500"],
    ],
    Papeterie: [
      ["Exercise books 96 pages (10)", "6,000"],
      ["Mentor pens, pack of 10", "2,500"],
      ["Geometry set", "3,500"],
      ["Scientific calculator", "9,800"],
    ],
    Uniforms: [
      ["Uniform set (shirt, skirt or trousers, tie)", "9,800"],
      ["School sweater", "7,500"],
      ["PE kit", "6,000"],
    ],
  }[n];
  openSheet(
    `<h3>${n}</h3><p class="lead">Delivered to school for ${kid().first} · ${kid().cls}</p><div style="margin-top:8px">${items.map(([a, p]) => `<div class="kit"><span class="q">${svgI('<path d="M12 5v14M5 12h14"/>').replace("<svg", '<svg width="14" height="14" fill="none" stroke="#9A5B00" stroke-width="2.4"')}</span><div><b>${a}</b></div><span class="p">${p}</span></div>`).join("")}</div><button class="go" onclick="closeSheet();toast('Added to your order · pay with MoMo or card')">Order for ${kid().first}</button>`,
  );
}
function renderAll() {
  const parts = [renderHome, renderLearn, renderPay, renderKit, renderChat];
  for (const fn of parts) {
    try {
      fn();
    } catch (e) {
      console.warn("[ParentApp] render failed:", fn.name, e);
    }
  }
  try {
    const due = KIDS.filter((x) => x.fees > 0).length;
    const badge = $("#paybadge");
    if (badge) {
      badge.textContent = due;
      badge.style.display = due ? "grid" : "none";
    }
  } catch (e) {
    console.warn("[ParentApp] badge update failed:", e);
  }
}
setInterval(() => {
  const clock = $("#clock");
  if (clock)
    clock.textContent = new Date().toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
    });
}, 1000);
/* =========================================================
   v5 · back to start page · link a child · ShuleKit request · trips & savings goals
   ========================================================= */
/* ---- 1. back to the start page ---- */
let SHOW = true;
let CHILDREN_LOADING = false;
function _v0_showLanding() {
  SHOW = true;
  PST.slice().forEach(() => popPanel());
  closeSheet();
  renderLanding();
}
function _v0_enterConsole() {
  if (LOGGED) {
    SHOW = false;
    renderLanding();
    toast("Back in the parent console");
  } else loginPortal();
}
function logout() {
  try {
    parentRealApi.clearToken();
    localStorage.removeItem("parent_access_token");
    localStorage.removeItem("parent_login_data");
    localStorage.removeItem("parent_push_token");
    SAVED = [];
    saveSaved();
  } catch (e) {}
  LOGGED = false;
  SHOW = true;
  PARENT = {
    id: "parent",
    n: "Parent",
    first: "Parent",
    ph: "",
    email: "",
  };
  KIDS = [];
  PST.slice().forEach(() => popPanel());
  closeSheet();
  renderLanding();
  toast("Signed out");
}

/* ---- 2. link a child (guardian phone + OTP) ---- */
KIDS[0].guardians = ["+250 788 412 330", "+250 788 412 331"];
KIDS[1].guardians = ["+250 788 412 330", "+250 788 412 331"];
let MYPHONE = "250788123456";
function makeTeta() {
  const t = JSON.parse(JSON.stringify(KIDS[0]));
  Object.assign(t, {
    id: "teta",
    n: "Teta Ineza",
    first: "Teta",
    cls: "S5C",
    lvl: "A-Level · HEG",
    code: "US-2023-0221",
    sdms: "SDM-2023-002215",
    cardno: "SC-2215-4410",
    ct: "Samuel Rwigema",
    card: 5600,
    lastTop: ["15 Oct", 10000],
    fees: 0,
    att: 98.4,
    avg: 76.9,
    prev: 74.1,
    trend: [72.0, 74.1, 76.9],
    cls_avg: [68.0, 68.7, 68.7],
    rank: "4 of 51",
    conduct: 95,
    guardians: ["+250 788 412 330", "+250 788 512 904"],
  });
  t.feeLines = t.feeLines.map((l) => [l[0], l[1], l[1], "0"]);
  t.subj = [
    ["History", 84, "Samuel Rwigema", "Excellent essays."],
    ["Economics", 79, "Patrick Rukundo", "Strong analysis."],
    ["Geography", 77, "Jean Kwizera", "Very good fieldwork."],
    ["English", 80, "Peace Umuhoza", "Fluent and precise."],
    ["Entrepreneurship", 74, "Aimée Uwamariya", "Good business plan."],
    ["Kinyarwanda", 68, "Marie Mukarugwiza", "Akomeze."],
  ];
  t.today = {
    ...t.today,
    what: "History · Pre-colonial Rwanda",
    with: "Samuel Rwigema",
    where: "In class · Room 19",
  };
  t.kit = { ...t.kit, for: "S6 (2027)" };
  t.hw = [
    [
      "23",
      "OCT",
      "Economics",
      "Essay: inflation in Rwanda",
      "Due Friday",
      "navy",
    ],
  ];
  return t;
}
let POOL = [
  {
    id: "teta",
    n: "Teta Uwase",
    first: "Teta",
    cls: "Senior 4",
    lvl: "O-Level",
    code: "KGS-2026-003",
    sdms: "SDM-2026-0003",
    cardno: "SHU-8801-4455",
    guardians: [PARENT.ph, "+250788512904"],
    card: 5600,
    fees: 0,
    att: 98.4,
    avg: 76.9,
    prev: 74.1,
    trend: [72.0, 74.1, 76.9],
    cls_avg: [68.0, 68.7, 68.7],
    rank: "4 of 51",
    conduct: 95,
  },
  {
    id: "diane",
    n: "Diane Uwase",
    first: "Diane",
    cls: "Senior 2",
    lvl: "O-Level",
    code: "KGS-2026-004",
    sdms: "SDM-2026-0004",
    cardno: "SHU-8801-5566",
    guardians: ["+250783220118", "+250788640271"],
    card: 1200,
    fees: 95000,
    att: 92.0,
    avg: 65.0,
    prev: 64.0,
    trend: [62.0, 64.0, 65.0],
    cls_avg: [63.0, 64.0, 65.0],
    rank: "18 of 50",
    conduct: 85,
  },
];
const findAny = (q) => {
  q = q.trim().toUpperCase().replace(/\s+/g, "");
  const m = (k) =>
    [k.code, k.sdms, k.cardno].some((c) => c && c.replace(/\s+/g, "") === q);
  const i = KIDS.findIndex(m);
  if (i >= 0) return { linked: true, i };
  const j = POOL.findIndex(m);
  return j >= 0 ? { linked: false, j } : null;
};
const intlPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("250")) return d;
  if (d.startsWith("0")) return "250" + d.slice(1);
  return d.length === 9 ? "250" + d : d;
};
function learnerFromLookup(s) {
  const full =
    s.fullName ||
    `${s.firstName || ""} ${s.lastName || ""}`.trim() ||
    "Student";
  const code =
    s.shuleCode || s.studentCode || s.studentUid || s.registrationNumber || "";
  const found =
    KIDS.find((k) => k.id === s.id) || POOL.find((k) => k.id === s.id);
  if (found) {
    if (!found.guardians?.length)
      found.guardians = (s.parents || [])
        .map((x) => intlPhone(x.phone))
        .filter(Boolean);
    return found;
  }
  const cls = s.className || s.classLabel || "Student";
  const learner = {
    id: s.id || "api-" + code,
    n: full,
    first: s.firstName || full.split(/\s+/)[0] || "Student",
    cls,
    lvl: s.educationLevel || "Student",
    code,
    sdms: s.sdmCode || code,
    cardno: "",
    type: "Day scholar",
    ct: "",
    dorm: "",
    patron: "",
    card: 0,
    lastTop: ["—", 0],
    fees: Number(s.outstandingBalance) || 0,
    att: 0,
    avg: 0,
    prev: 0,
    trend: [0, 0, 0],
    cls_avg: [0, 0, 0],
    rank: "—",
    conduct: 100,
    today: {
      where: "—",
      what: "No timetable data",
      with: "—",
      period: "—",
      trail: [],
    },
    subj: [],
    hw: [],
    tests: [],
    cardtx: [],
    feeLines: [],
    health: [],
    disc: [],
    kit: { for: cls + " (2027)", items: [], shoe: "", uni: "" },
    bus: null,
    guardians: (s.parents || []).map((x) => intlPhone(x.phone)).filter(Boolean),
    schoolName: s.schoolName || "",
  };
  POOL.push(learner);
  return learner;
}
async function resolveLearner(q) {
  const s = await parentRealApi.lookupStudent(q);
  return s ? learnerFromLookup(s) : null;
}

const mask = (p) => p.replace(/(\+250 \d{3}) \d{3} (\d{3})/, "$1 ••• $2");
let LK = { step: 0, q: "", hit: null };
function linkChild(q) {
  LK = { step: 0, q: q || "", hit: null };
  lkStep();
}
async function lkFind() {
  const input = $("#lkq");
  const v = input?.value || "";
  LK.q = v;
  if (!v.trim()) {
    toast("Enter the student code");
    return;
  }
  try {
    const f = await resolveLearner(v);
    if (!f) {
      const error = $("#lk-error");
      if (error) error.textContent = "No student found. Check the code and try again.";
      return;
    }
    if (LOGGED && KIDS.some((kid) => kid.id === f.id || (kid.code && kid.code === f.code))) {
      const error = $("#lk-error");
      if (error) error.textContent = `${f.first} is already linked to your account.`;
      return;
    }
    let j = POOL.indexOf(f);
    if (j < 0) {
      POOL.push(f);
      j = POOL.length - 1;
    }
    LK.hit = j;
    LK.step = 1;
    lkStep();
  } catch (e) {
    const error = $("#lk-error");
    if (error) error.textContent = e?.message || "Student lookup failed. Check your connection.";
  }
}
function addChild() {
  linkChild();
}

/* ---- 3. ShuleKit request workflow, to the end ---- */
const KST = [
  "Requested",
  "Payment",
  "Order placed",
  "Packed",
  "Delivered to school",
  "Received by child",
  "Confirmed",
];
const KSTD = [
  "21 Oct",
  "Until 15 Dec",
  "After 15 Nov cut-off",
  "Mentor warehouse · Dec",
  "8 Jan 2027",
  "First week of term",
  "By you",
];
function kitState(x) {
  return KIT.enrolled[x.id];
}
let kitPaySettled = false;
function kitPay() {
  const total = kitSum();
  const firstChild = KIDS.find((x) => KW.kids.includes(x.id)) || kid();
  const startPhone = String((PARENT && PARENT.ph) || MYPHONE || "").replace(
    /[^0-9+\s-]/g,
    "",
  );
  kitPaySettled = false;
  openSheet(
    `<div class="wz-top"><small style="font-size:10.5px;font-weight:700;color:var(--amber);letter-spacing:.6px">SHULEKIT · PAY IN FULL</small><button onclick="closeSheet()" style="width:30px;height:30px;border-radius:10px;background:var(--bg)">✕</button></div>
     <h3 style="margin-top:4px">Pay with mobile money</h3>
    <div class="bigamt"><input id="kit-amount" type="text" inputmode="numeric" aria-label="Payment amount in RWF" value="${fmt(total)}" oninput="this.value=this.value.replace(/[^0-9,]/g,'')"><small>RWF</small></div>
     <div class="lbl2">Phone number to bill</div>
     <input id="kit-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. 0788 123 456" value="${startPhone}" style="width:100%;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;font:inherit;color:var(--navy);background:#fff">
     <button class="go" id="kitpaygo">Send payment request</button>`,
  );
  const button = $("#kitpaygo");
  if (button) button.onclick = () => {
    const amountInput = $("#kit-amount");
    const amount = Number(String((amountInput && amountInput.value) || "").replace(/\D/g, ""));
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast("Enter a valid payment amount");
      return;
    }
    kitStartPayment(amount, firstChild);
  };
}
async function kitStartPayment(amount, child) {
  const input = $("#kit-phone");
  const phone = String((input && input.value) || "")
    .replace(/[^0-9+\s-]/g, "")
    .trim();
  if (phone.replace(/\D/g, "").length < 9) {
    toast("Enter the phone number to bill");
    return;
  }
  const button = $("#kitpaygo");
  if (button) {
    button.disabled = true;
    button.textContent = "Sending request…";
  }
  if (!parentRealApi.getToken()) {
    kitPaymentWaiting(amount, phone, null);
    return;
  }
  try {
    const result = await parentRealApi.initiateCollectionPayment({
      studentId: child && child.id,
      amount,
      phone,
      purpose: "SHULEKIT",
      description: `ShuleKit Term 1 2027 · ${(child && child.first) || "learner"}`,
      metadata: { kids: KW.kids, plan: KW.plan, items: KW.items },
    });
    if (!result || !result.reference) throw new Error("No payment reference returned");
    const billedPhone = result.phone || phone;
    kitPaymentWaiting(amount, billedPhone, result.reference);
    kitPaymentPoll(result.reference, amount, billedPhone, 0);
  } catch (error) {
    console.warn("XentriPay payment request failed:", error);
    toast((error && error.message) || "Could not send the payment request");
    if (button) {
      button.disabled = false;
      button.textContent = "Send payment request";
    }
  }
}
function kitPaymentWaiting(amount, phone, reference) {
  openSheet(
    `<div class="wz-top"><small style="font-size:10.5px;font-weight:700;color:var(--amber);letter-spacing:.6px">SHULEKIT · MOBILE MONEY</small><button onclick="closeSheet()" style="width:30px;height:30px;border-radius:10px;background:var(--bg)">✕</button></div>
     <h3 style="margin-top:4px">${reference ? "Check your phone" : "Approve the request"}</h3>
     <p class="lead">A mobile money request for ${rwf(amount)} was sent to <b>${phone}</b>.</p>
     <div class="wdone" style="padding:20px 0"><div class="em">${svgI('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>').replace("<svg", '<svg width="34" height="34" fill="none" stroke="#13213D" stroke-width="2.4"')}</div></div>
     ${reference ? `<div class="srcline"><i></i><span id="kitpaystatus">Waiting for confirmation…</span></div><button class="go" id="kitpaycheck" style="background:var(--bg);color:var(--navy)">Check status</button>` : `<p class="qlnote">Demo mode: sign in to send a real XentriPay request to this phone.</p><button class="go" id="kitpaydone">I have approved it</button>`}`,
  );
  if (reference) {
    const check = $("#kitpaycheck");
    if (check) check.onclick = () => kitPaymentPoll(reference, amount, phone, 60);
  } else {
    const done = $("#kitpaydone");
    if (done) done.onclick = () => kitDone();
  }
}
async function kitPaymentPoll(reference, amount, phone, attempt) {
  if (kitPaySettled) return;
  const label = $("#kitpaystatus");
  if (!label) return;
  try {
    const result = await parentRealApi.getCollectionPaymentStatus(reference);
    const status = String((result && result.status) || "PENDING").toUpperCase();
    if (status === "SUCCESS") {
      if (kitPaySettled) return;
      kitPaySettled = true;
      label.textContent = "Payment confirmed";
      toast(`${rwf(amount)} paid with mobile money`);
      setTimeout(() => kitDone(), 600);
      return;
    }
    if (status === "FAILED") {
      label.textContent = "The payment was not completed.";
      const check = $("#kitpaycheck");
      if (check) {
        check.textContent = "Try again";
        check.onclick = () => kitPay();
      }
      return;
    }
    label.textContent = `Waiting for you to approve on ${phone}…`;
  } catch (error) {
    console.warn("XentriPay status check failed:", error);
    if (label) label.textContent = "Still checking…";
  }
  if (attempt >= 60) {
    if (label)
      label.textContent =
        "Still waiting. Approve the prompt on your phone, then tap Check status.";
    return;
  }
  setTimeout(() => kitPaymentPoll(reference, amount, phone, attempt + 1), 3000);
}
function kitDone() {
  KW.kids.forEach((id) => {
    const child = KIDS.find((k) => k.id === id);
    const selItems = child ? [...kitSel(child)] : [];
    const selTotal = child ? kitSelTotal(child) : 0;
    (KIT.enrolled as any)[id] = {
      plan: KW.plan,
      stage: KW.plan === "save" ? 1 : KW.plan === "credit" ? 1 : 2,
      weeks: KW.plan === "save" ? 1 : 0,
      credit: KW.plan === "credit" ? "pending" : null,
      shoe: selItems.includes("shoe") ? KW.shoe[id] : null,
      uni: selItems.includes("uni") ? KW.uni[id] : null,
      items: selItems,
      total: selTotal,
      issue: null,
    };
  });
  closeSheet();
  renderAll();
  toast(
    KW.plan === "credit"
      ? "Request sent · credit decision by SMS"
      : KW.plan === "save"
        ? "Request sent · first weekly saving received"
        : "Request sent and paid in full",
  );
}
function renderKit() {
  const all = KIDS.every((x) => kitState(x));
  $("#v-kit").innerHTML =
    hero("ShuleKit") +
    `<div class="wrap">
  <div class="sec"><h3>Your children’s kits</h3></div>
  ${KIDS.map((x, i) => {
    const e: any = kitState(x);
    const kidTotal = e && e.total != null ? e.total : kitSelTotal(x);
    const selIds = e && e.items ? e.items : kitSel(x);
    const count = selIds.length;
    return `<div class="card cprof" onclick="kitDetail(${i})"><div class="h"><span class="cid in" style="width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-weight:800;font-size:12px;flex-shrink:0">${ini(x.first, x.n)}</span><div class="m"><b>${x.first} · kit for ${x.kit?.for || "School"}</b><small class="s">${count} items${selIds.includes("shoe") ? " incl. shoes" : ""}${selIds.includes("uni") ? " and uniform" : ""}</small></div><div class="att"><b>${rwf(kidTotal)}</b></div></div>
   ${e ? `<div class="stg" style="margin-top:10px">${KST.map((_, j) => `<i class="${j < e.stage ? "on" : j === e.stage ? "cur" : ""}"></i>`).join("")}</div><div class="tags"><span class="chip ${e.stage >= 6 ? "green" : "navy"}">${KST[e.stage]}</span>${e.issue ? '<span class="chip amber">Exchange requested</span>' : ""}</div>` : '<div class="tags"><span class="chip amber">Not requested yet</span></div>'}</div>`;
  }).join("")}
  ${all ? "" : `<button class="bigbtn amber" onclick="kitSelect()">Request ShuleKit for Term 1 2027</button>`}
  <div class="sec"><h3>Last term’s kits</h3></div>
  <div class="card">${tbl(
    ["Child", "Kit", "Status"],
    KIDS.map((x) => [
      x.first,
      x.cls + " · 2026",
      '<span class="chip green">Active kit</span>',
    ]),
  )}</div>
 </div>`;
}
function kitDetail(i: number) {
  const x = KIDS[i],
    e: any = kitState(x);
  const t = e && e.total != null ? e.total : kitSelTotal(x),
    wk = Math.ceil(t / 8 / 100) * 100,
    cm = Math.ceil((t * 1.04) / 3 / 100) * 100;
  const pay = !e
    ? ""
    : e.plan === "save"
      ? `<div class="hl"><div class="r"><span>Weekly savings · ${e.weeks} of 8</span><span>${rwf(Math.min(t, e.weeks * wk))} of ${rwf(t)}</span></div><div class="t"><i style="width:${(e.weeks / 8) * 100}%;background:var(--green)"></i></div></div>${e.weeks < 8 ? `<button class="bigbtn" onclick="kitSave(${i})">Pay this week · ${rwf(wk)}</button>` : ""}`
      : e.plan === "credit"
        ? `<p style="font-size:12px">ShuleKit Credit · ${e.credit === "approved" ? `<b style="color:var(--green)">approved</b> · ${rwf(cm)} a month for 3 months from January` : '<b style="color:#9A5B00">decision pending</b> with the lending partner'}</p>`
        : `<p style="font-size:12px"><b style="color:var(--green)">Paid in full</b> · ${rwf(t)}</p>`;
  const act = !e
    ? ""
    : e.stage === 5 && !e.issue
      ? `<button class="bigbtn" onclick="kitConfirm(${i})">${x.first} has everything · confirm</button><button class="bigbtn ghost" style="margin-top:8px" onclick="kitIssue(${i})">Report a problem</button>`
      : e.issue && e.stage === 5
        ? `<div class="found" style="margin-top:12px"><small>Exchange requested: ${e.issue}. The school will swap it within 3 school days.</small></div><button class="bigbtn" onclick="kitConfirm(${i})">Exchange received · confirm</button>`
        : e.stage >= 6
          ? `<div class="found" style="margin-top:12px;border-color:var(--green);background:#E3F6EE"><small style="color:#12784F">Thank you. ${x.first}’s kit is complete for Term 1 2027.</small></div>`
          : "";

  const selIds = e && e.items ? e.items : kitSel(x);
  const allLines = kitLines(x);
  const itemsHtml = allLines
    .filter((l: any) => !e || selIds.includes(l.id))
    .map((l: any) => {
      const isSel = selIds.includes(l.id);
      const size =
        l.id === "shoe"
          ? ` · size ${(e && e.shoe) || KW.shoe[x.id] || x.kit?.shoe || "38"}`
          : l.id === "uni"
            ? ` · size ${(e && e.uni) || KW.uni[x.id] || x.kit?.uni || "M"}`
            : "";
      return `<div class="kit"><span class="q">${l.q}</span><div><b>${l.n}${size}</b><small>${l.p ? rwf(l.p) + " each" : "Included free"}</small></div><span class="p">${l.p ? fmt(l.price) : "Free"}</span></div>`;
    })
    .join("");

  pushPanel({
    k: "ShuleKit · Term 1 2027",
    t: x.first + "’s kit",
    s:
      (KSEL === "standard" ? "Standard kit" : "School list") +
      " for " +
      (x.kit?.for || "School"),
    b: `${src("ShuleKit · Mentor · yoShule delivery")}
  ${e ? card("Where the kit is", `<div class="vstep">${KST.map((s, j) => `<div class="${j < e.stage ? "ok" : j === e.stage ? "cur" : ""}"><b>${s}</b><small>${j === 1 ? (e.plan === "save" ? "Weekly savings until 15 Dec" : e.plan === "credit" ? "ShuleKit Credit" : "Paid in full") : j === 5 ? "Issued in class · ShuleCard tap" : KSTD[j]}</small></div>`).join("")}</div>`) : ""}
  ${e ? card("Payment", pay) : ""}
  ${act}
  ${card("Items", itemsHtml + `<div class="kit"><span class="q" style="background:var(--navy);color:#fff">Σ</span><div><b>Total</b></div><span class="p">${fmt(t)}</span></div>`, "RWF")}
  ${e ? (e.stage < 6 ? `<button class="demo" onclick="kitNext(${i})">Demo: move to the next step ›</button>` : "") : `<button class="bigbtn amber" onclick="popPanel();kitSelect()">Request ${x.first}’s kit</button>`}`,
  });
}
const kitRe = (i) => {
  popPanel();
  setTimeout(() => kitDetail(i), 60);
  renderKit();
};
function kitSave(i) {
  const e = kitState(KIDS[i]);
  e.weeks = Math.min(8, e.weeks + 1);
  toast("Weekly saving received");
  kitRe(i);
}
function kitNext(i) {
  const e = kitState(KIDS[i]);
  if (e.plan === "save" && e.stage === 1) e.weeks = 8;
  if (e.plan === "credit") e.credit = "approved";
  e.stage = Math.min(6, e.stage + 1);
  kitRe(i);
}
function kitConfirm(i) {
  const e = kitState(KIDS[i]);
  e.stage = 6;
  toast("Thank you for confirming");
  kitRe(i);
}
function kitIssue(i) {
  const x = KIDS[i];
  openSheet(
    `<h3>Report a problem</h3><p class="lead">The class teacher and ShuleKit team are told straight away.</p>${["An item is missing", "Wrong shoe size", "Wrong uniform size", "An item is damaged"].map((r, j) => `<div class="opt ${j ? "" : "on"}" onclick="this.parentNode.querySelectorAll('.opt').forEach(o=>o.classList.toggle('on',o===this))"><i></i>${r}</div>`).join("")}<textarea placeholder="Which item? e.g. geometry set"></textarea><button class="go" onclick="(()=>{const r=document.querySelector('#sheet .opt.on').textContent.toLowerCase();kitState(KIDS[${i}]).issue=r;closeSheet();kitRe(${i});toast('Exchange requested')})()">Send</button>`,
  );
}

/* ---- 4. School trips (ShuleTrip) and savings goals ---- */
let TRIPS = [
  {
    id: "t1",
    kid: "keza",
    title: "S3 Geography field trip",
    place: "Musanze · Volcanoes National Park and Musanze caves",
    date: "Saturday 14 November 2026",
    short: "14 Nov",
    depart: "05:30",
    ret: "19:00",
    cost: 45000,
    items: [
      ["Transport (2 buses)", 18000],
      ["Park entry and guide", 15000],
      ["Lunch and water", 8000],
      ["Travel insurance", 4000],
    ],
    ref: "ST-2026-0187",
    approved: "District Education Office · 19 Oct",
    leader: ["Jean Kwizera", "+250788610201"],
    staff: 6,
    students: 104,
    nurse: "School nurse travels with the group",
    plan: [
      ["05:30", "Depart school"],
      ["08:30", "Arrive in Kinigi, safety briefing"],
      ["09:00", "Guided walk: volcano formation and land use"],
      ["12:30", "Lunch"],
      ["14:00", "Musanze caves"],
      ["16:00", "Depart for Kigali"],
      ["19:00", "Arrive at school"],
    ],
    pack: [
      "School uniform and sweater",
      "Rain jacket",
      "Notebook and pen",
      "Water bottle",
      "Any personal medication",
    ],
    consent: null,
    paid: 0,
    inst: 0,
    due: "7 Nov",
    day: 0,
  },
  {
    id: "t2",
    kid: "ganza",
    title: "S1 History visit",
    place: "Kigali Genocide Memorial",
    date: "Friday 6 November 2026",
    short: "6 Nov",
    depart: "09:00",
    ret: "14:00",
    cost: 8000,
    items: [
      ["Transport", 5000],
      ["Snack and water", 3000],
    ],
    ref: "ST-2026-0179",
    approved: "District Education Office · 12 Oct",
    leader: ["Samuel Rwigema", "+250788610202"],
    staff: 4,
    students: 106,
    nurse: "First-aid kit and trained staff",
    plan: [
      ["09:00", "Depart school"],
      ["09:45", "Guided visit"],
      ["12:30", "Reflection session"],
      ["14:00", "Back at school"],
    ],
    pack: ["School uniform", "Notebook and pen"],
    consent: { by: "Claire Uwimana", at: "14 Oct" },
    paid: 8000,
    inst: 0,
    due: "30 Oct",
    day: 0,
  },
];
let GOALS = [
  {
    id: "g1",
    kid: "keza",
    name: "S4 tour, Akagera 2027",
    target: 120000,
    saved: 36000,
    weekly: 5000,
    by: "June 2027",
    auto: true,
  },
];
const tripsOf = (k) => TRIPS.filter((t) => t.kid === k.id);
const ringSvg = (p, c = "#F5A623") => {
  const R = 27,
    C = 2 * Math.PI * R;
  return `<div class="ring"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" stroke="#EEF0F4" stroke-width="7" fill="none"/><circle cx="32" cy="32" r="${R}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.min(1, p))}"/></svg><b>${Math.round(p * 100)}%</b></div>`;
};
const MTN = `<svg viewBox="0 0 150 84"><path d="M0 84 40 30l22 26 28-40 60 68z" fill="#F5A623" opacity=".9"/><path d="M40 30l10 14-10-4-8 6z" fill="#fff" opacity=".8"/><path d="M90 16l12 16-12-5-9 7z" fill="#fff" opacity=".8"/><circle cx="126" cy="22" r="10" fill="#FFC457"/></svg>`;
function tStatus(t) {
  if (!t.consent) return ["amber", "Consent needed"];
  if (t.paid < t.cost) return ["red", `${rwf(t.cost - t.paid)} to pay`];
  return ["green", "Ready to go"];
}
function tripCard(t) {
  const k = KIDS.find((x) => x.id === t.kid);
  const [c, l] = tStatus(t);
  return `<div class="card trip" onclick="openTrip('${t.id}')"><div class="tp">${MTN}<b>${t.title}</b></div><div class="tb"><small>${k ? k.first + " · " : ""}${t.short} · ${t.place}</small><div class="tags"><span class="chip ${c}">${l}</span><span class="chip navy">${rwf(t.cost)}</span>${t.inst ? `<span class="chip navy">Instalments ${t.inst} of 3</span>` : ""}</div></div></div>`;
}
function goalCard(g) {
  const k = KIDS.find((x) => x.id === g.kid);
  return `<div class="card goal" onclick="openGoal('${g.id}')">${ringSvg(g.saved / g.target)}<div class="m"><b>${g.name}</b><small>${k ? k.first + " · " : ""}${rwf(g.saved)} of ${rwf(g.target)} · by ${g.by}</small><small>${g.auto ? `Auto-save ${rwf(g.weekly)} a week` : "Manual saving"}</small></div><span style="color:var(--muted)">›</span></div>`;
}
function openTrips() {
  const k = kid();
  const mine = tripsOf(k);
  pushPanel({
    k: "ShuleTrip",
    t: "School trips",
    s: "Approved trips, consent, payment and savings",
    b: `${src("ShuleTrip · approved by the education authority")}
 <div class="lbl2" style="margin-top:4px">${k.first}’s trips</div>${mine.length ? mine.map(tripCard).join("") : '<p class="qlnote">No trips planned for ' + k.first + " yet.</p>"}
 ${
   TRIPS.filter((t) => t.kid !== k.id && KIDS.some((x) => x.id === t.kid))
     .length
     ? `<div class="lbl2" style="margin-top:16px">Other children</div>${TRIPS.filter(
         (t) => t.kid !== k.id && KIDS.some((x) => x.id === t.kid),
       )
         .map(tripCard)
         .join("")}`
     : ""
 }
 <div class="sec" style="margin-top:20px"><h3>Trip savings goals</h3><a onclick="newGoal()">New goal</a></div>
 <div class="tip">${svgI('<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/>')}<span>Save a little every week for any trip, and pay the school straight from your savings when the trip is announced.</span></div>
 ${GOALS.map(goalCard).join("")}
 <button class="bigbtn amber" onclick="newGoal()">Start a trip savings goal</button>
 ${card(
   "Past trips",
   tbl(
     ["Trip", "Child", "Status"],
     [
       [
         "S2 visit to Akagera",
         "Keza",
         '<span class="chip green">Completed · Jun 2026</span>',
       ],
       [
         "P6 trip to Nyungwe",
         "Keza",
         '<span class="chip green">Completed · 2024</span>',
       ],
     ],
   ),
 )}`,
  });
}
function openTrip(id) {
  const t = TRIPS.find((x) => x.id === id),
    k = KIDS.find((x) => x.id === t.kid);
  const [c, l] = tStatus(t);
  const g = GOALS.find((x) => x.kid === t.kid);
  pushPanel({
    k: "ShuleTrip · " + t.ref,
    t: t.title,
    s: (k ? k.first + " · " : "") + t.date,
    b: `${src("ShuleTrip · " + t.approved)}
  <div class="card trip" style="cursor:default;margin-top:0"><div class="tp">${MTN}<b>${t.place}</b></div><div class="tb"><small>Depart ${t.depart} · back ${t.ret} · ${t.students} students · ${t.staff} staff</small><div class="tags"><span class="chip ${c}">${l}</span><span class="chip green">Approved by the authority</span></div></div></div>
  ${card(
    "What you need to do",
    [
      [
        !!t.consent,
        "Give consent",
        t.consent
          ? `Signed by ${t.consent.by} · ${t.consent.at}`
          : "Review the trip and sign",
        t.consent
          ? ""
          : `<button class="chip amber" onclick="tripConsent('${t.id}')">Sign</button>`,
      ],
      [
        !!t.consent,
        "Confirm health and emergency details",
        t.consent ? "Confirmed with consent" : "Part of the consent form",
        "",
      ],
      [
        t.paid >= t.cost,
        "Pay the trip fee",
        t.paid >= t.cost
          ? `Paid ${rwf(t.cost)}`
          : `${rwf(t.cost - t.paid)} left · due ${t.due}`,
        t.paid >= t.cost
          ? ""
          : `<button class="chip red" onclick="tripPay('${t.id}')">Pay</button>`,
      ],
      [
        t.day >= 3,
        "Follow the trip on the day",
        "Live updates from the trip leader",
        '<button class="chip navy" onclick="tripDay(\'' +
          t.id +
          "')\">Preview</button>",
      ],
    ]
      .map(
        ([ok, ti, su, b], i) =>
          `<div class="task ${ok ? "ok" : ""}"><span class="n">${ok ? "✓" : i + 1}</span><div><b>${ti}</b><small>${su}</small></div>${b}</div>`,
      )
      .join(""),
  )}
  ${card("Plan for the day", t.plan.map(([h, w]) => `<div class="hw"><div class="d"><b style="font-size:12px">${h}</b></div><div class="m"><b>${w}</b></div></div>`).join(""))}
  ${card("Cost", tbl(["Item", "RWF"], [...t.items.map(([a, b]) => [a, fmt(b)]), ["<b>Total</b>", "<b>" + fmt(t.cost) + "</b>"]]))}
  ${card(
    "Safety",
    tbl(
      ["", ""],
      [
        ["Trip leader", t.leader[0]],
        ["Supervising staff", t.staff + " teachers"],
        ["Health", t.nurse],
        ["Insurance", "Included for every student"],
        ["Approval", t.approved],
      ],
    ) +
      `<a class="erp" style="margin-top:12px" href="tel:${t.leader[1]}" onclick="toast('Calling ${t.leader[0].split(" ")[0]}')"><span class="ci">${svgI(PHONE)}</span><div><b>Call the trip leader</b><small>${t.leader[0]}</small></div></a>`,
  )}
  ${card("What to pack", t.pack.map((p) => ev("navy", p)).join(""))}
  ${!t.consent ? `<button class="bigbtn amber" onclick="tripConsent('${t.id}')">Give consent</button>` : t.paid < t.cost ? `<button class="bigbtn" onclick="tripPay('${t.id}')">Pay ${rwf(t.cost - t.paid)}</button>` : ""}`,
  });
}
const tripRe = (id) => {
  popPanel();
  setTimeout(() => {
    openTrip(id);
  }, 60);
  renderAll();
};
let TC = { step: 0, id: null, pick: "school" };
function tripConsent(id) {
  TC = { step: 0, id, pick: "school" };
  tcStep();
}
function tcStep() {
  const t = TRIPS.find((x) => x.id === TC.id),
    k = KIDS.find((x) => x.id === t.kid);
  const S = ["Review", "Health", "Return", "Sign"];
  const B = [
    () =>
      `<div class="rev"><div class="rr"><span>Trip</span><b>${t.title}</b></div><div class="rr"><span>Where</span><b>${t.place}</b></div><div class="rr"><span>When</span><b>${t.date} · ${t.depart}–${t.ret}</b></div><div class="rr"><span>Cost</span><b>${rwf(t.cost)}</b></div><div class="rr"><span>Supervision</span><b>${t.staff} staff · ${t.leader[0]}</b></div></div><p class="qlnote">Approved through ShuleTrip by the ${t.approved.split(" · ")[0]}.</p>`,
    () =>
      `<p class="lead">Taken from ${k.first}’s school profile. Update anything the trip leader should know.</p><div class="lbl2">Allergies</div><div class="chips"><button class="on">None known</button><button onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">Yes, add details</button></div><div class="lbl2">Medication to carry</div><textarea placeholder="e.g. inhaler, travel sickness tablets"></textarea><div class="lbl2">Emergency contact on the day</div><div class="gnum me">${PARENT.n} · ${PARENT.ph}</div>`,
    () =>
      `<p class="lead">How does ${k.first} get home after the trip?</p>${[
        [
          "school",
          k.type === "Boarder"
            ? "Returns to the dormitory with the group"
            : "Back at school, usual transport",
        ],
        ["me", "I will collect " + k.first + " at school at " + t.ret],
        ["other", "Someone else will collect " + k.first],
      ]
        .map(
          ([v, l]) =>
            `<div class="opt ${TC.pick === v ? "on" : ""}" onclick="TC.pick='${v}';tcStep()"><i></i>${l}</div>`,
        )
        .join(
          "",
        )}${TC.pick === "other" ? '<input class="txt" style="width:100%;height:44px;border:1.5px solid var(--line);border-radius:13px;padding:0 12px;margin-top:10px;font-family:inherit" placeholder="Name and phone of the person collecting">' : ""}`,
    () =>
      `<div class="chan on" onclick="this.classList.toggle('on')"><span class="ci">${svgI('<path d="M9 11l3 3L22 4"/>')}</span><div><b>I give consent</b><small>I allow ${k.first} to take part in the ${t.title} on ${t.short}, and I have read the plan and safety measures.</small></div><span class="sw"></span></div><p class="qlnote">Signing sends a one-time code to ${mask(MYPHONE)} as your signature.</p>`,
  ];
  const last = TC.step === 3;
  openSheet(`<div class="wzh"><small>Trip consent · Step ${TC.step + 1} of 4</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">${["Review the trip", "Health and emergency", "After the trip", "Sign"][TC.step]}</h3>
  <div class="wz-prog">${S.map((_, i) => `<i class="${i < TC.step ? "on" : i === TC.step ? "cur" : ""}"></i>`).join("")}</div><div style="margin-top:12px">${B[TC.step]()}</div>
  <div style="display:flex;gap:8px;margin-top:16px">${TC.step ? '<button class="go" style="background:var(--bg);color:var(--navy);flex:1" onclick="TC.step--;tcStep()">Back</button>' : ""}<button class="go" style="flex:2" onclick="${last ? `TRIPS.find(x=>x.id==='${t.id}').consent={by:'${PARENT.n}',at:'Today'};closeSheet();tripRe('${t.id}');toast('Consent signed · the school has been told')` : "TC.step++;tcStep()"}">${last ? "Sign with code" : "Continue"}</button></div>`);
}
function tripPay(id) {
  const t = TRIPS.find((x) => x.id === id),
    left = t.cost - t.paid,
    g = GOALS.find((x) => x.kid === t.kid),
    inst = Math.ceil(t.cost / 3 / 100) * 100;
  openSheet(`<h3>Pay the trip fee</h3><p class="lead">${t.title} · ${rwf(left)} left · due ${t.due}</p>
  <div class="chan on" data-o="full" onclick="this.parentNode.querySelectorAll('.chan').forEach(c=>c.classList.toggle('on',c===this))"><span class="ci">${svgI('<path d="M20 6 9 17l-5-5"/>')}</span><div><b>Pay in full</b><small>${rwf(left)} now by mobile money or card</small></div><span class="sw"></span></div>
  <div class="chan" data-o="inst" onclick="this.parentNode.querySelectorAll('.chan').forEach(c=>c.classList.toggle('on',c===this))"><span class="ci">${svgI('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>')}</span><div><b>3 instalments</b><small>${rwf(inst)} now, then on 31 Oct and ${t.due}</small></div><span class="sw"></span></div>
  ${g ? `<div class="chan" data-o="goal" onclick="this.parentNode.querySelectorAll('.chan').forEach(c=>c.classList.toggle('on',c===this))"><span class="ci">${svgI('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>')}</span><div><b>Use trip savings</b><small>${g.name} · ${rwf(g.saved)} saved</small></div><span class="sw"></span></div>` : ""}
  <button class="go" onclick="(()=>{const o=document.querySelector('#sheet .chan.on').dataset.o;const t=TRIPS.find(x=>x.id==='${id}');if(o==='full'){t.paid=t.cost}else if(o==='inst'){t.inst=1;t.paid=Math.min(t.cost,t.paid+${inst})}else{const g=GOALS.find(x=>x.kid===t.kid);const u=Math.min(g.saved,t.cost-t.paid);g.saved-=u;t.paid+=u}closeSheet();tripRe('${id}');toast(o==='goal'?'Paid from your trip savings':o==='inst'?'First instalment paid · reminders set':'Trip fee paid · receipt sent')})()">Continue</button>`);
}
function tripDay(id) {
  const t = TRIPS.find((x) => x.id === id),
    k = KIDS.find((x) => x.id === t.kid);
  openSheet(`<h3>On the day · ${t.short}</h3><p class="lead">Live updates from the trip leader and ShuleCard taps on the bus.</p>
  <div class="card" style="box-shadow:none;border:1px solid var(--line)"><div class="vstep">${[
    [
      "ok",
      `${k.first} boarded Bus 1`,
      t.depart.replace(":30", ":24") + " · ShuleCard tap",
    ],
    ["ok", "Arrived", "08:41 · all " + t.students + " students counted"],
    ["cur", "Now: " + t.plan[4][1], "Trip leader update 14:05"],
    ["", "Departing for school", "16:00"],
    ["", "Back at school", "ETA " + t.ret],
  ]
    .map(
      ([s, a, b]) => `<div class="${s}"><b>${a}</b><small>${b}</small></div>`,
    )
    .join("")}</div></div>
  <a class="erp" style="margin-top:12px" href="tel:${t.leader[1]}"><span class="ci">${svgI(PHONE)}</span><div><b>Call the trip leader</b><small>${t.leader[0]}</small></div></a><p class="qlnote">This is a preview. On the trip day these updates arrive as notifications.</p>`);
}
let NG = { kid: null, for: "any", target: 50000, months: 3, auto: true };
function _w0_newGoal() {
  NG.kid = kid().id;
  goalStep();
}
function _w0_goalStep() {
  const wk = Math.ceil(NG.target / (NG.months * 4.3) / 100) * 100;
  openSheet(`<div class="wzh"><small>Trip savings goal</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">Save for a trip</h3>
  <div class="lbl2" style="margin-top:12px">For</div><div class="chips">${KIDS.map((x) => `<button class="${NG.kid === x.id ? "on" : ""}" onclick="NG.kid='${x.id}';goalStep()">${x.first}</button>`).join("")}</div>
  <div class="lbl2">Saving for</div><div class="chips">${[
    ["any", "Any future trip"],
    ["t1", "S3 field trip · 14 Nov"],
    ["tour", "S4 tour 2027"],
  ]
    .map(
      ([v, l]) =>
        `<button class="${NG.for === v ? "on" : ""}" onclick="NG.for='${v}';${v === "t1" ? "NG.target=45000;NG.months=1" : v === "tour" ? "NG.target=120000;NG.months=8" : ""};goalStep()">${l}</button>`,
    )
    .join("")}</div>
  <div class="lbl2">Target</div><div class="amt">${[30000, 50000, 120000, 200000].map((v) => `<button class="${NG.target === v ? "on" : ""}" onclick="NG.target=${v};goalStep()">${fmt(v / 1000)}K</button>`).join("")}</div>
  <div class="lbl2">Reach it in</div><div class="chips">${[1, 3, 6, 8, 12].map((m) => `<button class="${NG.months === m ? "on" : ""}" onclick="NG.months=${m};goalStep()">${m} month${m > 1 ? "s" : ""}</button>`).join("")}</div>
  <div class="fac" style="margin-top:14px;padding:14px"><small>You save</small><div class="big" style="font-size:22px">${rwf(wk)} <span>a week</span></div></div>
  <div class="chan ${NG.auto ? "on" : ""}" style="margin-top:10px" onclick="NG.auto=!NG.auto;goalStep()"><span class="ci">${svgI('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>')}</span><div><b>Auto-save every Friday</b><small>MTN MoMo · ${mask(MYPHONE)}</small></div><span class="sw"></span></div>
  <button class="go" onclick="createGoal(${wk})">Start saving</button>`);
}
function _w0_createGoal(wk) {
  GOALS.push({
    id: "g" + (GOALS.length + 1),
    kid: NG.kid,
    name:
      NG.for === "t1"
        ? "S3 field trip"
        : NG.for === "tour"
          ? "S4 tour 2027"
          : "Any future trip",
    target: NG.target,
    saved: 0,
    weekly: wk,
    by: NG.months + " month" + (NG.months > 1 ? "s" : ""),
    auto: NG.auto,
  });
  closeSheet();
  PST.slice().forEach((p) => {
    if (p.o.t === "School trips") {
      popPanel();
    }
  });
  setTimeout(openTrips, 80);
  renderAll();
  toast("Savings goal created");
}
function openGoal(id) {
  const g = GOALS.find((x) => x.id === id),
    k = KIDS.find((x) => x.id === g.kid);
  openSheet(`<h3>${g.name}</h3><p class="lead">${k.first} · ${rwf(g.saved)} of ${rwf(g.target)} · by ${g.by}</p>
  <div style="display:flex;justify-content:center;margin:12px 0">${ringSvg(
    g.saved / g.target,
  )
    .replace(/width="64" height="64"/, 'width="110" height="110"')
    .replace(
      'class="ring"',
      'class="ring" style="width:110px;height:110px"',
    )}</div>
  ${tbl(
    ["", ""],
    [
      ["Weekly saving", rwf(g.weekly) + (g.auto ? " · auto" : "")],
      ["Left to save", rwf(g.target - g.saved)],
      ["Money stays", "In your yoShule savings wallet"],
    ],
  )}
  <button class="go" onclick="(()=>{const g=GOALS.find(x=>x.id==='${id}');g.saved=Math.min(g.target,g.saved+${g.weekly});closeSheet();renderAll();toast('Added ${rwf(g.weekly)} to your goal')})()">Add ${rwf(g.weekly)} now</button>
  <button class="go" style="margin-top:8px;background:var(--bg);color:var(--navy)" onclick="(()=>{const g=GOALS.find(x=>x.id==='${id}');g.auto=!g.auto;closeSheet();toast(g.auto?'Auto-save on':'Auto-save paused')})()">${g.auto ? "Pause auto-save" : "Turn on auto-save"}</button>`);
}

/* =========================================================
   v6 · absence calendar · working QR scan · student profile · add child via 1234
   ========================================================= */
POOL[0].sdms = "1234";
POOL[1].sdms = "5678";
/* ---- avatars (illustrated, until the school photo syncs) ---- */
const AVC = {
  keza: ["#FFE3B0", "#3B2416", "girl"],
  ganza: ["#D7E3FF", "#2A1A10", "boy"],
  teta: ["#E3F6EE", "#2E1C12", "girl"],
  diane: ["#FDE7E8", "#2E1C12", "girl"],
};
function defaultAvatarSvg(k) {
  if (!k) return "";
  const isGirl =
    k.gender === "FEMALE" ||
    k.gender === "girl" ||
    (AVC[k.id] && AVC[k.id][2] === "girl");
  const [bg, skin] =
    AVC[k.id] || (isGirl ? ["#FFE3B0", "#4D2C19"] : ["#E7ECF7", "#3B2416"]);
  const g = isGirl ? "girl" : "boy";
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><rect width="100" height="100" fill="${bg}"/>
 <path d="M18 100c2-20 16-30 32-30s30 10 32 30z" fill="#13213D"/><path d="M40 72l10 12 10-12z" fill="#fff"/><path d="M47 76h6l-1 14h-4z" fill="#F5A623"/>
 <rect x="43" y="56" width="14" height="16" rx="6" fill="#6B4430"/>
 <ellipse cx="50" cy="44" rx="17" ry="19" fill="#7A4E36"/>
 ${g === "girl" ? `<path d="M31 44c0-16 9-24 19-24s19 8 19 24c-3-8-8-12-19-12s-16 4-19 12z" fill="${skin}"/><circle cx="50" cy="20" r="7" fill="${skin}"/>` : `<path d="M33 40c0-12 8-19 17-19s17 7 17 19c-4-6-9-8-17-8s-13 2-17 8z" fill="${skin}"/>`}
 <circle cx="43.5" cy="45" r="2" fill="#1B120C"/><circle cx="56.5" cy="45" r="2" fill="#1B120C"/><path d="M44 53c3 3 9 3 12 0" stroke="#1B120C" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
}
function avatar(k) {
  if (!k) return "";
  const photo = k.photo || k.avatarUrl;
  if (photo) {
    return `<img src="${photo}" alt="${k.first || "Student"}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';"><span style="display:none;width:100%;height:100%">${defaultAvatarSvg(k)}</span>`;
  }
  return defaultAvatarSvg(k);
}
function qrSvg(seed, n = 21, px = 4) {
  let x = seed * 9301 + 49297;
  const r = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  let cells = "";
  const fin = (a, b) =>
    `<rect x="${a}" y="${b}" width="${7 * px}" height="${7 * px}" fill="#13213D"/><rect x="${a + px}" y="${b + px}" width="${5 * px}" height="${5 * px}" fill="#fff"/><rect x="${a + 2 * px}" y="${b + 2 * px}" width="${3 * px}" height="${3 * px}" fill="#13213D"/>`;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if ((i < 8 && j < 8) || (i < 8 && j > n - 9) || (i > n - 9 && j < 8))
        continue;
      if (r() > 0.55)
        cells += `<rect x="${j * px}" y="${i * px}" width="${px}" height="${px}" fill="#13213D"/>`;
    }
  return `<svg width="${n * px}" height="${n * px}" viewBox="0 0 ${n * px} ${n * px}"><rect width="100%" height="100%" fill="#fff"/>${cells}${fin(0, 0)}${fin((n - 7) * px, 0)}${fin(0, (n - 7) * px)}</svg>`;
}
/* show avatars in child chips */
function hero(title, sub) {
  return hero0(title, sub);
}
/* ---- 1. report absence with a date picker ---- */
let RA = { child: 0, when: "tomorrow", dates: [], reason: "Sick", note: "" };
const dkey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAYS = (() => {
  const out = [];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  while (out.length < 28) {
    if (date.getDay() > 0 && date.getDay() < 6) out.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return out;
})();
const TODAYK = dkey(new Date());
const NEXT_SCHOOL_DAY = (() => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6)
    date.setDate(date.getDate() + 1);
  return date;
})();
const dateFromKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const monthName = (date) =>
  date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const DAYS_RANGE =
  monthName(DAYS[0]) === monthName(DAYS.at(-1))
    ? monthName(DAYS[0])
    : `${monthName(DAYS[0])} – ${monthName(DAYS.at(-1))}`;
const dfmt = (d) =>
  d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
function reportAbsence() {
  RA = { child: K, when: "tomorrow", dates: [], reason: "Sick", note: "" };
  raDraw();
}
function raDraw() {
  const pick = RA.when === "pick";
  const sel = RA.when === "tomorrow" ? [dkey(NEXT_SCHOOL_DAY)] : RA.dates;
  openSheet(`<h3>Report an absence</h3><p class="lead">The class teacher and the school office are told straight away.</p>
 <div class="lbl2" style="margin-top:14px">Child</div><div class="chips">${KIDS.map((x, i) => `<button class="${i === RA.child ? "on" : ""}" onclick="RA.child=${i};raDraw()">${x.first}</button>`).join("")}</div>
 <div class="lbl2">When</div><div class="chips">${[
   ["tomorrow", `Next school day · ${dfmt(NEXT_SCHOOL_DAY)}`],
   ["pick", "Pick dates"],
 ]
   .map(
     ([v, l]) =>
       `<button class="${RA.when === v ? "on" : ""}" onclick="RA.when='${v}';raDraw()">${l}</button>`,
   )
   .join("")}</div>
 ${
   pick
     ? `<div class="rcal"><div class="mh">${DAYS_RANGE}<small>${RA.dates.length ? RA.dates.length + " day" + (RA.dates.length > 1 ? "s" : "") + " selected" : "Tap the days"}</small></div><div class="g">${["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => `<div class="hd">${d}</div>`).join("")}${DAYS.map(
         (d) => {
           const k = dkey(d);
           const past = k < TODAYK;
           return `<button class="${RA.dates.includes(k) ? "on" : ""} ${k === TODAYK ? "today" : ""}" ${past ? "disabled" : ""} onclick="(a=>a.includes('${k}')?a.splice(a.indexOf('${k}'),1):a.push('${k}'))(RA.dates);RA.dates.sort();raDraw()">${d.getDate()}<small>${d.toLocaleDateString("en-GB", { month: "short" })}</small></button>`;
         },
       ).join("")}</div></div>`
     : ""
 }
 ${sel.length ? `<div class="gnum me" style="margin-top:10px">${sel.map((k) => dfmt(dateFromKey(k))).join(" · ")}</div>` : ""}
 <div class="lbl2">Reason</div><div class="chips">${["Sick", "Medical appointment", "Family", "Other"].map((r) => `<button class="${RA.reason === r ? "on" : ""}" onclick="RA.reason='${r}';raDraw()">${r}</button>`).join("")}</div>
 <textarea placeholder="Optional note to the school" oninput="RA.note=this.value">${RA.note}</textarea>
 <button class="go" style="${sel.length ? "" : "opacity:.35;pointer-events:none"}" onclick="submitAbsence()">Send to school</button>`);
}
function submitAbsence() {
  const child = KIDS[RA.child];
  const dates =
    RA.when === "tomorrow" ? [dkey(NEXT_SCHOOL_DAY)] : [...RA.dates];
  if (!child || !dates.length) return;
  closeSheet();
  void window.raSubmitReal(RA.reason, dates, RA.note, child.id);
}
/* ---- 2. QR scan that really completes ---- */
let SC = null;
function scanQR(target, cb, label) {
  SC = { target, cb };
  const t = target;
  openSheet(`<div class="wzh"><small>Scan ShuleCard</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">Point at the QR code</h3><p class="lead">Find it on the back of the ShuleCard or on the report card.</p>
 <div class="scan" id="scanbox"><div class="cam"></div><div class="qr">${qrSvg(t.cardno.length + t.first.length, 21, 5).replace("<svg", '<svg style="width:100%;height:100%"')}</div><div class="box"><i></i><i></i><i></i><i></i><div class="line"></div></div><div class="msg">Looking for a ShuleCard…</div></div>
 <div id="scanres"></div>`);
  setTimeout(() => {
    const b = $("#scanbox");
    if (!b || SC == null) return;
    b.classList.add("hit");
    b.querySelector(".msg").textContent = "ShuleCard found";
    $("#scanres").innerHTML =
      `<div class="found"><div class="r"><span class="av" style="overflow:hidden;padding:0">${avatar(t)}</span><div><b>${t.n}</b><small>${t.cls} · ${t.cardno} · Umucyo SS</small></div></div></div><button class="go" onclick="(()=>{const c=SC.cb;SC=null;c()})()">${label || "Continue"}</button>`;
  }, 1800);
}
/* Get Babyeyi: scan → student → Babyeyi */
const _bbStep = bbStep0;
function bbStep() {
  _bbStep();
  if (BB.step === 1) {
    const b = [...document.querySelectorAll("#sheet .codein button")].pop();
    if (b) b.setAttribute("onclick", "bbScan()");
    const inp = document.querySelector("#sheet .codein input");
    if (inp) {
      inp.id = "bbq";
      inp.placeholder = "SDMS code / ShuleCard no.";
      inp.insertAdjacentHTML("afterend", "");
    }
  }
}
function bbScan() {
  const t = KIDS[(BB.child + 1) % KIDS.length];
  scanQR(
    t,
    () => {
      BB.child = KIDS.indexOf(t);
      BB.step = 2;
      bbStep();
      toast("Babyeyi for " + t.first);
    },
    "Get " + t.first + "’s Babyeyi",
  );
}
/* Pay fees: scan button inside step 1 */
const _pfStep = pfStep0;
function pfStep() {
  _pfStep();
  if (PF.step === 0) {
    const box = document.querySelectorAll("#sheet .boxc")[1];
    if (box && !box.querySelector(".scanbtn"))
      box.insertAdjacentHTML(
        "beforeend",
        `<button class="go scanbtn" style="margin-top:10px;background:var(--bg);color:var(--navy);height:42px;font-size:12px" onclick="pfScan()">Scan ShuleCard QR</button>`,
      );
  }
}
function pfScan() {
  const t = KIDS[(PF.child ?? 0) === 1 ? 0 : 1] || KIDS[0];
  scanQR(
    t,
    () => {
      PF.child = KIDS.indexOf(t);
      PF.items = unpaid(t).map(([j]) => j);
      PF.amt = 0;
      pfStep();
      toast("Found " + t.n);
    },
    "Pay fees for " + t.first,
  );
}
/* ---- 3. Add a child using the public lookup and claim APIs ---- */
const escapeLinkValue = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
function lkStep() {
  if (LK.step === 0) {
    openSheet(`<div class="wzh"><small>Add a child · Step 1 of 3</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">Find your child</h3><p class="lead">Enter the student’s SDMS code or ShuleCode. We’ll check the school’s live records.</p><div class="sdmsin" style="margin-top:12px"><span class="ic">${svgI('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}</span><input id="lkq" placeholder="SDMS code / ShuleCode" value="${escapeLinkValue(LK.q)}" onkeydown="if(event.key==='Enter')lkFind()"><button class="go2" onclick="lkFind()" aria-label="Search">${svgI('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button></div><div id="lk-error" role="alert"></div>`);
    return;
  }
  const child = POOL[LK.hit];
  if (!child) {
    LK.step = 0;
    lkStep();
    return;
  }
  if (LK.step === 1) {
    const parentName = String(PARENT?.n || "").trim().split(/\s+/);
    const firstName = LOGGED ? PARENT?.first || parentName[0] || "" : "";
    const lastName = parentName.slice(1).join(" ");
    openSheet(`<div class="wzh"><small>Add a child · Step 2 of 3</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">Confirm guardian details</h3><div class="found" style="margin-top:12px"><div class="r"><span class="av">${escapeLinkValue(ini(child.first, child.n))}</span><div><b>${escapeLinkValue(child.n)}</b><small>${escapeLinkValue(child.cls)} · ${escapeLinkValue(child.schoolName || "School record")}</small></div></div></div><p class="lead">These details will be used to create or match your guardian record at the school.</p><div class="lbl2">First name</div><input id="lk-first" class="txt" value="${escapeLinkValue(firstName)}" autocomplete="given-name"><div class="lbl2">Last name</div><input id="lk-last" class="txt" value="${escapeLinkValue(LOGGED ? lastName : "")}" autocomplete="family-name"><div class="lbl2">Phone number</div><input id="lk-phone" class="txt" type="tel" inputmode="tel" autocomplete="tel" value="${escapeLinkValue(LOGGED ? PARENT?.ph || "" : "")}" placeholder="Phone saved at school"><div class="lbl2">Email <small>Optional</small></div><input id="lk-email" class="txt" type="email" autocomplete="email" value="${escapeLinkValue(LOGGED ? PARENT?.email || "" : "")}" placeholder="name@example.com"><div class="lbl2">Relationship</div><select id="lk-role" class="txt"><option value="GUARDIAN">Parent / guardian</option><option value="FATHER">Father</option><option value="MOTHER">Mother</option></select><label class="qlnote" style="display:flex;gap:8px;align-items:flex-start"><input id="lk-confirm" type="checkbox" style="margin-top:2px"> I confirm I am this student’s parent or guardian.</label><div id="lk-error" role="alert"></div><button class="go" id="lk-submit" onclick="lkDone()">Confirm and add child</button>`);
    return;
  }
  openSheet(`<div class="wzh"><small>Add a child · Step 3 of 3</small><button onclick="closeSheet()">✕</button></div><div class="wdone" style="padding:16px 10px 8px"><div class="em">${svgI('<path d="M20 6 9 17l-5-5"/>').replace("<svg", '<svg width="34" height="34" fill="none" stroke="#13213D" stroke-width="2.6"')}</div><h3>${escapeLinkValue(child.first)}’s guardian record was saved</h3><p>${LK.synced ? "The child is now available in your account." : `Sign in to Parent Portal using ${escapeLinkValue(LK.phone)} to access this child’s information.`}</p></div><button class="go" onclick="closeSheet()">Done</button>`);
}
/* landing: Find a child · Add child runs the full process */
const _renderLanding = renderLanding0;
function _v0_renderLanding() {
  _renderLanding();
  const L = $("#login");
  L.querySelectorAll(".sdms b.t").forEach(
    (b) => (b.textContent = "Find a child"),
  );
  const add = L.querySelector(".kc.add");
  if (add) add.setAttribute("onclick", "linkChild()");
  L.querySelectorAll(".kc .av").forEach((a, i) => {
    const sv = SAVED.map((id) => KIDS.find((k) => k.id === id)).filter(Boolean);
    if (sv[i]) a.innerHTML = avatar(sv[i]);
  });
  const f = L.querySelector(".found .av");
  if (f && FOUND != null && FOUND >= 0) f.innerHTML = avatar(KIDS[FOUND]);
  if (!SAVED.length) {
    const s = L.querySelector(".sdms");
    if (s && !L.querySelector(".addcta"))
      s.insertAdjacentHTML(
        "afterend",
        `<button class="kc add addcta" style="width:100%;flex-direction:row;height:52px" onclick="linkChild()"><span>+</span>Add a child to my account</button>`,
      );
  }
}
/* ---- 4. student profile that is clearly the child's ---- */
function openProfile_p10() {
  const k = kid();
  const g = k.guardians || [MYPHONE];
  pushPanel({
    k: "Student profile",
    t: k.n,
    s: k.cls + "",
    b: `
  <div class="prof"><div class="ph">${avatar(k)}</div><h2>${k.n}</h2><p>${k.cls} · ${k.lvl} · Class teacher ${k.ct}</p>
   <div class="chips2"><span class="a">Active</span><span>${k.type}</span><span>Conduct ${k.conduct}/100</span></div>
   <div class="codes"><div><small>SDMS</small><b>${k.sdms}</b></div><div><small>SHULECARD</small><b>${k.cardno}</b></div><div><small>SCHOOL CODE</small><b>${k.code}</b></div></div></div>
  <div class="scard"><span class="cp">${avatar(k)}</span><div class="m"><small>SHULECARD · UMUCYO SS</small><b>${k.n}</b><span>${k.cardno}</span><span style="letter-spacing:0;font-size:11px;margin-top:6px">Balance ${rwf(k.card)}</span></div><span class="qrw">${qrSvg(k.cardno.length + k.first.length, 21, 3)}</span></div>
  <p class="qlnote" style="text-align:center">Show this QR at the school office, canteen or bus if the card is lost.</p>
  ${card(
    "Personal details",
    tbl(
      ["", ""],
      [
        ["Full name", k.n],
        ["Class", k.cls + " · " + k.lvl],
        ["Class teacher", k.ct],
        ["Student type", k.type],
      ],
    ),
  )}
  ${card("Registered guardian numbers", g.map((n) => `<div class="gnum ${n === MYPHONE ? "me" : ""}">${mask(n)}${n === MYPHONE ? "<span>You</span>" : ""}</div>`).join("") + `<p class="qlnote">Only these numbers receive codes and alerts for ${k.first}. To change or add a number, contact the school administration.</p>`)}
  ${
    k.bus
      ? card(
          "Transport",
          tbl(
            ["", ""],
            [
              ["Bus", `Bus ${k.bus.n} · ${k.bus.route}`],
              ["Pick-up", k.bus.pick],
              ["Driver", k.bus.drv],
            ],
          ),
        )
      : card(
          "Boarding",
          tbl(
            ["", ""],
            [
              ["Dormitory", k.dorm],
              ["Patron", k.patron],
            ],
          ),
        )
  }`,
  });
}
/* glance card shows the child's picture */
const _renderHome = renderHome0;
function renderHome() {
  _renderHome();
  const gh = document.querySelector("#v-home .glance .gh");
  if (gh) {
    const k = kid();
    gh.firstElementChild.outerHTML = `<div style="display:flex;align-items:center;cursor:pointer" onclick="openProfile()"><span class="pa">${avatar(k)}</span><b>${k.first} at a glance</b></div>`;
  }
}

const LOGO =
  "data:image/png;base64,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";
/* =========================================================
   v7 · quick actions for any found child (no link) · linked children with full details
   ========================================================= */
// Teta has a balance so the 1234 demo can be paid; Diane gets enough data for quick use
(() => {
  const t = POOL[0];
  t.feeLines = [
    ["Tuition, Term 3", "480,000", "480,000", "0"],
    ["Boarding, Term 3", "320,000", "170,000", "150,000"],
    ["Exam fees", "40,000", "40,000", "0"],
  ];
  t.fees = 150000;
  Object.assign(POOL[1], {
    lvl: "O-Level",
    type: "Day scholar",
    card: 1200,
    lastTop: ["12 Oct", 3000],
    fees: 95000,
    feeLines: [
      ["Tuition, Term 3", "480,000", "400,000", "80,000"],
      ["Lunch programme", "60,000", "45,000", "15,000"],
    ],
    kit: {
      for: "S3 (2027)",
      items: [
        ["Exercise books, 96 pages", 12, 600],
        ["Mentor pens (blue, black)", 10, 250],
        ["Geometry set", 1, 3500],
      ],
      shoe: "36",
      uni: "S",
    },
    cardtx: [["12 Oct 08:10", "Top-up · MTN MoMo", 3000]],
    today: {},
  });
})();
let G = null; // learner used for a quick action (not necessarily linked)
const kid = () => G || KIDS[K];
const paidOf = (k) => k.feeLines.reduce((a, l) => a + num(l[2]), 0);
let QSAVED = [];
try {
  QSAVED = JSON.parse(localStorage.getItem("sp_quick") || "[]");
} catch (e) {}
const saveQ = () => {
  try {
    localStorage.setItem("sp_quick", JSON.stringify(QSAVED));
  } catch (e) {}
};
const learnerById = (id) =>
  KIDS.find((k) => k.id === id) || POOL.find((k) => k.id === id);
let FOUNDL = null; // found learner object on the start page
function _w0_lookUp() {
  const v = ($("#sdmsq") || {}).value || "";
  LOOK = v;
  if (!v.trim()) {
    toast("Enter an SDMS code or ShuleCard number");
    return;
  }
  const r = findAny(v);
  FOUNDL = r ? (r.linked ? KIDS[r.i] : POOL[r.j]) : -1;
  renderLanding();
}
function quickDo(id, a) {
  const k = learnerById(id);
  G = k;
  if (a === "pay") {
    PF.step = 1;
    PF.child = -1;
    PF.items = unpaid(k).map(([j]) => j);
    PF.amt = 0;
    pfStep();
  } else if (a === "bby") {
    BB.step = 0;
    BB.child = -1;
    bbStep();
  } else topUp();
}
function quickSave(id) {
  if (!QSAVED.includes(id)) QSAVED.push(id);
  saveQ();
  FOUNDL = null;
  LOOK = "";
  renderLanding();
  toast(learnerById(id).first + " saved for quick payments");
}
function quickRemove(id) {
  QSAVED = QSAVED.filter((x) => x !== id);
  saveQ();
  renderLanding();
}
const QA = (id) =>
  `<div class="acts"><button onclick="quickDo('${id}','pay')">${svgI(IC.pay)}Pay fees</button><button onclick="quickDo('${id}','bby')">${svgI(IC.doc)}Get Babyeyi</button><button onclick="quickDo('${id}','top')">${svgI(IC.wallet)}Top up card</button></div>`;
// pay / Babyeyi flows accept the quick learner (PF.child / BB.child === -1)
const PFK = () => (PF.child === -1 ? G : KIDS[PF.child ?? 0]);
function enterConsole() {
  G = null;
  if (LOGGED) {
    SHOW = false;
    renderLanding();
    toast("Back in the parent console");
  } else loginPortal();
}
function showLanding() {
  G = null;
  SHOW = true;
  PST.slice().forEach(() => popPanel());
  closeSheet();
  renderLanding();
}
function renderLanding7() {
  const L = $("#login");
  const sv = SAVED.map((id) => KIDS.findIndex((k) => k.id === id)).filter(
    (i) => i >= 0,
  );
  if (LSEL != null && !sv.includes(LSEL)) LSEL = null;
  if (LSEL == null && sv.length) LSEL = sv[0];
  const f = FOUNDL,
    qs = QSAVED.map(learnerById).filter(Boolean);
  L.className = "land" + (SHOW ? "" : " gone");
  L.innerHTML = `<div class="top"><div class="logo"><img src="${LOGO}" alt="yoShule"></div><button class="lng" onclick="toast('Language: English · Ikinyarwanda · Français')">EN</button></div>
 <div class="lhead">${DECO}<h1>Equitable School Readiness</h1><p>Pay fees, get the Babyeyi and top up pocket money with any child’s code.</p></div>
 <div class="body">
  <div class="sdms"><b class="t">Find a child</b><small class="s">SDMS code or ShuleCard number</small>
   <div class="sdmsin"><span class="ic">${svgI('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}</span><input id="sdmsq" placeholder="e.g. SDM-2026-004821" value="${LOOK}" onkeydown="if(event.key==='Enter')lookUp()"><button class="go2" onclick="lookUp()">${svgI('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button></div>
   ${f === -1 ? `<div class="found" style="border-color:var(--red);background:#FDE7E8"><small style="color:#B4262B">No learner found for “${LOOK}”. Check the code on the ShuleCard or report card.</small></div>` : ""}
   ${
     f && f !== -1
       ? `<div class="found"><div class="r"><div style="flex:1"><b>${f.n}</b><small>${f.cls} </small></div></div>${QA(f.id)}
     <div class="links"><button onclick="quickSave('${f.id}')">${QSAVED.includes(f.id) ? "Saved" : "Save for quick payments"}</button>${KIDS.includes(f) ? '<span style="color:#12784F">Your child ✓</span>' : `<button onclick="linkChild('${f.sdms}')">My child? Add to my account</button>`}</div></div>`
       : ""
   }
   
  ${qs.length ? `<div class="lsec">Saved for quick payments<small>Fees · Babyeyi · Top up</small></div><div class="qlist">${qs.map((q) => `<div class="qrow"><div class="h"><b>${q.n}</b><small>${q.cls}</small><button class="x" onclick="quickRemove('${q.id}')">×</button></div>${QA(q.id)}</div>`).join("")}</div>` : ""}
  <div class="lsec">My children<small>${sv.length ? "Linked to your account" : ""}</small></div>
  ${
    sv.length
      ? `<div class="kidrow">${sv
          .map((i) => {
            const k = KIDS[i];
            return `<button class="kc ${LSEL === i ? "on" : ""}" onclick="LSEL=${i};renderLanding()"><span class="x" onclick="event.stopPropagation();unsaveKid('${k.id}')">×</span><b>${k.n}</b><small>${k.cls} · Umucyo SS</small>
    <div class="fees"><div class="ln"><span>RWF</span><span></span></div><div class="ln"><span>Fees paid</span><b style="color:var(--green)">${fmt(paidOf(k))}</b></div><div class="ln"><span>Balance</span><b style="color:${k.fees ? "var(--red)" : "var(--green)"}">${k.fees ? fmt(k.fees) : "Nil"}</b></div><div class="ln"><span>ShuleCard</span><b style="color:${k.card < 3000 ? "#9A5B00" : "var(--navy)"}">${fmt(k.card)}</b></div></div></button>`;
          })
          .join(
            "",
          )}<button class="kc add" onclick="linkChild()"><span>+</span>Add child</button></div>`
      : `<button class="kc add" style="width:100%;flex-direction:row;height:52px" onclick="linkChild()"><span>+</span>Add a child to my account</button>`
  }
  ${sv.length ? `<div class="lsec">What do you need?<small>For ${KIDS[LSEL].first}</small></div><div class="sgrid">${SVC.map(([a, l, ic, m]) => `<button class="sg ${m ? "main" : ""}" onclick="landDo('${a}')"><i>${svgI(ic)}</i>${l}</button>`).join("")}</div>` : ""}
  <button class="console" onclick="enterConsole()"><span class="ic">${svgI('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>')}</span><div><b>Enter parent console</b><small>Marks, attendance, homework, messages and more</small></div>${svgI('<path d="m9 18 6-6-6-6"/>')}</button>
  <div class="lfoot">powered by yoShule</div>
 </div>`;
}
function _w0_landDo(a) {
  if (a === "help") {
    toast("yoShule support · +250 793 903 847");
    return;
  }
  G = null;
  const sv = SAVED.map((id) => KIDS.findIndex((k) => k.id === id)).filter(
    (i) => i >= 0,
  );
  if (LSEL == null && sv.length) LSEL = sv[0];
  if (LSEL == null) {
    linkChild();
    return;
  }
  K = LSEL;
  if (a === "pay") payFees();
  else if (a === "bby") getBabyeyi();
  else if (a === "kit") kitSelect();
  else if (a === "top") topUp();
  else shopFor(a);
}
/* =========================================================
   v8 · found-child popup · richer My children cards · My goals · floating console button
   ========================================================= */

async function lookUp() {
  const v = ($("#sdmsq") || {}).value || "";
  LOOK = v;
  if (!v.trim()) {
    toast("Enter an SDMS code or ShuleCard number");
    return;
  }
  try {
    const f = await resolveLearner(v);
    if (!f) {
      FOUNDL = -1;
      renderLanding();
      toast("No student found for that code");
      return;
    }
    FOUNDL = null;
    renderLanding();
    foundPop(f);
  } catch (e) {
    FOUNDL = -1;
    renderLanding();
    toast("Student lookup failed. Check your connection.");
  }
}
function _z0_foundPop(f) {
  const mine = KIDS.includes(f);
  openSheet(`<div class="fpop"><div class="wzh"><small>Child found</small><button onclick="closeSheet()">✕</button></div>
  <div class="who"><span class="av">${ini(f.first, f.n)}</span><div><b>${f.n}</b><small>${f.cls} · Kigali Green Hills School · ${f.sdms}</small></div></div>
  <div class="lbl2" style="margin-top:16px">What would you like to do?</div>
  <div class="big3"><button onclick="closeSheet();setTimeout(()=>quickDo('${f.id}','pay'),60)"><i>${svgI(IC.pay)}</i>Pay fees</button><button onclick="closeSheet();setTimeout(()=>quickDo('${f.id}','bby'),60)"><i>${svgI(IC.doc)}</i>Get Babyeyi</button><button onclick="closeSheet();setTimeout(()=>quickDo('${f.id}','top'),60)"><i>${svgI(IC.wallet)}</i>Top up card</button></div>
  <div class="lk"><button style="background:var(--bg);color:var(--navy)" onclick="closeSheet();quickSave('${f.id}')">${QSAVED.includes(f.id) ? "Saved for quick use" : "Save for quick use"}</button>${mine ? '<button style="background:#E3F6EE;color:#12784F;pointer-events:none">Your child ✓</button>' : `<button style="background:var(--navy);color:#fff" onclick="linkChild('${f.sdms}')">Add to my account</button>`}</div>
  <p class="qlnote" style="text-align:center">No account needed for these. Add the child to your account to see marks, attendance and more.</p></div>`);
}
/* goals: ShuleKit savings + trip goals + anything else */
const GTYPE = [
  ["kit", "ShuleKit", IC.kit],
  [
    "trip",
    "School trip",
    '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 11h16M9 4v7M15 4v7M7.5 18v2M16.5 18v2"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
  ],
  [
    "other",
    "Something else",
    '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  ],
];
function kitGoalOf(k) {
  const e = KIT.enrolled[k.id];
  if (!e || e.plan !== "save") return null;
  const t = kitTotal(k),
    wk = Math.ceil(t / 8 / 100) * 100;
  return {
    id: "kit-" + k.id,
    kid: k.id,
    name: "ShuleKit · Term 1 2027",
    target: t,
    saved: Math.min(t, e.weeks * wk),
    weekly: wk,
    by: "15 Dec",
    auto: true,
    type: "kit",
  };
}
function allGoals() {
  return [
    ...KIDS.map(kitGoalOf).filter(Boolean),
    ...GOALS.map((g) => ({ type: g.type || "trip", ...g })),
  ];
}
function openGoals() {
  const k = kid();
  const gs = allGoals();
  const tot = gs.reduce((a, g) => a + g.saved, 0);
  const body = `<div class="fac" style="padding:14px"><small>Saved for your children</small><div class="big" style="font-size:24px">${rwf(tot)}</div><div class="row"><span>${gs.length} goal${gs.length === 1 ? "" : "s"}<b>${gs.filter((g) => g.auto).length} on auto-save</b></span></div></div>
  <div class="card" style="margin-top:10px">${
    gs.length
      ? gs
          .map((g) => {
            const c = learnerById(g.kid);
            const ic = (GTYPE.find((t) => t[0] === g.type) || GTYPE[2])[2];
            return `<div class="goalrow" onclick="${g.type === "kit" ? `closeSheet();K=KIDS.findIndex(x=>x.id==='${g.kid}');go('kit');setTimeout(()=>kitDetail(K),80)` : `openGoal('${g.id}')`}" style="cursor:pointer">${ringSvg(g.saved / g.target)}<div class="m"><b>${g.name}</b><small>${c ? c.first + " · " : ""}${rwf(g.saved)} of ${rwf(g.target)}</small><small>${g.auto ? `Auto-save ${rwf(g.weekly)} a week` : "Manual saving"} · by ${g.by}</small></div><span style="color:var(--muted)">›</span></div>`;
          })
          .join("")
      : '<p class="qlnote" style="text-align:center">No goals yet.</p>'
  }</div>
  <button class="go" onclick="newGoal()">New goal</button>`;
  openSheet(
    `<div class="wzh"><small>My goals</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">Saving for your children</h3><p class="lead">ShuleKit, school trips and anything else your child needs. Save a little every week.</p><div style="margin-top:12px">${body}</div>`,
  );
}
NG.type = "trip";
function newGoal() {
  NG.kid = (G || kid()).id;
  goalStep();
}
function goalStep() {
  const wk = Math.ceil(NG.target / (NG.months * 4.3) / 100) * 100;
  const forOpts =
    NG.type === "kit"
      ? [["kitT1", "Term 1 2027 kit"]]
      : NG.type === "trip"
        ? [
            ["any", "Any future trip"],
            ["t1", "S3 field trip · 14 Nov"],
            ["tour", "S4 tour 2027"],
          ]
        : [
            ["laptop", "Laptop for school"],
            ["uniform", "New uniform"],
            ["fees", "Next term’s fees"],
          ];
  if (!forOpts.find((o) => o[0] === NG.for)) NG.for = forOpts[0][0];
  openSheet(`<div class="wzh"><small>New goal</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">What are you saving for?</h3>
  <div class="gtype" style="margin-top:12px">${GTYPE.map(([v, l, ic]) => `<button class="${NG.type === v ? "on" : ""}" onclick="NG.type='${v}';${v === "kit" ? "NG.target=57300;NG.months=2" : v === "trip" ? "NG.target=50000;NG.months=3" : "NG.target=200000;NG.months=6"};goalStep()">${svgI(ic)}${l}</button>`).join("")}</div>
  <div class="lbl2">For</div><div class="chips">${[...KIDS, ...QSAVED.map(learnerById).filter((x) => x && !KIDS.includes(x))].map((x) => `<button class="${NG.kid === x.id ? "on" : ""}" onclick="NG.kid='${x.id}';goalStep()">${x.first}</button>`).join("")}</div>
  <div class="lbl2">Goal</div><div class="chips">${forOpts.map(([v, l]) => `<button class="${NG.for === v ? "on" : ""}" onclick="NG.for='${v}';${v === "t1" ? "NG.target=45000;NG.months=1" : v === "tour" ? "NG.target=120000;NG.months=8" : ""};goalStep()">${l}</button>`).join("")}</div>
  <div class="lbl2">Target</div><div class="amt">${[30000, 57300, 120000, 200000].map((v) => `<button class="${NG.target === v ? "on" : ""}" onclick="NG.target=${v};goalStep()">${fmt(v / 1000)}K</button>`).join("")}</div>
  <div class="lbl2">Reach it in</div><div class="chips">${[1, 2, 3, 6, 12].map((m) => `<button class="${NG.months === m ? "on" : ""}" onclick="NG.months=${m};goalStep()">${m} month${m > 1 ? "s" : ""}</button>`).join("")}</div>
  <div class="fac" style="margin-top:14px;padding:14px"><small>You save</small><div class="big" style="font-size:22px">${rwf(wk)} <span>a week</span></div></div>
  <div class="chan ${NG.auto ? "on" : ""}" style="margin-top:10px" onclick="NG.auto=!NG.auto;goalStep()"><span class="ci">${svgI('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>')}</span><div><b>Auto-save every Friday</b><small>MTN MoMo · ${mask(MYPHONE)}</small></div><span class="sw"></span></div>
  <button class="go" onclick="createGoal(${wk})">Start saving</button>`);
}
function createGoal(wk) {
  const label = {
    kitT1: "ShuleKit · Term 1 2027",
    any: "Any future trip",
    t1: "S3 field trip",
    tour: "S4 tour 2027",
    laptop: "Laptop for school",
    uniform: "New uniform",
    fees: "Next term’s fees",
  }[NG.for];
  GOALS.push({
    id: "g" + (GOALS.length + 1),
    kid: NG.kid,
    name: label,
    type: NG.type,
    target: NG.target,
    saved: 0,
    weekly: wk,
    by: NG.months + " month" + (NG.months > 1 ? "s" : ""),
    auto: NG.auto,
  });
  renderAll();
  if (SHOW) renderLanding();
  openGoals();
  toast("Goal created · first saving on Friday");
}
/* landing actions */
function landDo(a) {
  if (a === "help") {
    toast("yoShule support · +250 793 903 847");
    return;
  }
  if (a === "goals") {
    G = null;
    openGoals();
    return;
  }
  G = null;
  const sv = SAVED.map((id) => KIDS.findIndex((k) => k.id === id)).filter(
    (i) => i >= 0,
  );
  if (LSEL == null && sv.length) LSEL = sv[0];
  if (LSEL == null) {
    linkChild();
    return;
  }
  K = LSEL;
  if (a === "pay") payFees();
  else if (a === "bby") getBabyeyi();
  else if (a === "kit") kitSelect();
  else if (a === "top") topUp();
  else shopFor(a);
}
const _rl8 = renderLanding7;
function _z0_renderLanding() {
  _rl8();
  const L = $("#login");
  // richer My children cards
  const row = L.querySelector(".kidrow");
  if (row) {
    const sv = SAVED.map((id) => KIDS.findIndex((k) => k.id === id)).filter(
      (i) => i >= 0,
    );
    row.innerHTML =
      sv
        .map((i) => {
          const k = KIDS[i];
          const paid = paidOf(k),
            bill = paid + k.fees;
          const g = allGoals().filter((x) => x.kid === k.id);
          return `<button class="mc ${LSEL === i ? "on" : ""}" onclick="LSEL=${i};renderLanding()">${LSEL === i ? '<span class="sel">SELECTED</span>' : ""}<div class="hd"><span class="in">${ini(k.first, k.n)}</span><div><b>${k.n}</b><small>${k.cls} · ${k.type} · Umucyo SS</small></div><span class="x" onclick="event.stopPropagation();unsaveKid('${k.id}')">×</span></div>
    <div class="bd"><div class="fr"><span>Term 3 fees</span><span>${Math.round((paid / bill) * 100)}% paid</span></div><div class="pb"><i style="width:${(paid / bill) * 100}%;${k.fees ? "" : "background:var(--green)"}"></i></div>
    <div class="duo"><div><small>PAID</small><b style="color:var(--green)">${fmt(paid)}</b></div><div><small>BALANCE</small><b style="color:${k.fees ? "var(--red)" : "var(--green)"}">${k.fees ? fmt(k.fees) : "Nil"}</b></div><div><small>SHULECARD</small><b style="color:${k.card < 3000 ? "#9A5B00" : "var(--navy)"}">${fmt(k.card)}</b></div><div><small>GOALS</small><b>${g.length ? fmt(g.reduce((a, x) => a + x.saved, 0)) : "—"}</b></div></div></div></button>`;
        })
        .join("") +
      `<button class="mc add" onclick="linkChild()"><span>+</span>Add child</button>`;
  }
  // the inline found card is replaced by the popup
  L.querySelectorAll(".sdms .found").forEach((f) => {
    if (!f.style.borderColor) f.remove();
  });
  // floating console button
  const c = L.querySelector(".console");
  if (c) {
    const wrap = document.createElement("div");
    wrap.className = "fconsole";
    c.replaceWith(document.createElement("span"));
    wrap.appendChild(c);
    L.appendChild(wrap);
  }
}

/* =========================================================
   v9 · My children as names with drop-down details · popup actions complete · languages
   ========================================================= */
let OPENID: any = null;
(window as any).OPENID = null;

function _toggleLandingRow(id: string) {
  const L = $("#login") as HTMLElement | null;
  const prevOpen = OPENID;
  const willOpen = prevOpen !== id;
  OPENID = willOpen ? id : null;
  (window as any).OPENID = OPENID;

  if (typeof learnerById === "function" && typeof KIDS !== "undefined") {
    try {
      const k = learnerById(id);
      const idx = KIDS.indexOf(k);
      if (idx >= 0) {
        LSEL = idx;
        (window as any).LSEL = idx;
      }
    } catch {}
  }

  try {
    if (L) {
      const selector = `.acc .ar .h[onclick*="toggleChildRow('${id}')"], .acc .ar .h[onclick*="toggleQuickRow('${id}')"]`;
      const btn = L.querySelector(selector) as HTMLElement | null;
      const row = btn?.closest('.ar') as HTMLElement | null;
      if (row) {
        const scrollBefore = L.scrollTop;
        const headerTopBefore = btn!.getBoundingClientRect().top;

        // Close any other open rows in landing accordions
        L.querySelectorAll('.acc .ar.open').forEach((el) => {
          if (el !== row) el.classList.remove('open');
        });
        row.classList.toggle('open', willOpen);

        // Keep header fixed in viewport so details expand downward (not upward)
        const headerTopAfter = btn!.getBoundingClientRect().top;
        const delta = headerTopAfter - headerTopBefore;
        if (delta !== 0) L.scrollTop = scrollBefore + delta;
        else L.scrollTop = scrollBefore;

        // If expanded content is cut off at bottom (above sticky find bar), reveal downward
        if (willOpen) {
          requestAnimationFrame(() => {
            try {
              const details = row.querySelector('.d') as HTMLElement | null;
              if (!details) return;
              const cRect = L.getBoundingClientRect();
              const dRect = details.getBoundingClientRect();
              const bottomLimit = cRect.bottom - 140; // keep clear of sticky find area
              if (dRect.bottom > bottomLimit) {
                L.scrollTop += (dRect.bottom - bottomLimit);
              }
            } catch {}
          });
        }
        return;
      }
    }
  } catch {}

  // Fallback: preserve scroll position across full re-render
  const prevScroll = L ? L.scrollTop : 0;
  let headerOffset = 0;
  try {
    if (L) {
      const btn = L.querySelector(`.acc .ar .h[onclick*="toggleChildRow('${id}')"], .acc .ar .h[onclick*="toggleQuickRow('${id}')"]`) as HTMLElement | null;
      if (btn) headerOffset = btn.getBoundingClientRect().top - L.getBoundingClientRect().top;
    }
  } catch {}
  renderLanding();
  requestAnimationFrame(() => {
    try {
      const L2 = $("#login") as HTMLElement | null;
      if (!L2) return;
      const btn2 = L2.querySelector(`.acc .ar .h[onclick*="toggleChildRow('${id}')"], .acc .ar .h[onclick*="toggleQuickRow('${id}')"]`) as HTMLElement | null;
      if (btn2) {
        const newOffset = btn2.getBoundingClientRect().top - L2.getBoundingClientRect().top;
        L2.scrollTop = Math.max(0, L2.scrollTop + (newOffset - headerOffset));
      } else {
        L2.scrollTop = prevScroll;
      }
    } catch {}
  });
}

function toggleChildRow(id: string) {
  _toggleLandingRow(id);
}

function toggleQuickRow(id: string) {
  _toggleLandingRow(id);
}

const chev =
  '<span class="cv"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>';
function childRowLinked(k) {
  const isOpen = LAND_CHILDREN_EXPANDED;
  return `<article class="lm-child-card ${isOpen ? "open" : ""}">
    <div class="lm-child-header">
      <button type="button" class="lm-child-toggle" aria-expanded="${isOpen}" onclick="toggleLandingChildren()">
      <span class="lm-child-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>
      <span class="lm-child-avatar">${avatar(k)}</span>
      <span class="lm-child-info"><b>${escapeLinkValue(k.n)}</b><small>${escapeLinkValue(k.cls)} · ${escapeLinkValue(k.type)}</small></span>
      </button>
      <button type="button" class="lm-console-button lm-child-console" onclick="openLandingConsole('${escapeLinkValue(k.id)}')">Open console</button>
    </div>
    <div class="lm-child-details"><div class="lm-child-details-inner">
      <div class="lm-child-detail-row"><span>Class</span><b>${escapeLinkValue(k.cls)}</b></div>
      ${k.fees ? `<div class="lm-child-detail-row"><span>Outstanding fees</span><b>${LAND_FEES_VISIBLE ? `RWF ${fmt(k.fees)}` : "RWF •••••"}<button type="button" class="lm-fee-toggle" onclick="toggleLandingFees()" aria-label="${LAND_FEES_VISIBLE ? "Hide" : "Show"} fee balance">${svgI(LAND_FEES_VISIBLE ? '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 8.5 4.5 9 7-.2 1.1-.9 2.2-1.8 3.2"/><path d="M6.2 6.2C3.9 7.7 2.3 10 2 12c.5 2.5 4 7 10 7 1.1 0 2.1-.2 3-.5"/>' : '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>')}</button></b></div>` : ""}
    </div></div>
  </article>`;
}

let LAND_FEES_VISIBLE = false;
let LAND_CHILDREN_EXPANDED = false;
function toggleLandingChildren() {
  LAND_CHILDREN_EXPANDED = !LAND_CHILDREN_EXPANDED;
  renderLanding();
}
function toggleLandingFees() {
  LAND_FEES_VISIBLE = !LAND_FEES_VISIBLE;
  renderLanding();
}
function openLandingConsole(id) {
  const index = KIDS.findIndex((child) => child.id === id);
  if (index < 0) return;
  K = index;
  LSEL = index;
  renderAll();
  enterConsole();
}
function selectLandingChild(id) {
  const index = KIDS.findIndex((child) => child.id === id);
  if (index < 0) return;
  LSEL = index;
  K = index;
  LAND_CHILDREN_EXPANDED = false;
  closeSheet();
  renderLanding();
}
function openLandingChildren() {
  const childIndices = myKids();
  openSheet(`<div class="wzh"><small>Parent account</small><button onclick="closeSheet()" aria-label="Close">✕</button></div><h3 style="margin-top:4px">My children</h3><div class="lm-child-list">${childIndices.map((index) => {
    const child = KIDS[index];
    return `<button type="button" class="lm-child-option ${index === LSEL ? "on" : ""}" onclick="selectLandingChild('${escapeLinkValue(child.id)}')"><span class="lm-child-avatar">${avatar(child)}</span><span><b>${escapeLinkValue(child.n)}</b><small>${escapeLinkValue(child.cls)} · ${escapeLinkValue(child.type)}</small></span>${index === LSEL ? '<span class="lm-child-current">Viewing</span>' : ""}</button>`;
  }).join("")}<button type="button" class="addrow lm-addrow" onclick="closeSheet();linkChild()"><span>+</span>Add a child to my account</button></div>`);
}
function childRowQuick(q) {
  const open = OPENID === q.id;
  return `<div class="ar ${open ? "open" : ""}"><button class="h" onclick="toggleQuickRow('${q.id}')"><span class="in">${ini(q.first, q.n)}</span><div><b>${q.n}</b><small>${q.cls} · quick use only</small></div>${chev}</button>
  <div class="d"><div class="acts"><button onclick="quickDo('${q.id}','pay')">${svgI(IC.pay)}Pay fees</button><button onclick="quickDo('${q.id}','bby')">${svgI(IC.doc)}Get Babyeyi</button><button onclick="quickDo('${q.id}','top')">${svgI(IC.wallet)}Top up card</button></div>
   <div class="row3"><button class="p" onclick="linkChild('${q.sdms}')">Add to my account</button><button class="s" onclick="quickRemove('${q.id}')">Remove</button></div></div></div>`;
}
function renderLanding() {
  const L = $("#login");
  const sv = SAVED.map((id) => KIDS.findIndex((k) => k.id === id)).filter(
    (i) => i >= 0,
  );
  if (LSEL != null && !sv.includes(LSEL)) LSEL = null;
  if (LSEL == null && sv.length) LSEL = sv[0];
  const currentChildIndex = sv.includes(LSEL) ? LSEL : sv[0];
  const qs = QSAVED.map(learnerById).filter((x) => x && !KIDS.includes(x));
  L.className = "land land-modern" + (SHOW ? "" : " gone");
  L.innerHTML = `
  <div class="lm-bg" aria-hidden="true">
    <span class="lm-orb lm-orb-a"></span>
    <span class="lm-orb lm-orb-b"></span>
    <span class="lm-orb lm-orb-c"></span>
  </div>
  <div class="top lm-top">
    <div class="logo lm-logo"><img src="${LOGO}" alt="yoShule"></div>
    <div class="lm-top-actions">
      <button class="lng lm-lang" onclick="pickLang()"><span>${LANG.toUpperCase()}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      ${LOGGED ? `<button type="button" class="iconbtn lm-account" onclick="openMore()" aria-label="Account and sign out" title="Account">${ini(PARENT.first, PARENT.n) || "P"}</button>` : ""}
    </div>
  </div>
  <div class="lhead lm-hero">
    <div class="lm-hero-copy">
      <span class="lm-eyebrow">Parent Portal</span>
      <h1>Equitable School Readiness</h1>
    </div>
    <div class="lm-hero-art">${DECO}</div>
  </div>
  <div class="body lm-body">
    <section class="lm-section lm-kids-section">
      <div class="lsec lm-sec-head"><span>${LOGGED ? "" : ""}</span><small>${CHILDREN_LOADING ? "Loading children linked to your account…" : sv.length ? "" : LOGGED ? "" : ""}</small></div>
      ${CHILDREN_LOADING ? '<div class="lm-children-loading" role="status" aria-live="polite"><span class="lm-spinner" aria-hidden="true"></span><span>Loading your children…</span></div>' : sv.length ? `<div class="lm-child-accordion">${childRowLinked(KIDS[currentChildIndex])}${LAND_CHILDREN_EXPANDED && sv.length > 1 ? `<div class="lm-child-options" role="list">${sv.filter((i) => i !== currentChildIndex).map((i) => { const child = KIDS[i]; return `<button type="button" class="lm-child-option" role="listitem" onclick="openLandingConsole('${escapeLinkValue(child.id)}')"><span class="lm-child-avatar">${avatar(child)}</span><span class="lm-child-option-info"><b>${escapeLinkValue(child.n)}</b><small>${escapeLinkValue(child.cls)} · ${escapeLinkValue(child.type)}</small></span><span class="lm-child-option-open">Open console</button>`; }).join("")}</div>` : ""}</div>` : '<button class="lm-empty-add" onclick="linkChild()"><span>+</span>Add a child to my account</button>'}
      ${sv.length || CHILDREN_LOADING || LOGGED ? "" : '<button class="signin lm-signin" onclick="enterConsole()">Already linked? Sign in to the parent console</button>'}
    </section>
    ${qs.length ? `<section class="lm-section"><div class="lsec lm-sec-head"><span>Saved for quick use</span><small>Pay fees · Babyeyi · Top up</small></div><div class="acc q lm-acc lm-acc-quick">${qs.map(childRowQuick).join("")}</div></section>` : ""}
    ${sv.length ? `<section class="lm-section"><div class="lsec lm-sec-head"><span>What do you need?</span></div><div class="sgrid lm-sgrid">${SVC.map(([a, l, ic, m]) => a === "help" ? `<a class="sg" href="tel:+250793903847" aria-label="Call yoShule support at +250 793 903 847"><i>${svgI(ic)}</i><span>${l}</span></a>` : `<button class="sg ${m ? "main" : ""}" onclick="landDo('${a}')"><i>${svgI(ic)}</i><span>${l}</span></button>`).join("")}</div></section>` : ""}
  </div>
  <div class="ffind lm-ffind">
    <div class="sdms lm-find-card">
      <div class="lm-find-head">
        <div>
          <b class="t">Find a child</b>
        </div>
      </div>
      <div class="sdmsin lm-search">
        <span class="ic">${svgI('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}</span>
        <input id="sdmsq" placeholder="e.g. SDM-2026-004821" value="${LOOK}" onkeydown="if(event.key==='Enter')lookUp()">
        <button class="go2" onclick="lookUp()" aria-label="Search">${svgI('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button>
      </div>
      ${FOUNDL === -1 ? `<div class="found lm-not-found"><small>No learner found for “${LOOK}”. Check the code on the ShuleCard or report card.</small></div>` : ""}
    </div>
  </div>`;
}
/* popup: both secondary actions complete in place */
function foundPop(f, state) {
  const mine = KIDS.includes(f),
    saved = QSAVED.includes(f.id);
  openSheet(`<div class="fpop"><div class="wzh"><small>Child found</small><button onclick="closeSheet()">✕</button></div>
  <div class="who"><span class="av">${ini(f.first, f.n)}</span><div><b>${f.n}</b><small>${f.cls} · Kigali Green Hills School · ${f.sdms}</small></div></div>
  <div class="lbl2" style="margin-top:16px">What would you like to do?</div>
  <div class="big3"><button onclick="closeSheet();setTimeout(()=>quickDo('${f.id}','pay'),60)"><i>${svgI(IC.pay)}</i>Pay fees</button><button onclick="closeSheet();setTimeout(()=>quickDo('${f.id}','bby'),60)"><i>${svgI(IC.doc)}</i>Get Babyeyi</button><button onclick="closeSheet();setTimeout(()=>quickDo('${f.id}','top'),60)"><i>${svgI(IC.wallet)}</i>Top up card</button></div>
  ${state === "saved" ? `<div class="saved">✓<span>${f.first} is saved for quick use. Find ${f.first} under “Saved for quick use” on the start page.</span></div>` : ""}
  <div class="lk">${mine ? "" : `<button style="background:var(--bg);color:var(--navy)" onclick="popSave('${f.id}')">${saved ? "Saved ✓" : "Save for quick use"}</button>`}${mine ? '<button style="background:#E3F6EE;color:#12784F;pointer-events:none">Already in My children ✓</button>' : `<button style="background:var(--navy);color:#fff" onclick="linkChild('${f.sdms}')">Add to my account</button>`}</div>
  ${state === "saved" ? '<button class="go" onclick="closeSheet()">Done</button>' : '<p class="qlnote" style="text-align:center">No account needed for these three. Add the child to your account to see marks, attendance and more.</p>'}</div>`);
}
function popSave(id) {
  if (!QSAVED.includes(id)) QSAVED.push(id);
  saveQ();
  OPENID = id;
  (window as any).OPENID = id;
  renderLanding();
  foundPop(learnerById(id), "saved");
}
async function lkDone() {
  const child = POOL[LK.hit];
  const firstName = $("#lk-first")?.value.trim() || "";
  const lastName = $("#lk-last")?.value.trim() || "";
  const phoneInput = $("#lk-phone")?.value.trim() || "";
  const phone = formatParentPhone(phoneInput);
  const email = $("#lk-email")?.value.trim() || "";
  const role = $("#lk-role")?.value || "GUARDIAN";
  const confirmed = $("#lk-confirm")?.checked;
  const error = $("#lk-error");
  const button = $("#lk-submit");
  if (!child || !firstName || !lastName || !phone || phone.replace(/\D/g, "").length < 9 || !confirmed) {
    if (error) error.textContent = "Enter your name and valid phone number, then confirm you are the parent or guardian.";
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (error) error.textContent = "Enter a valid email address or leave it blank.";
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = "Saving guardian details…";
  }
  if (error) error.textContent = "";
  try {
    await parentRealApi.claimParentByCode({
      studentCode: child.code || child.sdms,
      firstName,
      lastName,
      phone,
      email: email || undefined,
      role,
    });
    LK.phone = phone;
    LK.synced = false;
    if (parentRealApi.getToken()) {
      await syncRealBackend();
      LK.synced = KIDS.some((kid) => kid.id === child.id || (kid.code && kid.code === child.code));
    }
    LK.step = 2;
    lkStep();
  } catch (e) {
    if (error) error.textContent = e?.message || "Could not add this child. Please check your connection and try again.";
    if (button) {
      button.disabled = false;
      button.textContent = "Confirm and add child";
    }
  }
}

/* =========================================================
   Languages: English, Ikinyarwanda, Français, Luganda, Português, Kiswahili, Ikirundi
   ========================================================= */
const LANGS = [
  ["en", "English", "English"],
  ["rw", "Ikinyarwanda", "Kinyarwanda"],
  ["fr", "Français", "French"],
  ["lg", "Luganda", "Luganda"],
  ["pt", "Português", "Portuguese"],
  ["sw", "Kiswahili", "Swahili"],
  ["rn", "Ikirundi", "Kirundi"],
];
let LANG = "en";
try {
  LANG = localStorage.getItem("sp_lang") || "en";
} catch (e) {}
//          [ rw , fr , lg , pt , sw , rn ]
const TR = {
  Home: ["Ahabanza", "Accueil", "Awaka", "Início", "Nyumbani", "Ahabanza"],
  Learning: [
    "Kwiga",
    "Apprentissage",
    "Okusoma",
    "Aprendizagem",
    "Masomo",
    "Kwiga",
  ],
  Pay: ["Kwishyura", "Payer", "Sasula", "Pagar", "Lipa", "Kuriha"],
  Chat: ["Ubutumwa", "Messages", "Obubaka", "Mensagens", "Ujumbe", "Ubutumwa"],
  "Pay fees": [
    "Ishyura amafaranga",
    "Payer les frais",
    "Sasula ebisale",
    "Pagar propinas",
    "Lipa ada",
    "Riha amafaranga",
  ],
  "Get Babyeyi": [
    "Bona Babyeyi",
    "Obtenir Babyeyi",
    "Funa Babyeyi",
    "Obter Babyeyi",
    "Pata Babyeyi",
    "Ronka Babyeyi",
  ],
  Babyeyi: ["Babyeyi", "Babyeyi", "Babyeyi", "Babyeyi", "Babyeyi", "Babyeyi"],
  "Top up card": [
    "Ongera ku ikarita",
    "Recharger la carte",
    "Teeka ku kaadi",
    "Carregar cartão",
    "Ongeza kwenye kadi",
    "Ongera ku ikarata",
  ],
  "Top up": [
    "Ongeraho",
    "Recharger",
    "Teekamu",
    "Carregar",
    "Ongeza",
    "Ongerako",
  ],
  "My goals": [
    "Intego zanjye",
    "Mes objectifs",
    "Ebigendererwa byange",
    "Os meus objetivos",
    "Malengo yangu",
    "Intumbero zanje",
  ],
  Help: ["Ubufasha", "Aide", "Obuyambi", "Ajuda", "Msaada", "Imfashanyo"],
  Uniforms: [
    "Impuzankano",
    "Uniformes",
    "Yunifoomu",
    "Uniformes",
    "Sare",
    "Impuzu z’ishure",
  ],
  Shoes: ["Inkweto", "Chaussures", "Engatto", "Sapatos", "Viatu", "Ibirato"],
  "Enter parent console": [
    "Injira mu rubuga rw’ababyeyi",
    "Entrer dans l’espace parent",
    "Yingira mu kifo ky’abazadde",
    "Entrar na consola dos pais",
    "Ingia kwenye dashibodi ya mzazi",
    "Injira mu kibanza c’abavyeyi",
  ],
  "Marks, attendance, homework, messages and more": [
    "Amanota, kwitabira, imikoro, ubutumwa n’ibindi",
    "Notes, présence, devoirs, messages et plus",
    "Obubonero, okubeerawo, emirimu, obubaka n’ebirala",
    "Notas, assiduidade, trabalhos, mensagens e mais",
    "Alama, mahudhurio, kazi za nyumbani, ujumbe na zaidi",
    "Amanota, ukuboneka, ibikorwa, ubutumwa n’ibindi",
  ],
  "Find a child": [
    "Shakisha umwana",
    "Trouver un enfant",
    "Noonya omwana",
    "Encontrar um aluno",
    "Tafuta mtoto",
    "Rondera umwana",
  ],
  "SDMS code or ShuleCard number": [
    "Kode ya SDMS cyangwa nimero ya ShuleCard",
    "Code SDMS ou numéro ShuleCard",
    "Koodi ya SDMS oba ennamba ya ShuleCard",
    "Código SDMS ou número do ShuleCard",
    "Msimbo wa SDMS au namba ya ShuleCard",
    "Kode ya SDMS canke inomero ya ShuleCard",
  ],
  "Equitable School Readiness": [
    "Itegure Ishuri Ntagihunga",
    "Préparation scolaire équitable",
    "Okwetegekera essomero mu bwenkanya",
    "Preparação escolar equitativa",
    "Utayari sawa wa shule",
    "Itegurte Ishuri nta gihunga",
  ],
  "Pay fees, get the Babyeyi and top up pocket money with any child’s code.": [
    "Ishyura amafaranga, ubone Babyeyi kandi wongere amafaranga y’umufuka ukoresheje kode y’umwana.",
    "Payez les frais, obtenez le Babyeyi et rechargez l’argent de poche avec le code de l’enfant.",
    "Sasula ebisale, funa Babyeyi era oteeke ssente z’omu nsawo ng’okozesa koodi y’omwana.",
    "Pague propinas, obtenha o Babyeyi e carregue a mesada com o código do aluno.",
    "Lipa ada, pata Babyeyi na ongeza pesa ya matumizi kwa msimbo wa mtoto.",
    "Riha amafaranga, ronka Babyeyi kandi wongere amafaranga y’umufuko ukoresheje kode y’umwana.",
  ],
  "My children": [
    "Abana banjye",
    "Mes enfants",
    "Abaana bange",
    "Os meus filhos",
    "Watoto wangu",
    "Abana banje",
  ],
  "Linked to your account": [
    "Bahujwe na konti yawe",
    "Liés à votre compte",
    "Bagattiddwa ku akawunti yo",
    "Associados à sua conta",
    "Wameunganishwa na akaunti yako",
    "Bahujwe na konti yawe",
  ],
  "Add a child to my account": [
    "Ongeramo umwana kuri konti yanjye",
    "Ajouter un enfant à mon compte",
    "Yongerako omwana ku akawunti yange",
    "Adicionar um aluno à minha conta",
    "Ongeza mtoto kwenye akaunti yangu",
    "Ongeramwo umwana kuri konti yanje",
  ],
  "Saved for quick use": [
    "Babitswe ngo bakoreshwe vuba",
    "Enregistrés pour un accès rapide",
    "Abaterekeddwa okukozesa amangu",
    "Guardados para uso rápido",
    "Waliohifadhiwa kwa matumizi ya haraka",
    "Babitswe ngo bakoreshwe vuba",
  ],
  "Save for quick use": [
    "Bika ukoreshe vuba",
    "Enregistrer pour un accès rapide",
    "Tereka okukozesa amangu",
    "Guardar para uso rápido",
    "Hifadhi kwa matumizi ya haraka",
    "Bika ukoreshe vuba",
  ],
  "Add to my account": [
    "Ongera kuri konti yanjye",
    "Ajouter à mon compte",
    "Gattako ku akawunti yange",
    "Adicionar à minha conta",
    "Ongeza kwenye akaunti yangu",
    "Ongera kuri konti yanje",
  ],
  "Open in console": [
    "Fungura mu rubuga",
    "Ouvrir dans l’espace parent",
    "Ggulawo mu kifo",
    "Abrir na consola",
    "Fungua kwenye dashibodi",
    "Fungura mu kibanza",
  ],
  "Remove from this phone": [
    "Kura kuri iyi telefone",
    "Retirer de ce téléphone",
    "Ggyako ku ssimu eno",
    "Remover deste telemóvel",
    "Ondoa kwenye simu hii",
    "Kura kuri iyi terefone",
  ],
  Remove: ["Kuraho", "Retirer", "Ggyawo", "Remover", "Ondoa", "Kurako"],
  "What do you need?": [
    "Ukeneye iki?",
    "De quoi avez-vous besoin ?",
    "Weetaaga ki?",
    "De que precisa?",
    "Unahitaji nini?",
    "Ukeneye iki?",
  ],
  "Child found": [
    "Umwana yabonetse",
    "Enfant trouvé",
    "Omwana azuuliddwa",
    "Aluno encontrado",
    "Mtoto amepatikana",
    "Umwana yabonetse",
  ],
  "What would you like to do?": [
    "Urashaka gukora iki?",
    "Que voulez-vous faire ?",
    "Oyagala kukola ki?",
    "O que pretende fazer?",
    "Ungependa kufanya nini?",
    "Urashaka gukora iki?",
  ],
  Continue: [
    "Komeza",
    "Continuer",
    "Weyongereyo",
    "Continuar",
    "Endelea",
    "Bandanya",
  ],
  Back: ["Subira inyuma", "Retour", "Ddayo", "Voltar", "Rudi", "Subira inyuma"],
  Done: [
    "Byarangiye",
    "Terminé",
    "Kiwedde",
    "Concluído",
    "Imekamilika",
    "Vyarangiye",
  ],
  Next: [
    "Komeza",
    "Suivant",
    "Ekiddako",
    "Seguinte",
    "Ifuatayo",
    "Ibikurikira",
  ],
  "Quick actions": [
    "Ibikorwa byihuse",
    "Actions rapides",
    "Ebikolwa eby’amangu",
    "Ações rápidas",
    "Vitendo vya haraka",
    "Ibikorwa vyihuta",
  ],
  "To do": [
    "Ibyo gukora",
    "À faire",
    "Eby’okukola",
    "A fazer",
    "Ya kufanya",
    "Ivyo gukora",
  ],
  "Today in class": [
    "Uyu munsi mu ishuri",
    "Aujourd’hui en classe",
    "Leero mu kibiina",
    "Hoje na aula",
    "Leo darasani",
    "Uyu munsi mw’ishure",
  ],
  "Report absence": [
    "Menyesha ko adahari",
    "Signaler une absence",
    "Loopa obutabaawo",
    "Comunicar falta",
    "Ripoti kutokuwepo",
    "Menyesha ukutaboneka",
  ],
  "Report an absence": [
    "Menyesha ko adahari",
    "Signaler une absence",
    "Loopa obutabaawo",
    "Comunicar uma falta",
    "Ripoti kutokuwepo",
    "Menyesha ukutaboneka",
  ],
  "Message teacher": [
    "Andikira mwarimu",
    "Écrire à l’enseignant",
    "Wandiikira omusomesa",
    "Mensagem ao professor",
    "Mwandikie mwalimu",
    "Andikira umwigisha",
  ],
  "School trips": [
    "Ingendo shuri",
    "Sorties scolaires",
    "Entambula z’essomero",
    "Visitas de estudo",
    "Safari za shule",
    "Ingendo z’ishure",
  ],
  "Pocket money": [
    "Amafaranga y’umufuka",
    "Argent de poche",
    "Ssente z’omu nsawo",
    "Mesada",
    "Pesa ya matumizi",
    "Amafaranga y’umufuko",
  ],
  Attendance: [
    "Kwitabira",
    "Présence",
    "Okubeerawo",
    "Assiduidade",
    "Mahudhurio",
    "Ukuboneka",
  ],
  "Term average": [
    "Impuzandengo",
    "Moyenne du trimestre",
    "Ekigero ky’olusoma",
    "Média do período",
    "Wastani wa muhula",
    "Igiciro co hagati",
  ],
  "Fees due": [
    "Amafaranga asigaye",
    "Frais dus",
    "Ebisale ebibanjibwa",
    "Propinas em dívida",
    "Ada inayodaiwa",
    "Amafaranga asigaye",
  ],
  Homework: [
    "Imikoro yo mu rugo",
    "Devoirs",
    "Emirimu gy’awaka",
    "Trabalhos de casa",
    "Kazi ya nyumbani",
    "Ibikorwa vyo muhira",
  ],
  Conduct: [
    "Imyitwarire",
    "Conduite",
    "Empisa",
    "Comportamento",
    "Tabia",
    "Inyifato",
  ],
  Overview: [
    "Incamake",
    "Aperçu",
    "Okulaba okwawamu",
    "Resumo",
    "Muhtasari",
    "Incamake",
  ],
  Subjects: [
    "Amasomo",
    "Matières",
    "Amasomo",
    "Disciplinas",
    "Masomo",
    "Ivyigwa",
  ],
  "Report cards": [
    "Indangamanota",
    "Bulletins",
    "Lipoota z’obubonero",
    "Boletins",
    "Ripoti za alama",
    "Indangamanota",
  ],
  "Doing well": [
    "Aritwara neza",
    "Points forts",
    "Akola bulungi",
    "Está a ir bem",
    "Anafanya vizuri",
    "Aritwara neza",
  ],
  "Needs support": [
    "Akeneye ubufasha",
    "A besoin d’aide",
    "Yeetaaga obuyambi",
    "Precisa de apoio",
    "Anahitaji msaada",
    "Akeneye imfashanyo",
  ],
  "Coming up": [
    "Ibiri imbere",
    "À venir",
    "Ebijja",
    "Próximos",
    "Yanayokuja",
    "Ibiri imbere",
  ],
  "Pay school fees": [
    "Ishyura amafaranga y’ishuri",
    "Payer les frais scolaires",
    "Sasula ebisale by’essomero",
    "Pagar propinas",
    "Lipa ada ya shule",
    "Riha amafaranga y’ishure",
  ],
  "Trips and goals": [
    "Ingendo n’intego",
    "Sorties et objectifs",
    "Entambula n’ebigendererwa",
    "Visitas e objetivos",
    "Safari na malengo",
    "Ingendo n’intumbero",
  ],
  "ShuleCard wallets": [
    "Amakonte ya ShuleCard",
    "Portefeuilles ShuleCard",
    "Ensawo za ShuleCard",
    "Carteiras ShuleCard",
    "Pochi za ShuleCard",
    "Amakonti ya ShuleCard",
  ],
  "Recent payments": [
    "Ubwishyu buheruka",
    "Paiements récents",
    "Okusasula okwakakolebwa",
    "Pagamentos recentes",
    "Malipo ya hivi karibuni",
    "Uburiha buheruka",
  ],
  "Your children’s kits": [
    "Ibikoresho by’abana bawe",
    "Les kits de vos enfants",
    "Ebikozesebwa by’abaana bo",
    "Os kits dos seus filhos",
    "Vifaa vya watoto wako",
    "Ibikoresho vy’abana bawe",
  ],
  "Last term’s kits": [
    "Ibikoresho by’igihembwe gishize",
    "Kits du trimestre dernier",
    "Ebikozesebwa by’olusoma oluwedde",
    "Kits do período anterior",
    "Vifaa vya muhula uliopita",
    "Ibikoresho vy’igihembwe giheze",
  ],
  "School circulars": [
    "Amatangazo y’ishuri",
    "Circulaires de l’école",
    "Ebirango by’essomero",
    "Circulares da escola",
    "Nyaraka za shule",
    "Amatangazo y’ishure",
  ],
  "Upcoming events": [
    "Ibikorwa biri imbere",
    "Événements à venir",
    "Emikolo egijja",
    "Próximos eventos",
    "Matukio yajayo",
    "Ibirori biri imbere",
  ],
  "Student profile": [
    "Umwirondoro w’umunyeshuri",
    "Profil de l’élève",
    "Ebikwata ku muyizi",
    "Perfil do aluno",
    "Wasifu wa mwanafunzi",
    "Umwirondoro w’umunyeshure",
  ],
  "Health records": [
    "Amakuru y’ubuzima",
    "Dossier de santé",
    "Ebiwandiiko by’obulamu",
    "Registos de saúde",
    "Kumbukumbu za afya",
    "Amakuru y’amagara",
  ],
  "Discipline and conduct": [
    "Ikinyabupfura n’imyitwarire",
    "Discipline et conduite",
    "Empisa",
    "Disciplina e comportamento",
    "Nidhamu na tabia",
    "Indero n’inyifato",
  ],
  "Leave and permission": [
    "Uruhushya",
    "Congés et autorisations",
    "Olukusa",
    "Licenças e autorizações",
    "Ruhusa",
    "Uruhusha",
  ],
  "Notification settings": [
    "Igenamiterere ry’amamenyesha",
    "Paramètres des notifications",
    "Enteekateeka z’obubaka",
    "Definições de notificações",
    "Mipangilio ya arifa",
    "Ingene amamenyesha agenda",
  ],
  "Sign out": [
    "Sohoka",
    "Se déconnecter",
    "Fuluma",
    "Terminar sessão",
    "Toka",
    "Sohoka",
  ],
  "Link a child": [
    "Huza umwana",
    "Lier un enfant",
    "Gatta omwana",
    "Associar um aluno",
    "Unganisha mtoto",
    "Huza umwana",
  ],
  Account: ["Konti", "Compte", "Akawunti", "Conta", "Akaunti", "Konti"],
  Notifications: [
    "Amamenyesha",
    "Notifications",
    "Obubaka",
    "Notificações",
    "Arifa",
    "Amamenyesha",
  ],
  "Send to school": [
    "Ohereza ku ishuri",
    "Envoyer à l’école",
    "Weereza essomero",
    "Enviar à escola",
    "Tuma shuleni",
    "Rungika ku ishure",
  ],
  Child: ["Umwana", "Enfant", "Omwana", "Aluno", "Mtoto", "Umwana"],
  When: ["Ryari", "Quand", "Ddi", "Quando", "Lini", "Ryari"],
  Reason: ["Impamvu", "Motif", "Ensonga", "Motivo", "Sababu", "Imvo"],
  Sick: ["Arwaye", "Malade", "Mulwadde", "Doente", "Mgonjwa", "Arwaye"],
  Family: ["Umuryango", "Famille", "Amaka", "Família", "Familia", "Umuryango"],
  Other: ["Ibindi", "Autre", "Ebirala", "Outro", "Nyingine", "Ibindi"],
  "Medical appointment": [
    "Gahunda kwa muganga",
    "Rendez-vous médical",
    "Okulaba omusawo",
    "Consulta médica",
    "Miadi ya daktari",
    "Gahunda kwa muganga",
  ],
  "Pick dates": [
    "Hitamo amatariki",
    "Choisir les dates",
    "Londa ennaku",
    "Escolher datas",
    "Chagua tarehe",
    "Hitamwo amatariki",
  ],
  "Choose your language": [
    "Hitamo ururimi",
    "Choisissez la langue",
    "Londa olulimi",
    "Escolha o idioma",
    "Chagua lugha",
    "Hitamwo ururimi",
  ],
  Language: ["Ururimi", "Langue", "Olulimi", "Idioma", "Lugha", "Ururimi"],
  "Student details": [
    "Amakuru y’umunyeshuri",
    "Informations sur l’élève",
    "Ebikwata ku muyizi",
    "Dados do aluno",
    "Maelezo ya mwanafunzi",
    "Amakuru y’umunyeshure",
  ],
  "Your Babyeyi": [
    "Babyeyi yawe",
    "Votre Babyeyi",
    "Babyeyi wo",
    "O seu Babyeyi",
    "Babyeyi yako",
    "Babyeyi yawe",
  ],
  "Term dates": [
    "Amatariki y’igihembwe",
    "Dates du trimestre",
    "Ennaku z’olusoma",
    "Datas do período",
    "Tarehe za muhula",
    "Amatariki y’igihembwe",
  ],
  "School fees": [
    "Amafaranga y’ishuri",
    "Frais scolaires",
    "Ebisale by’essomero",
    "Propinas",
    "Ada ya shule",
    "Amafaranga y’ishure",
  ],
  "Download Babyeyi (PDF)": [
    "Kuramo Babyeyi (PDF)",
    "Télécharger Babyeyi (PDF)",
    "Wanula Babyeyi (PDF)",
    "Descarregar Babyeyi (PDF)",
    "Pakua Babyeyi (PDF)",
    "Kuramwo Babyeyi (PDF)",
  ],
  "Fee account": [
    "Konti y’amafaranga",
    "Compte des frais",
    "Akawunti y’ebisale",
    "Conta de propinas",
    "Akaunti ya ada",
    "Konti y’amafaranga",
  ],
  "Choose items": [
    "Hitamo ibyo wishyura",
    "Choisir les éléments",
    "Londa by’osasulira",
    "Escolher itens",
    "Chagua vitu",
    "Hitamwo ivyo uriha",
  ],
  Amount: [
    "Amafaranga",
    "Montant",
    "Omuwendo",
    "Montante",
    "Kiasi",
    "Amafaranga",
  ],
  "Payment method": [
    "Uburyo bwo kwishyura",
    "Moyen de paiement",
    "Engeri y’okusasula",
    "Método de pagamento",
    "Njia ya malipo",
    "Uburyo bwo kuriha",
  ],
  "Review and pay": [
    "Suzuma wishyure",
    "Vérifier et payer",
    "Kebera osasule",
    "Rever e pagar",
    "Kagua na ulipe",
    "Suzuma uriha",
  ],
  "Payment received": [
    "Ubwishyu bwakiriwe",
    "Paiement reçu",
    "Ssente zifunye",
    "Pagamento recebido",
    "Malipo yamepokelewa",
    "Uburiha bwakiriwe",
  ],
  "Download receipt": [
    "Kuramo inyemezabwishyu",
    "Télécharger le reçu",
    "Wanula lisiiti",
    "Descarregar recibo",
    "Pakua risiti",
    "Kuramwo icemezo",
  ],
  "Top up ShuleCard": [
    "Ongera amafaranga kuri ShuleCard",
    "Recharger la ShuleCard",
    "Teeka ssente ku ShuleCard",
    "Carregar o ShuleCard",
    "Ongeza salio la ShuleCard",
    "Ongera amafaranga kuri ShuleCard",
  ],
  "Pay with": [
    "Ishyura ukoresheje",
    "Payer avec",
    "Sasula ne",
    "Pagar com",
    "Lipa kwa",
    "Riha ukoresheje",
  ],
  "New goal": [
    "Intego nshya",
    "Nouvel objectif",
    "Ekigendererwa ekipya",
    "Novo objetivo",
    "Lengo jipya",
    "Intumbero nshasha",
  ],
  "Start saving": [
    "Tangira kuzigama",
    "Commencer à épargner",
    "Tandika okutereka",
    "Começar a poupar",
    "Anza kuweka akiba",
    "Tangura kuzigama",
  ],
  "Saving for your children": [
    "Kuzigamira abana bawe",
    "Épargner pour vos enfants",
    "Okuterekera abaana bo",
    "Poupar para os seus filhos",
    "Kuwawekea watoto akiba",
    "Kuzigamira abana bawe",
  ],
  "What are you saving for?": [
    "Urazigamira iki?",
    "Pour quoi épargnez-vous ?",
    "Oterekera ki?",
    "Para que está a poupar?",
    "Unawekea akiba nini?",
    "Urazigamira iki?",
  ],
  "ShuleKit selection": [
    "Guhitamo ShuleKit",
    "Choix du ShuleKit",
    "Okulonda ShuleKit",
    "Escolha do ShuleKit",
    "Uchaguzi wa ShuleKit",
    "Guhitamwo ShuleKit",
  ],
  "Give consent": [
    "Tanga uruhushya",
    "Donner son accord",
    "Waayo olukusa",
    "Dar consentimento",
    "Toa idhini",
    "Tanga uruhusha",
  ],
  "What you need to do": [
    "Ibyo ugomba gukora",
    "Ce que vous devez faire",
    "By’olina okukola",
    "O que precisa de fazer",
    "Unachotakiwa kufanya",
    "Ivyo utegerezwa gukora",
  ],
  "Plan for the day": [
    "Gahunda y’umunsi",
    "Programme de la journée",
    "Enteekateeka y’olunaku",
    "Plano do dia",
    "Ratiba ya siku",
    "Itegurwa ry’umunsi",
  ],
  Cost: ["Igiciro", "Coût", "Ebisale", "Custo", "Gharama", "Igiciro"],
  Safety: [
    "Umutekano",
    "Sécurité",
    "Obukuumi",
    "Segurança",
    "Usalama",
    "Umutekano",
  ],
  "What to pack": [
    "Ibyo gupakira",
    "À emporter",
    "By’okutwala",
    "O que levar",
    "Vitu vya kubeba",
    "Ivyo gutwara",
  ],
  "Enter the code": [
    "Andika kode",
    "Saisir le code",
    "Yingiza koodi",
    "Introduzir o código",
    "Weka msimbo",
    "Andika kode",
  ],
  Login: ["Injira", "Entrer", "Yingira", "Entrar", "Ingia", "Injira"],
  "Find your child": [
    "Shakisha umwana wawe",
    "Trouver votre enfant",
    "Noonya omwana wo",
    "Encontrar o seu filho",
    "Tafuta mtoto wako",
    "Rondera umwana wawe",
  ],
  "Check guardian number": [
    "Genzura nimero y’umubyeyi",
    "Vérifier le numéro du tuteur",
    "Kebera ennamba y’omuzadde",
    "Verificar o número do encarregado",
    "Hakiki namba ya mlezi",
    "Genzura inomero y’umuvyeyi",
  ],
  "Child linked": [
    "Umwana yahujwe",
    "Enfant lié",
    "Omwana agattiddwa",
    "Aluno associado",
    "Mtoto ameunganishwa",
    "Umwana yahujwe",
  ],
  "Send verification code": [
    "Ohereza kode yo kwemeza",
    "Envoyer le code de vérification",
    "Weereza koodi ey’okukakasa",
    "Enviar código de verificação",
    "Tuma msimbo wa uthibitisho",
    "Rungika kode yo kwemeza",
  ],
  "Verify and link": [
    "Emeza uhuze",
    "Vérifier et lier",
    "Kakasa ogatte",
    "Verificar e associar",
    "Thibitisha na uunganishe",
    "Emeza uhuze",
  ],
  "Learning journey": [
    "Urugendo rwo kwiga",
    "Parcours scolaire",
    "Olugendo lw’okusoma",
    "Percurso escolar",
    "Safari ya masomo",
    "Urugendo rwo kwiga",
  ],
  Payments: [
    "Ubwishyu",
    "Paiements",
    "Okusasula",
    "Pagamentos",
    "Malipo",
    "Uburiha",
  ],
  Messages: [
    "Ubutumwa",
    "Messages",
    "Obubaka",
    "Mensagens",
    "Ujumbe",
    "Ubutumwa",
  ],
  "Parent console": [
    "Urubuga rw’ababyeyi",
    "Espace parent",
    "Ekifo ky’abazadde",
    "Consola dos pais",
    "Dashibodi ya mzazi",
    "Ikibanza c’abavyeyi",
  ],
  "Get ready for next term": [
    "Itegure igihembwe gitaha",
    "Préparez le prochain trimestre",
    "Weetegekere olusoma oluddako",
    "Prepare o próximo período",
    "Jiandae kwa muhula ujao",
    "Witegurire igihembwe gikurikira",
  ],
  "Not requested yet": [
    "Ntibirasabwa",
    "Pas encore demandé",
    "Tekinnasabibwa",
    "Ainda não pedido",
    "Bado haijaombwa",
    "Ntibirasabwa",
  ],
  "Personal details": [
    "Amakuru bwite",
    "Informations personnelles",
    "Ebikukwatako",
    "Dados pessoais",
    "Taarifa binafsi",
    "Amakuru yihariye",
  ],
  "Term 3 fees": [
    "Amafaranga y’igihembwe cya 3",
    "Frais du 3e trimestre",
    "Ebisale by’olusoma 3",
    "Propinas do 3.º período",
    "Ada ya muhula wa 3",
    "Amafaranga y’igihembwe ca 3",
  ],
  PAID: ["YISHYUWE", "PAYÉ", "EBISASULIDDWA", "PAGO", "IMELIPWA", "VYARIHWE"],
  BALANCE: ["ASIGAYE", "SOLDE", "EBISIGADDE", "SALDO", "SALIO", "ASIGAYE"],
  GOALS: [
    "INTEGO",
    "OBJECTIFS",
    "EBIGENDERERWA",
    "OBJETIVOS",
    "MALENGO",
    "INTUMBERO",
  ],
  Paid: ["Yishyuwe", "Payé", "Bisasuliddwa", "Pago", "Imelipwa", "Vyarihwe"],
  Present: ["Ahari", "Présent", "Waali", "Presente", "Yupo", "Arahari"],
  "Show more": [
    "Erekana ibindi",
    "Afficher plus",
    "Laga ebirala",
    "Mostrar mais",
    "Onyesha zaidi",
    "Erekana ibindi",
  ],
  "Request ShuleKit for Term 1 2027": [
    "Saba ShuleKit y’igihembwe cya 1 2027",
    "Demander le ShuleKit du 1er trimestre 2027",
    "Saba ShuleKit ey’olusoma 1 2027",
    "Pedir o ShuleKit do 1.º período 2027",
    "Omba ShuleKit ya muhula wa 1 2027",
    "Saba ShuleKit y’igihembwe ca 1 2027",
  ],
  " powered by yoShule": [
    "Ishuri Ryisumbuye rya Umucyo · rikoresha yoShule",
    "Lycée Umucyo · propulsé par yoShule",
    "Essomero lya Umucyo · lyesigamye yoShule",
    "Escola Secundária Umucyo · com yoShule",
    "Shule ya Sekondari Umucyo · inaendeshwa na yoShule",
    "Ishure Ryisumbuye rya Umucyo · rikoresha yoShule",
  ],
};
const TRP = {
  "Optional note to the school": [
    "Ubutumwa bw’inyongera ku ishuri",
    "Note facultative pour l’école",
    "Obubaka obw’okwongerako eri essomero",
    "Nota opcional para a escola",
    "Ujumbe wa hiari kwa shule",
    "Ubutumwa bw’inyongera ku ishure",
  ],
  "Write a message…": [
    "Andika ubutumwa…",
    "Écrire un message…",
    "Wandiika obubaka…",
    "Escreva uma mensagem…",
    "Andika ujumbe…",
    "Andika ubutumwa…",
  ],
  "SDMS code / ShuleCard no.": [
    "Kode ya SDMS / nimero ya ShuleCard",
    "Code SDMS / n° ShuleCard",
    "Koodi ya SDMS / ennamba ya ShuleCard",
    "Código SDMS / n.º ShuleCard",
    "Msimbo wa SDMS / namba ya ShuleCard",
    "Kode ya SDMS / inomero ya ShuleCard",
  ],
};
const LI = () => ["rw", "fr", "lg", "pt", "sw", "rn"].indexOf(LANG);
function trNode(root) {
  const i = LI();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const raw = n.__en ?? n.data.trim();
    if (!raw) continue;
    const hit = TR[raw];
    if (!hit && n.__en == null) continue;
    n.__en = raw;
    const out = i < 0 ? raw : hit ? hit[i] : raw;
    if (n.data.trim() !== out) n.data = n.data.replace(n.data.trim(), out);
  }
  root.querySelectorAll &&
    root.querySelectorAll("[placeholder]").forEach((e) => {
      const raw = e.__ph ?? e.getAttribute("placeholder");
      const hit = TRP[raw];
      if (!hit) return;
      e.__ph = raw;
      e.setAttribute("placeholder", i < 0 ? raw : hit[i]);
    });
}
const LOBS = new MutationObserver((ms) => {
  if (LANG === "en") return;
  ms.forEach((m) =>
    m.addedNodes.forEach((x) => {
      if (x.nodeType === 1) trNode(x);
      else if (x.nodeType === 3 && x.parentNode) trNode(x.parentNode);
    }),
  );
});
LOBS.observe(document.getElementById("screen"), {
  childList: true,
  subtree: true,
});
function setLang(c) {
  LANG = c;
  try {
    localStorage.setItem("sp_lang", c);
  } catch (e) {}
  document.documentElement.lang = c;
  closeSheet();
  renderAll();
  renderLanding();
  trNode(document.getElementById("screen"));
  toast(LANGS.find((l) => l[0] === c)[1]);
}
function pickLang() {
  openSheet(
    `<h3>Choose your language</h3><p class="lead">The whole app switches, from the start page to the parent console.</p><div class="langs">${LANGS.map(([c, n, e]) => `<button class="${LANG === c ? "on" : ""}" onclick="setLang('${c}')"><i>${c.toUpperCase()}</i><span><b>${n}</b><small>${e}</small></span></button>`).join("")}</div>`,
  );
}
// language entry in the profile menu
const _openMore9 = openMore_p9;
function openMore() {
  _openMore9();
  const m = PST.at(-1).el.querySelector(".menu");
  if (m)
    m.insertAdjacentHTML(
      "afterbegin",
      `<div class="lr" onclick="pickLang()"><span class="pic">${svgI('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>')}</span><div><b>Language</b><small>${LANGS.find((l) => l[0] === LANG)[1]}</small></div><span style="color:var(--muted)">›</span></div>`,
    );
}

if (LANG !== "en")
  setTimeout(() => {
    document.documentElement.lang = LANG;
    trNode(document.getElementById("screen"));
  }, 0);
/* =========================================================
   v10 · ShuleCard & canteen activity in the profile · spend limits · uniform & shoe orders
   ========================================================= */
/* ---- transaction history (last 3 weeks) ---- */
const TXICON = {
  canteen: [
    "#FFF3DC",
    "#9A5B00",
    '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zM6 1v3M10 1v3M14 1v3"/>',
  ],
  shop: [
    "#E7ECF7",
    "#13213D",
    '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  ],
  library: [
    "#E7ECF7",
    "#13213D",
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>',
  ],
  topup: ["#E3F6EE", "#12784F", '<path d="M12 5v14M5 12h14"/>'],
  bus: [
    "#E7ECF7",
    "#13213D",
    '<rect x="3" y="4" width="18" height="13" rx="3"/><path d="M3 11h18"/>',
  ],
};
const MENU = [
  ["Milk and mandazi", 600],
  ["Fruit juice", 400],
  ["Chapati", 350],
  ["Samosa", 300],
  ["Rice and beans", 1500],
  ["Banana", 200],
  ["Yoghurt", 500],
  ["Bread and tea", 400],
  ["Ice lolly", 200],
  ["Groundnuts", 150],
];
function genTx(k) {
  if (k.cardtx && k.cardtx.length > 0) {
    return k.cardtx.map((t, idx) => ({
      d: new Date(Date.now() - idx * 86400000 * 2),
      t:
        t[2] > 0
          ? "topup"
          : t[1].toLowerCase().includes("shop")
            ? "shop"
            : "canteen",
      desc: t[1],
      amt: t[2],
      blocked: false,
    }));
  }
  return [];
}
const TXS = {};
const txOf = (k) => TXS[k.id] || (TXS[k.id] = genTx(k));
/* ---- spend limits ---- */
let LIMITS = {
  kevin: { on: true, period: "week", amount: 5000, alert: true, block: true },
  emely: { on: true, period: "week", amount: 3000, alert: true, block: true },
};
const NOW_D = new Date(2026, 9, 21, 23, 0);
const periodStart = (p) =>
  p === "day"
    ? new Date(2026, 9, 21)
    : p === "week"
      ? new Date(2026, 9, 19)
      : new Date(2026, 8, 7);
const PLABEL = { day: "today", week: "this week", term: "this term" };
const PNAME = { day: "Daily", week: "Weekly", term: "Termly" };
function spent(k, p) {
  const s = periodStart(p);
  return -txOf(k)
    .filter((t) => t.amt < 0 && !t.blocked && t.d >= s)
    .reduce((a, t) => a + t.amt, 0);
}
const dlabel = (d) => {
  const df = Math.round(
    (new Date(2026, 9, 21) -
      new Date(d.getFullYear(), d.getMonth(), d.getDate())) /
      864e5,
  );
  return df === 0
    ? "Today"
    : df === 1
      ? "Yesterday"
      : d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        });
};
const tlabel = (d) =>
  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function txRow(t) {
  const [bg, fg, ic] = TXICON[t.t];
  return `<div class="tx ${t.blocked ? "blk" : ""}"><span class="ti" style="background:${bg}"><svg viewBox="0 0 24 24" stroke="${fg}">${ic}</svg></span><div><b>${t.desc}</b><small>${tlabel(t.d)}${t.blocked ? " · declined: spending limit reached" : ""}</small></div><span class="a" style="color:${t.amt > 0 ? "var(--green)" : "var(--text)"}">${t.amt > 0 ? "+" : ""}${fmt(t.amt)}</span></div>`;
}
function limitCard(k) {
  const L = LIMITS[k.id];
  if (!L || !L.on)
    return `<div class="lim"><div class="m"><b>No spending limit</b><small>${k.first} can spend the whole card balance.</small></div><button class="chip amber" onclick="setLimit('${k.id}')">Set limit</button></div>`;
  const s = spent(k, L.period),
    p = s / L.amount;
  return `<div class="lim"><div class="m"><b>${PNAME[L.period]} limit · ${rwf(L.amount)}</b><small>${rwf(s)} spent ${PLABEL[L.period]} · ${s >= L.amount ? "limit reached" : rwf(L.amount - s) + " left"}</small></div><button class="chip navy" onclick="setLimit('${k.id}')">Change</button></div><div class="limbar"><i style="width:${Math.min(100, p * 100)}%;background:${p >= 1 ? "var(--red)" : p >= 0.8 ? "var(--amber)" : "var(--green)"}"></i></div>${L.block ? '<p class="qlnote">Purchases above the limit are declined at the canteen and shop.</p>' : ""}`;
}
let LS = {};
function setLimit(id) {
  const L = LIMITS[id] || {
    on: true,
    period: "week",
    amount: 500,
    alert: true,
    block: true,
  };
  LS = { id, ...L, on: true };
  limDraw();
}
function limDraw() {
  const k = learnerById(LS.id);
  const sug = {
    day: [300, 500, 1000, 1500],
    week: [500, 2000, 4000, 6000],
    term: [10000, 20000, 40000, 60000],
  }[LS.period];
  if (LS.__p && LS.__p !== LS.period && !sug.includes(LS.amount)) {
    LS.amount = sug[1];
  }
  LS.__p = LS.period;
  openSheet(`<div class="wzh"><small>ShuleCard · ${k.first}</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">Spending limit</h3><p class="lead">Choose how much ${k.first} can spend at the canteen and school shop.</p>
  <div class="lbl2" style="margin-top:14px">Limit per</div><div class="seg3">${["day", "week", "term"].map((p) => `<button class="${LS.period === p ? "on" : ""}" onclick="LS.period='${p}';limDraw()">${PNAME[p]}</button>`).join("")}</div>
  <div class="lbl2">Amount</div><div class="amt">${sug.map((v) => `<button class="${LS.amount === v ? "on" : ""}" onclick="LS.amount=${v};limDraw()">${fmt(v)}</button>`).join("")}</div>
  <div class="codein"><button style="pointer-events:none">RWF</button><input inputmode="numeric" value="${fmt(LS.amount)}" oninput="LS.amount=num(this.value)||0"></div>
  <div class="gnum" style="margin-top:12px">Spent ${PLABEL[LS.period]}: <span style="font-size:11px;font-weight:800;color:var(--navy)">${rwf(spent(k, LS.period))}</span></div>
  <div class="chan ${LS.alert ? "on" : ""}" style="margin-top:12px" onclick="LS.alert=!LS.alert;limDraw()"><span class="ci">${svgI(BELL)}</span><div><b>Alert me at 80%</b><small>SMS and app notification</small></div><span class="sw"></span></div>
  <div class="chan ${LS.block ? "on" : ""}" onclick="LS.block=!LS.block;limDraw()"><span class="ci" style="background:#FDE7E8">${svgI('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>')}</span><div><b>Decline purchases above the limit</b><small>Otherwise I just get an alert</small></div><span class="sw"></span></div>
  <button class="go" onclick="saveLimit()">Save limit</button>${LIMITS[LS.id] && LIMITS[LS.id].on ? `<button class="go" style="margin-top:8px;background:var(--bg);color:var(--navy)" onclick="LIMITS['${LS.id}'].on=false;closeSheet();refreshProf();toast('Spending limit removed')">Remove limit</button>` : ""}`);
}
function saveLimit() {
  if (!LS.amount) {
    toast("Enter an amount");
    return;
  }
  const { id, period, amount, alert, block } = LS;
  LIMITS[id] = { on: true, period, amount, alert, block };
  closeSheet();
  refreshProf();
  toast(
    `${PNAME[period]} limit of ${rwf(amount)} set for ${learnerById(id).first}`,
  );
}
function refreshProf() {
  PST.slice().forEach((p) => {
    if (p.o.k === "Student profile") {
      popPanel();
      setTimeout(openProfile, 40);
    } else if (p.o.t && p.o.t.endsWith("’s wallet")) {
      popPanel();
      setTimeout(openCard, 40);
    }
  });
  renderAll();
  if (SHOW) renderLanding();
}
let TXF = "all";
function activityCard(k, lim) {
  const list = txOf(k).filter(
    (t) =>
      TXF === "all" || t.t === TXF || (TXF === "canteen" && t.t === "canteen"),
  );
  const shown = list.slice(0, lim || 8);
  let last = "";
  return `<div class="txf">${[
    ["all", "All"],
    ["canteen", "Canteen"],
    ["shop", "Shop"],
    ["library", "Library"],
    ["topup", "Top-ups"],
  ]
    .map(
      ([v, l]) =>
        `<button class="${TXF === v ? "on" : ""}" onclick="TXF='${v}';refreshAct()">${l}</button>`,
    )
    .join("")}</div>
  ${
    shown
      .map((t) => {
        const dl = dlabel(t.d);
        const h = dl !== last ? `<div class="dayh">${(last = dl)}</div>` : "";
        return h + txRow(t);
      })
      .join("") || '<p class="qlnote">Nothing here yet.</p>'
  }`;
}
function refreshAct() {
  document.querySelectorAll(".actbox").forEach((b) => {
    const k = learnerById(b.dataset.k);
    b.innerHTML = activityCard(k, +b.dataset.lim || 0);
  });
}
function openActivity(id) {
  const k = learnerById(id);
  const can = -txOf(k)
    .filter(
      (t) => t.t === "canteen" && !t.blocked && t.d >= new Date(2026, 9, 19),
    )
    .reduce((a, t) => a + t.amt, 0);
  pushPanel({
    k: "ShuleCard · " + k.cardno,
    t: k.first + "’s transactions",
    s: "Canteen, school shop, library and top-ups",
    b: `${src("ShuleCard and School Canteen")}
  ${dk([
    [rwf(k.card), "Card balance", ""],
    [rwf(spent(k, "week")), "Spent this week", ""],
    [rwf(can), "Canteen this week", ""],
    [
      String(txOf(k).filter((t) => t.blocked).length),
      "Declined by limit",
      "",
      txOf(k).some((t) => t.blocked) ? "red" : "",
    ],
  ])}
  ${card(
    "Top canteen items · last 3 weeks",
    (() => {
      const m = {};
      txOf(k)
        .filter((t) => t.t === "canteen" && !t.blocked)
        .forEach((t) => {
          const n = t.desc.replace("Canteen · ", "");
          m[n] = (m[n] || 0) - t.amt;
        });
      const a = Object.entries(m)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 5);
      if (!a.length)
        return '<p class="qlnote" style="margin-top:0">No canteen spending yet.</p>';
      const mx = a[0][1] || 1;
      return hls(
        a.map(([n, v]) => [n, v, rwf(v), "amber"]),
        mx,
      );
    })(),
  )}
  <div class="card dcard"><h4>All transactions <small>Last 3 weeks</small></h4><div class="actbox" data-k="${k.id}" data-lim="200">${activityCard(k, 200)}</div></div>`,
  });
}
/* ---- student profile with activity and limits ---- */
const _openProfile10 = openProfile_p10;
function openProfile() {
  _openProfile10();
  const k = kid();
  const el = PST.at(-1).el.querySelector(".pnb");
  const anchor = el.querySelector(".qlnote");
  anchor.insertAdjacentHTML(
    "afterend",
    `<div class="card dcard"><h4>Spending limit <small>ShuleCard</small></h4>${limitCard(k)}</div>
  <div class="card dcard"><h4>ShuleCard and canteen activity <a style="font-size:10.5px;color:#9A5B00;cursor:pointer" onclick="openActivity('${k.id}')">See all</a></h4><div class="actbox" data-k="${k.id}" data-lim="8">${activityCard(k, 8)}</div></div>
  <div class="card dcard"><h4>Orders <a style="font-size:10.5px;color:#9A5B00;cursor:pointer" onclick="openOrders()">My orders</a></h4>${
    ORDERS.filter((o) => o.kid === k.id)
      .map(orderCard)
      .join("") ||
    '<p class="qlnote" style="margin-top:0">No uniform or shoe orders yet.</p>'
  }<div style="display:flex;gap:8px;margin-top:10px"><button class="chip amber" onclick="startOrder('uniform')">Order uniform</button><button class="chip amber" onclick="startOrder('shoes')">Order shoes</button></div></div>`,
  );
}
/* wallet uses the same limit and activity */
function openCard() {
  const k = kid();
  pushPanel({
    k: "ShuleCard · " + k.cardno,
    t: k.first + "’s wallet",
    s: "Pocket money for canteen, shop and library",
    b: `${src("ShuleCard and School Canteen")}
 <div class="fac"><small>Available balance</small><div class="big">${rwf(k.card)}</div><div class="row"><span>Last top-up<b>${rwf(k.lastTop[1])} · ${k.lastTop[0]}</b></span><span style="text-align:right">Spent this week<b>${rwf(spent(k, "week"))}</b></span></div><button class="btn amber" style="width:100%;height:42px;border-radius:13px;margin-top:12px;position:relative;z-index:1" onclick="topUp()">Top up</button></div>
 <div class="card dcard"><h4>Spending limit</h4>${limitCard(k)}</div>
 <div class="card dcard"><h4>Recent activity <a style="font-size:10.5px;color:#9A5B00;cursor:pointer" onclick="openActivity('${k.id}')">See all</a></h4><div class="actbox" data-k="${k.id}" data-lim="8">${activityCard(k, 8)}</div></div>
 <div class="card dcard"><h4>Card controls</h4><div class="chan" onclick="this.classList.toggle('on');toast(this.classList.contains('on')?'Card blocked · ask the bursary for a replacement':'Card unblocked')"><span class="ci" style="background:#FDE7E8">${svgI('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>')}</span><div><b>Block card</b><small>If the card is lost or stolen</small></div><span class="sw"></span></div></div>`,
  });
}
/* top-ups appear in the activity */
const _topUp10 = topUp_p10;
function topUp() {
  const k = kid();
  const before = k.card;
  _topUp10();
  const ob = new MutationObserver(() => {
    if (k.card !== before) {
      txOf(k).unshift({
        d: new Date(2026, 9, 21, 23, 5),
        t: "topup",
        desc: "Top-up · mobile money",
        amt: k.card - before,
      });
      ob.disconnect();
    }
  });
  ob.observe(document.getElementById("toast"), {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

/* ---- uniform & shoe orders: items, sizes, delivery, payment terms, tracking, exchange ---- */
const isGirl = (k) => (AVC[k.id] || [])[2] === "girl";
const CAT = {
  uniform: (k) => [
    ["Shirt, white, short sleeve", 4500, ["S", "M", "L", "XL"]],
    isGirl(k)
      ? ["Skirt, navy", 5500, ["24", "26", "28", "30"]]
      : ["Trousers, navy", 5500, ["26", "28", "30", "32"]],
    ["School sweater with crest", 7500, ["S", "M", "L", "XL"]],
    ["School tie", 1500, []],
    ["PE kit, T-shirt and shorts", 6000, ["S", "M", "L"]],
  ],
  shoes: (k) => [
    [
      "Black leather school shoes",
      12000,
      ["33", "34", "35", "36", "37", "38", "39", "40", "41"],
    ],
    [
      "Canvas PE shoes",
      6500,
      ["33", "34", "35", "36", "37", "38", "39", "40", "41"],
    ],
    ["School socks, 3 pairs", 2000, []],
  ],
};
let ORDERS = [];
let OW = {};
const OST = [
  "Ordered",
  "Payment",
  "Being prepared",
  "Dispatched",
  "Delivered",
  "Received by child",
  "Fit confirmed",
];
function startOrder(type) {
  const k = kid();
  const items = CAT[type](k).map(([n, p, s], i) => ({
    n,
    p,
    sizes: s,
    q: i === 0 ? (type === "uniform" ? 2 : 1) : 0,
    size: s.length
      ? type === "shoes"
        ? (k.kit || {}).shoe || s[3]
        : s.includes((k.kit || {}).uni)
          ? k.kit.uni
          : s[Math.min(1, s.length - 1)]
      : "",
  }));
  OW = {
    type,
    kid: k.id,
    items,
    step: 0,
    fit: false,
    del: "school",
    addr: "",
    pay: "full",
    method: "MTN MoMo",
  };
  owDraw();
}
const owTotal = () =>
  OW.items.reduce((a, i) => a + i.q * i.p, 0) + (OW.del === "home" ? 2000 : 0);
function owDraw() {
  const k = learnerById(OW.kid);
  const S = ["Items and sizes", "Delivery", "Payment", "Review"];
  const T = owTotal(),
    sub = OW.items.reduce((a, i) => a + i.q * i.p, 0);
  const inst = Math.ceil((T * 1.04) / 3 / 100) * 100;
  const goal = GOALS.find((g) => g.kid === OW.kid && g.saved > 0);
  const B = [
    () => `${OW.items.map((it, i) => `<div class="oit ${it.q ? "on" : ""}"><div class="t1"><div><b>${it.n}</b><small>${rwf(it.p)} each</small></div><div class="qty"><button onclick="OW.items[${i}].q=Math.max(0,OW.items[${i}].q-1);owDraw()">−</button><span>${it.q}</span><button onclick="OW.items[${i}].q=Math.min(4,OW.items[${i}].q+1);owDraw()">+</button></div></div>${it.sizes.length && it.q ? `<div class="sz">${it.sizes.map((s) => `<button class="${it.size === s ? "on" : ""}" onclick="OW.items[${i}].size='${s}';owDraw()">${s}</button>`).join("")}</div>` : ""}</div>`).join("")}
   <div class="chan ${OW.fit ? "on" : ""}" style="margin-top:12px" onclick="OW.fit=!OW.fit;owDraw()"><span class="ci">${svgI('<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>')}</span><div><b>Not sure of the size?</b><small>The school measures ${k.first} and exchanges free on delivery</small></div><span class="sw"></span></div>
   <button class="more" onclick="sizeGuide('${OW.type}')">Size guide</button>`,
    () =>
      `${[
        [
          "school",
          "Deliver to school",
          "Handed to " + k.first + " in class · 5–7 school days",
          "Free",
        ],
        ["home", "Home delivery in Kigali", "2 working days", "RWF 2,000"],
      ]
        .map(
          ([v, t, s, c]) =>
            `<div class="chan ${OW.del === v ? "on" : ""}" onclick="OW.del='${v}';owDraw()"><div><b>${t}</b><small>${s}</small></div><span class="chip ${c === "Free" ? "green" : "navy"}">${c}</span></div>`,
        )
        .join(
          "",
        )}${OW.del === "home" ? `<input class="txt" style="width:100%;height:44px;border:1.5px solid var(--line);border-radius:13px;padding:0 12px;margin-top:6px;font-family:inherit" placeholder="Delivery address and landmark" value="${OW.addr}" oninput="OW.addr=this.value">` : ""}`,
    () => `${[["full", "Pay in full now", rwf(T) + " by mobile money or card"], ["inst", (OW.type === "uniform" ? "Uniform" : "Shoe") + " voucher credit · 3 instalments", `${rwf(inst)} now, then 21 Nov and 21 Dec · 4% fee · Edupoto Finance`], ...(goal ? [["goal", "Use My goals savings", goal.name + " · " + rwf(goal.saved) + " saved"]] : [])].map(([v, t, s]) => `<div class="chan ${OW.pay === v ? "on" : ""}" onclick="OW.pay='${v}';owDraw()"><div><b>${t}</b><small>${s}</small></div><span class="radio" style="border:${OW.pay === v ? "6px solid var(--navy)" : "2px solid var(--line)"};width:20px;height:20px;border-radius:50%;flex-shrink:0"></span></div>`).join("")}
   ${OW.pay === "inst" ? '<div class="found" style="border-color:var(--green);background:#E3F6EE"><small style="color:#12784F">Pre-approved up to RWF 60,000 from your fee payment history. Instalments are collected by MoMo on the due dates.</small></div>' : ""}
   ${OW.pay !== "goal" ? `<div class="lbl2">Pay with</div><div class="paym">${["MTN MoMo", "Airtel Money", "Bank of Kigali", "Visa / Mastercard"].map((m) => `<button class="${OW.method === m ? "on" : ""}" onclick="OW.method='${m}';owDraw()">${m}</button>`).join("")}</div>` : ""}`,
    () =>
      `<div class="rev">${OW.items
        .filter((i) => i.q)
        .map(
          (i) =>
            `<div class="rr"><span>${i.q} × ${i.n}</span><b>${i.size ? "Size " + i.size : ""}</b></div>`,
        )
        .join(
          "",
        )}<div class="rr"><span>For</span><b>${k.n} · ${k.cls}</b></div><div class="rr"><span>Delivery</span><b>${{ school: "To school, in class", store: "Collect at school store", home: "Home · Kigali" }[OW.del]}</b></div><div class="rr"><span>Payment</span><b>${{ full: "In full · " + OW.method, inst: "3 instalments of " + rwf(inst), goal: "From goal savings" }[OW.pay]}</b></div><div class="rr"><span>Total</span><b>${rwf(OW.pay === "inst" ? inst * 3 : T)}</b></div></div>${OW.fit ? '<p class="qlnote">Sizes will be checked by the school at delivery.</p>' : ""}`,
  ];
  const last = OW.step === 3,
    ok = sub > 0;
  openSheet(`<div class="wzh"><small>${OW.type === "uniform" ? "Uniform" : "Shoes"} order · ${k.first} · Step ${OW.step + 1} of 4</small><button onclick="closeSheet()">✕</button></div><h3 style="margin-top:4px">${S[OW.step]}</h3>
  <div class="wz-prog">${S.map((_, i) => `<i class="${i < OW.step ? "on" : i === OW.step ? "cur" : ""}"></i>`).join("")}</div><div style="margin-top:12px">${B[OW.step]()}</div>
  <div class="sumbar"><span>${OW.items.reduce((a, i) => a + i.q, 0)} item${OW.items.reduce((a, i) => a + i.q, 0) === 1 ? "" : "s"}${OW.del === "home" ? " + delivery" : ""}${OW.pay === "inst" && OW.step >= 2 ? " · 3 instalments, 4% fee" : ""}</span><b>${rwf(OW.pay === "inst" && OW.step >= 2 ? inst * 3 : T)}</b></div>
  <div style="display:flex;gap:8px;margin-top:12px">${OW.step ? '<button class="go" style="background:var(--bg);color:var(--navy);flex:1" onclick="OW.step--;owDraw()">Back</button>' : ""}<button class="go" style="flex:2;${ok ? "" : "opacity:.35;pointer-events:none"}" onclick="${last ? "owPlace()" : "OW.step++;owDraw()"}">${last ? (OW.pay === "inst" ? "Accept terms and order" : "Place order") : "Continue"}</button></div>`);
}
function sizeGuide(type) {
  openSheet(
    `<h3>Size guide</h3><p class="lead">${type === "shoes" ? "Measure the foot from heel to longest toe." : "Measure around the chest under the arms."}</p>${
      type === "shoes"
        ? tbl(
            ["Foot length", "Size"],
            [
              ["20.5 cm", "33"],
              ["21.5 cm", "34"],
              ["22 cm", "35"],
              ["23 cm", "36"],
              ["23.5 cm", "37"],
              ["24 cm", "38"],
              ["25 cm", "39"],
              ["25.5 cm", "40"],
            ],
          )
        : tbl(
            ["Chest", "Age (approx.)", "Size"],
            [
              ["66–71 cm", "11–12", "S"],
              ["72–79 cm", "13–14", "M"],
              ["80–87 cm", "15–16", "L"],
              ["88–95 cm", "17+", "XL"],
            ],
          )
    }<button class="go" onclick="owDraw()">Back to the order</button>`,
  );
}
function owPlace() {
  const T = owTotal(),
    inst = Math.ceil((T * 1.04) / 3 / 100) * 100,
    code = (OW.type === "uniform" ? "UO" : "SO") + "-" + (2610 + ORDERS.length);
  const o = {
    id: code,
    type: OW.type,
    kid: OW.kid,
    items: OW.items.filter((i) => i.q).map((i) => ({ ...i })),
    del: OW.del,
    pay: OW.pay,
    method: OW.method,
    total: T,
    inst: OW.pay === "inst" ? { amt: inst, paid: 1 } : null,
    fit: OW.fit,
    stage: 1,
    exch: null,
  };
  if (OW.pay === "goal") {
    const g = GOALS.find((g) => g.kid === OW.kid && g.saved > 0);
    g.saved = Math.max(0, g.saved - T);
  }
  ORDERS.unshift(o);
  openSheet(`<div class="wdone" style="padding:10px 0 0"><div class="em">${svgI('<path d="M20 6 9 17l-5-5"/>').replace("<svg", '<svg width="34" height="34" fill="none" stroke="#13213D" stroke-width="2.6"')}</div><h3>Order placed</h3><p>Order ${code} · ${OW.pay === "inst" ? "first instalment " + rwf(inst) + " paid" : rwf(T) + " paid"}</p></div>
  <div class="receipt">${tbl(
    ["", ""],
    [
      ["Order", code],
      [
        "Delivery",
        {
          school: "To school · by 30 Oct",
          store: "School store · from 27 Oct",
          home: "Home · 24 Oct",
        }[o.del],
      ],
      [
        "Payment",
        {
          full: "Paid in full",
          inst: "1 of 3 instalments paid",
          goal: "Paid from savings",
        }[o.pay],
      ],
    ],
  )}</div>
  <button class="go" onclick="closeSheet();openOrder('${code}')">Track the order</button>`);
}
function orderCard(o) {
  const k = learnerById(o.kid);
  return `<div class="card ord" onclick="openOrder('${o.id}')"><div class="t1"><span class="oi">${svgI(o.type === "uniform" ? '<path d="M20.4 6.6 16 4l-4 2-4-2-4.4 2.6 2 4.4H6v9h12v-9h.4z"/>' : '<path d="M4 16v-4a4 4 0 0 1 4-4h1l3 4h6a3 3 0 0 1 3 3v1z"/><path d="M4 16h17v2H4z"/>')}</span><div class="m"><b>${o.type === "uniform" ? "School uniform" : "School shoes"} · ${k.first}</b><small>${o.id} · ${o.items.reduce((a, i) => a + i.q, 0)} items · ${rwf(o.total)}</small></div><span class="chip ${o.stage >= 6 ? "green" : o.exch ? "amber" : "navy"}">${o.exch && o.stage === 5 ? "Exchange" : OST[o.stage]}</span></div><div class="stg" style="margin-top:10px">${OST.map((_, j) => `<i class="${j < o.stage ? "on" : j === o.stage ? "cur" : ""}"></i>`).join("")}</div></div>`;
}
function openOrders() {
  pushPanel({
    k: "Uniforms and shoes",
    t: "My orders",
    s: "Track delivery, instalments and exchanges",
    b: `${ORDERS.length ? ORDERS.map(orderCard).join("") : '<p class="qlnote" style="text-align:center;padding:20px">No orders yet.</p>'}<div style="display:flex;gap:8px;margin-top:14px"><button class="bigbtn amber" style="margin:0" onclick="startOrder('uniform')">Order uniform</button><button class="bigbtn" style="margin:0" onclick="startOrder('shoes')">Order shoes</button></div>`,
  });
}
function openOrder(id) {
  const o = ORDERS.find((x) => x.id === id),
    k = learnerById(o.kid);
  const det = {
    school: "Delivered to school and handed over in class",
    home: "Home delivery, Kigali",
  }[o.del];
  PST.slice().forEach((p) => {
    if (p.o.t === "Order " + id) popPanel();
  });
  pushPanel({
    k: o.type === "uniform" ? "Uniform order" : "Shoes order",
    t: "Order " + id,
    s: k.n + " · " + k.cls,
    b: `${src("yoShule orders · school store · Edupoto Finance")}
  ${card("Where the order is", `<div class="vstep">${OST.map((s, j) => `<div class="${j < o.stage ? "ok" : j === o.stage ? "cur" : ""}"><b>${j === 4 ? (o.del === "home" ? "Delivered home" : o.del === "store" ? "Ready at the school store" : "Delivered to school") : s}</b><small>${["21 Oct", "Confirmed by " + (o.pay === "inst" ? "Edupoto Finance" : o.method), "School store and tailor", "On the way", "Expected by " + (o.del === "home" ? "24 Oct" : "30 Oct"), "ShuleCard tap when " + k.first + " collects", "By you"][j]}</small></div>`).join("")}</div>`)}
  ${card("Items", o.items.map((i) => `<div class="kit"><span class="q">${i.q}</span><div><b>${i.n}</b><small>${i.size ? "Size " + i.size : "One size"}${o.exch && o.exch.item === i.n ? " → exchange to " + o.exch.size : ""}</small></div><span class="p">${fmt(i.q * i.p)}</span></div>`).join("") + (o.del === "home" ? '<div class="kit"><span class="q">1</span><div><b>Home delivery</b></div><span class="p">2,000</span></div>' : ""), "RWF")}
  ${card(
    "Payment",
    o.inst
      ? `<div class="hl"><div class="r"><span>Instalments · ${o.inst.paid} of 3</span><span>${rwf(o.inst.amt * o.inst.paid)} of ${rwf(o.inst.amt * 3)}</span></div><div class="t"><i style="width:${(o.inst.paid / 3) * 100}%;background:var(--green)"></i></div></div>${tbl(
          ["Due", "RWF", "Status"],
          [
            ["21 Oct", fmt(o.inst.amt), '<span class="chip green">Paid</span>'],
            [
              "21 Nov",
              fmt(o.inst.amt),
              o.inst.paid >= 2
                ? '<span class="chip green">Paid</span>'
                : '<span class="chip navy">Upcoming</span>',
            ],
            [
              "21 Dec",
              fmt(o.inst.amt),
              o.inst.paid >= 3
                ? '<span class="chip green">Paid</span>'
                : '<span class="chip navy">Upcoming</span>',
            ],
          ],
        )}${o.inst.paid < 3 ? `<button class="bigbtn ghost" onclick="ORDERS.find(x=>x.id==='${id}').inst.paid++;toast('Instalment paid');openOrder('${id}')">Pay next instalment now</button>` : ""}`
      : `<p style="font-size:12px"><b style="color:var(--green)">${o.pay === "goal" ? "Paid from goal savings" : "Paid in full"}</b> · ${rwf(o.total)}${o.pay === "full" ? " · " + o.method : ""}</p>`,
  )}
  ${card("Delivery", `<p style="font-size:12px">${det}</p>${o.fit ? '<p class="qlnote">The school checks sizes at delivery and exchanges free.</p>' : ""}`)}
  ${o.stage === 5 && !o.exch ? `<button class="bigbtn" onclick="ORDERS.find(x=>x.id==='${id}').stage=6;toast('Thank you for confirming');openOrder('${id}')">Everything fits · confirm</button><button class="bigbtn ghost" style="margin-top:8px" onclick="exchangeSize('${id}')">Exchange a size</button>` : ""}
  ${o.exch && o.stage === 5 ? `<div class="found"><small>Exchange requested: ${o.exch.item} to size ${o.exch.size}. The school store swaps it within 3 school days.</small></div><button class="bigbtn" onclick="ORDERS.find(x=>x.id==='${id}').stage=6;toast('Exchange received');openOrder('${id}')">Exchange received · confirm</button>` : ""}
  ${o.stage >= 6 ? '<div class="found" style="border-color:var(--green);background:#E3F6EE"><small style="color:#12784F">Order complete. Thank you.</small></div>' : `<button class="demo" onclick="(o=>{o.stage=Math.min(6,o.stage+1);if(o.inst&&o.stage>=5)o.inst.paid=Math.max(o.inst.paid,1)})(ORDERS.find(x=>x.id==='${id}'));openOrder('${id}')">Demo: move to the next step ›</button>`}`,
  });
}
function exchangeSize(id) {
  const o = ORDERS.find((x) => x.id === id);
  const its = o.items.filter((i) => i.sizes.length);
  let pick = its[0].n,
    sz = its[0].sizes.find((s) => s !== its[0].size);
  const draw = () => {
    const it = its.find((i) => i.n === pick);
    openSheet(
      `<h3>Exchange a size</h3><p class="lead">Free exchange at the school store.</p><div class="lbl2" style="margin-top:12px">Item</div><div class="chips">${its.map((i) => `<button class="${pick === i.n ? "on" : ""}" data-n="${i.n}">${i.n.split(",")[0]}</button>`).join("")}</div><div class="lbl2">New size <small>was ${it.size}</small></div><div class="chips">${it.sizes.map((s) => `<button class="${sz === s ? "on" : ""}" data-s="${s}">${s}</button>`).join("")}</div><button class="go" id="exgo">Request exchange</button>`,
    );
    $("#sheet")
      .querySelectorAll("[data-n]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            pick = b.dataset.n;
            const i2 = its.find((i) => i.n === pick);
            sz = i2.sizes.find((s) => s !== i2.size);
            draw();
          }),
      );
    $("#sheet")
      .querySelectorAll("[data-s]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            sz = b.dataset.s;
            draw();
          }),
      );
    $("#exgo").onclick = () => {
      o.exch = { item: pick, size: sz };
      closeSheet();
      openOrder(id);
      toast("Exchange requested");
    };
  };
  draw();
}
/* services: Uniforms and Shoes open the order flow */
function shopFor(n) {
  closeSheet();
  if (n === "Uniforms") return startOrder("uniform");
  if (n === "Shoes voucher") return startOrder("shoes");
  openSheet(`<h3>${n}</h3><p class="lead">Coming soon.</p>`);
}

Object.assign(TR, {
  "Already linked? Sign in to the parent console": [
    "Usanzwe uhuje? Injira mu rubuga  rw'ababyeyi",
    "Déjà lié ? Connectez-vous à la console parent",
    "Wayungibwa dda? Yingira mu console y’abazadde",
    "Já ligado? Entre na consola dos pais",
    "Tayari umeunganishwa? Ingia kwenye konsoli ya mzazi",
    "Usanzwe uhujwe? Injira mu rubuga rw'abavyeyi",
  ],
  "Spending limit": [
    "Imbibi ryo gukoresha",
    "Limite de dépenses",
    "Ekkomo ku nsasaanya",
    "Limite de gastos",
    "Kikomo cha matumizi",
    "Urugero rwo gukoresha",
  ],
  "ShuleCard and canteen activity": [
    "Ibyakozwe kuri ShuleCard na kantine",
    "Activité ShuleCard et cantine",
    "Ebyakoleddwa ku ShuleCard ne kantiini",
    "Atividade ShuleCard e cantina",
    "Shughuli za ShuleCard na kantini",
    "Ibikorwa vya ShuleCard na kantine",
  ],
  "All transactions": [
    "Ibyakozwe byose",
    "Toutes les transactions",
    "Ebyakoleddwa byonna",
    "Todas as transações",
    "Miamala yote",
    "Ibikorwa vyose",
  ],
  Canteen: ["Kantine", "Cantine", "Kantiini", "Cantina", "Kantini", "Kantine"],
  "School shop": [
    "Iduka ry'ishuri",
    "Boutique scolaire",
    "Edduuka ly'essomero",
    "Loja escolar",
    "Duka la shule",
    "Iduka ry'ishure",
  ],
  Library: [
    "Isomero",
    "Bibliothèque",
    "Etterekero ly'ebitabo",
    "Biblioteca",
    "Maktaba",
    "Isomero",
  ],
  "Top-ups": [
    "Kongeramo amafaranga",
    "Recharges",
    "Okwongerako ssente",
    "Recargas",
    "Kuongeza salio",
    "Kwongerako amafaranga",
  ],
  Daily: [
    "Ku munsi",
    "Par jour",
    "Buli lunaku",
    "Diário",
    "Kila siku",
    "Ku musi",
  ],
  Weekly: [
    "Ku cyumweru",
    "Par semaine",
    "Buli wiiki",
    "Semanal",
    "Kila wiki",
    "Ku ndwi",
  ],
  Termly: [
    "Ku gihembwe",
    "Par trimestre",
    "Buli lusoma",
    "Por trimestre",
    "Kila muhula",
    "Ku gihembwe",
  ],
  "Save limit": [
    "Bika imbibi",
    "Enregistrer la limite",
    "Tereka ekkomo",
    "Guardar limite",
    "Hifadhi kikomo",
    "Bika urugero",
  ],
  "Set limit": [
    "Shyiraho imbibi",
    "Fixer une limite",
    "Teekawo ekkomo",
    "Definir limite",
    "Weka kikomo",
    "Shiraho urugero",
  ],
  Change: ["Hindura", "Modifier", "Kyusa", "Alterar", "Badilisha", "Hindura"],
  "See all": [
    "Reba byose",
    "Tout voir",
    "Laba byonna",
    "Ver tudo",
    "Ona yote",
    "Raba vyose",
  ],
  Orders: [
    "Ibyatumijwe",
    "Commandes",
    "Ebiragiddwa",
    "Encomendas",
    "Oda",
    "Ivyatumwe",
  ],
  "My orders": [
    "Ibyo natumije",
    "Mes commandes",
    "Ebyange bye naragidde",
    "Minhas encomendas",
    "Oda zangu",
    "Ivyo natumye",
  ],
  "Order uniform": [
    "Tumiza impuzankano",
    "Commander l'uniforme",
    "Ragira yunifoomu",
    "Encomendar uniforme",
    "Agiza sare",
    "Tumiza impuzu z'ishure",
  ],
  "Order shoes": [
    "Tumiza inkweto",
    "Commander des chaussures",
    "Ragira engatto",
    "Encomendar sapatos",
    "Agiza viatu",
    "Tumiza ibirato",
  ],
  "Items and sizes": [
    "Ibicuruzwa n'ingano",
    "Articles et tailles",
    "Ebintu n'obunene",
    "Artigos e tamanhos",
    "Bidhaa na saizi",
    "Ibintu n'ingene",
  ],
  Delivery: [
    "Kugeza",
    "Livraison",
    "Okutuusa",
    "Entrega",
    "Usafirishaji",
    "Kugeza",
  ],
  Payment: [
    "Kwishyura",
    "Paiement",
    "Okusasula",
    "Pagamento",
    "Malipo",
    "Kuriha",
  ],
  Review: ["Suzuma", "Vérifier", "Kebera", "Rever", "Hakiki", "Suzuma"],
  Continue: [
    "Komeza",
    "Continuer",
    "Genda mu maaso",
    "Continuar",
    "Endelea",
    "Bandanya",
  ],
  Back: ["Subira inyuma", "Retour", "Ddayo", "Voltar", "Rudi", "Subira inyuma"],
  "Place order": [
    "Ohereza itumiza",
    "Passer la commande",
    "Weereza ekiragiro",
    "Fazer encomenda",
    "Weka oda",
    "Rungika itumwa",
  ],
  "Order placed": [
    "Itumiza ryoherejwe",
    "Commande passée",
    "Ekiragiro kiweerezeddwa",
    "Encomenda feita",
    "Oda imewekwa",
    "Itumwa ryarungitswe",
  ],
  "Track the order": [
    "Kurikirana itumiza",
    "Suivre la commande",
    "Goberera ekiragiro",
    "Acompanhar a encomenda",
    "Fuatilia oda",
    "Kurikirana itumwa",
  ],
  "Where the order is": [
    "Aho itumiza rigeze",
    "Où en est la commande",
    "Ekiragiro we kituuse",
    "Onde está a encomenda",
    "Oda ilipo",
    "Aho itumwa rigeze",
  ],
  "Size guide": [
    "Uko wamenya ingano",
    "Guide des tailles",
    "Obulagirizi bw'obunene",
    "Guia de tamanhos",
    "Mwongozo wa saizi",
    "Uko wamenya ingene",
  ],
  "Exchange a size": [
    "Guhindura ingano",
    "Échanger une taille",
    "Kyusa obunene",
    "Trocar tamanho",
    "Badilisha saizi",
    "Guhindura ingene",
  ],
  "Request exchange": [
    "Saba guhindura",
    "Demander l'échange",
    "Saba okukyusa",
    "Pedir troca",
    "Omba kubadilisha",
    "Saba guhindura",
  ],
  "Pay in full now": [
    "Ishyura byose ubu",
    "Payer tout maintenant",
    "Sasula byonna kati",
    "Pagar tudo agora",
    "Lipa yote sasa",
    "Riha vyose ubu",
  ],
  "Pay with": [
    "Ishyura ukoresheje",
    "Payer avec",
    "Sasula nga okozesa",
    "Pagar com",
    "Lipa kwa",
    "Riha ukoresheje",
  ],
  "Deliver to school": [
    "Bigezwe ku ishuri",
    "Livrer à l'école",
    "Kituusibwe ku ssomero",
    "Entregar na escola",
    "Peleka shuleni",
    "Bishikirizwe ku ishure",
  ],
  "Home delivery in Kigali": [
    "Bigezwe mu rugo i Kigali",
    "Livraison à domicile à Kigali",
    "Kituusibwe ewaka e Kigali",
    "Entrega em casa em Kigali",
    "Kuletwa nyumbani Kigali",
    "Bishikirizwe muhira i Kigali",
  ],
  "Card controls": [
    "Igenzura ry'ikarita",
    "Contrôles de la carte",
    "Okufuga kaadi",
    "Controlos do cartão",
    "Udhibiti wa kadi",
    "Kugenzura ikarata",
  ],
  "Block card": [
    "Funga ikarita",
    "Bloquer la carte",
    "Ggala kaadi",
    "Bloquear cartão",
    "Zuia kadi",
    "Hagarika ikarata",
  ],
  "Recent activity": [
    "Ibyakozwe vuba",
    "Activité récente",
    "Ebyakoleddwa gye buvuddeko",
    "Atividade recente",
    "Shughuli za karibuni",
    "Ibikorwa vya vuba",
  ],
  Today: ["Uyu munsi", "Aujourd'hui", "Leero", "Hoje", "Leo", "Uno musi"],
  Yesterday: ["Ejo hashize", "Hier", "Jjo", "Ontem", "Jana", "Ejo hahise"],
});
function restoreSavedSession() {
  try {
    const raw = localStorage.getItem("parent_login_data");
    const token = localStorage.getItem("parent_access_token");
    if (!token && !raw) return;

    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.parent) {
        PARENT = {
          id: data.parent.id,
          n:
            (
              (data.parent.firstName || "") +
              " " +
              (data.parent.lastName || "")
            ).trim() || "Parent",
          first: data.parent.firstName || "Parent",
          ph: data.parent.phone || "",
          email: data.parent.email || "",
        };
        MYPHONE = PARENT.ph;
      }
      if (data && Array.isArray(data.students) && data.students.length > 0) {
        KIDS = data.students.map((s: any) => ({
          id: s.id,
          n: s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim(),
          first: s.firstName || s.name?.split(" ")[0] || "Child",
          cls: s.className || "Student",
          lvl: s.className?.startsWith("S")
            ? "Secondary"
            : s.className?.startsWith("P")
              ? "Primary"
              : "School",
          code: s.studentCode || "",
          sdms: s.studentCode || "",
          cardno: "",
          photo: s.photo || null,
          gender: s.gender || "MALE",
          role: s.role || "FATHER",
          organizationId: s.organizationId || "",
          academicYear: s.academicYear || "",
          term: s.term || "",
          type: "Day scholar",
          ct: "",
          dorm: "",
          patron: "",
          card: 0,
          lastTop: ["—", 0],
          fees: 0,
          att: 0,
          avg: 0,
          prev: 0,
          trend: [],
          cls_avg: [],
          rank: "—",
          conduct: 0,
          today: {
            where: "",
            what: "",
            with: "",
            period: "",
            trail: [],
          },
          subj: [],
          hw: [],
          tests: [],
          cardtx: [],
          feeLines: [],
          health: [],
          disc: [],
          kit: {
            for: (s.className || "Student") + " (2027)",
            items: [],
            shoe: "",
            uni: "M",
          },
          bus: null,
          guardians: [PARENT.ph],
          schoolName: "",
        }));
        SAVED = KIDS.map((k) => k.id);
        K = 0;
        LSEL = 0;
      }
      if (token) {
        LOGGED = true;
        SHOW = true;
        CHILDREN_LOADING = true;
      }
    }
  } catch (e) {
    console.warn("[ParentApp] Session restore error:", e);
  }
}
restoreSavedSession();
renderAll();
renderLanding();

/* ================= REAL API INTEGRATION ================= */
import { parentApi } from "./services/parentApi";
import { formatParentPhone, parentRealApi } from "./services/parentRealApi";
import { API_BASE_URL } from "./services/config";

async function syncRealBackend(): Promise<boolean> {
  try {
    if (!parentRealApi.getToken()) return false;
    const bundle = await parentRealApi.loadBundle();
    if (bundle && bundle.kids && bundle.kids.length > 0) {
      PARENT = bundle.parent;
      KIDS = bundle.kids;
      LOGGED = true;
      SHOW = true;
      MYPHONE = PARENT.ph;
      if (typeof POOL !== "undefined" && POOL[0]) {
        POOL[0].guardians = [PARENT.ph];
      }
      SAVED = KIDS.map((k) => k.id);
      try {
        localStorage.setItem("sp_saved", JSON.stringify(SAVED));
      } catch (e) {}
      if (bundle.store && bundle.store.products) {
        const prods = bundle.store.products;
        for (const k of KIDS) {
          if (!k.kit)
            k.kit = { for: k.cls + " (2027)", items: [], shoe: "39", uni: "M" };
          k.kit.items = prods.slice(0, 7).map((p: any) => [p.name, 1, p.price]);
        }
      }
      try {
        renderAll();
      } catch (e) {
        console.warn("[ParentApp] renderAll after sync failed:", e);
      }
      try {
        renderLanding();
      } catch (e) {
        console.warn("[ParentApp] renderLanding after sync failed:", e);
      }
      console.log(
        "[ParentApp] Live backend synchronized successfully. Students:",
        KIDS.map((x) => x.n),
      );
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[ParentApp] Live backend sync error:", err);
    return false;
  }
}

// Hook real absence to backend
window.raSubmitReal = async function (
  reason: string,
  dates: string[] | string,
  notes?: string,
  studentId?: string,
) {
  const selectedKid = KIDS.find((item) => item.id === studentId) || kid();
  const selectedDates = (Array.isArray(dates) ? dates : [dates]).filter(
    Boolean,
  );
  if (!selectedKid || !selectedDates.length) return false;

  const results = await Promise.all(
    selectedDates.map((date) =>
      parentRealApi.reportAbsence({
        studentId: selectedKid.id,
        date,
        reason: reason || "Absence",
        notes: notes || "",
      }),
    ),
  );
  const failed = results.some(
    (result) => result == null || result.success === false,
  );
  toast(
    failed
      ? "Some absence dates could not be reported. Contact the school to confirm."
      : `Absence reported for ${selectedKid.first} · ${selectedDates.length} day${selectedDates.length === 1 ? "" : "s"}`,
  );
  return !failed;
};

/* ================= WEB/NATIVE PUSH (no notifications-module dependency) ================= */
const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor?.isNativePlatform?.();

async function registerPushNotifications(silent = false) {
  try {
    const mod = await import("./services/push");
    const res = await mod.registerPush({ silent });
    if (res && !silent) {
      toast("Notifications are on for this phone");
      try {
        mod.upsertNotification({
          id: "push-enabled",
          title: "yoShule notifications enabled",
          body: "You will now receive web push alerts for discipline, attendance, academic, fees, ShuleKit, Babyeyi wizard and Student Management.",
          type: "general",
          read: false,
        });
      } catch {}
    } else if (!res && !silent) {
      toast("Notifications could not be enabled on this device");
    }
    return !!res;
  } catch (e) {
    console.warn("[push] register error", e);
    if (!silent) toast("Notifications could not be enabled on this device");
    return false;
  }
}

async function showLocalNotification(title: string, body: string, url = "./", extra: any = {}) {
  try {
    // Persist to local push inbox so all modules can consume without notifications module
    try {
      const mod = await import("./services/push");
      mod.upsertNotification({ title, body, data: { url, ...(extra || {}) }, type: extra?.type || "general" });
    } catch {}
    if (isNative()) {
      const LocalNotifications = (window as any).Capacitor?.Plugins?.LocalNotifications;
      if (LocalNotifications) {
        await LocalNotifications.schedule({
          notifications: [{ id: Math.floor(Math.random() * 100000), title, body, schedule: { at: new Date(Date.now() + 400) }, iconColor: "#F5A623" }],
        });
        return;
      }
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, { body, icon: "./appLogo.png", badge: "./appLogo.png", tag: "yoshule-" + (title || "").slice(0, 20), data: { url } });
          return;
        }
      }
      new Notification(title, { body });
    }
  } catch (e) {
    console.warn("[push] show error", e);
  }
}

async function pollNotifications() {
  // Legacy API retained for compatibility; push store + service worker now deliver notifications.
  try { await (await import("./services/push")).initPush(); } catch {}
}
function startNotificationPolling() {
  // No polling: web push + local store replace notifications module.
  pollNotifications().catch(() => {});
}

try {
  import("./services/push").then((mod) => {
    mod.initPush?.();
    mod.listenForPushMessages?.();
    window.addEventListener(mod.PUSH_UPDATED_EVENT || "yoshule:notifications-updated", () => {
      try { renderAll?.(); } catch {}
    });
  });
} catch {}

// Expose all interactive functions on window for inline onclick handlers
const fns: Record<string, any> = {
  $,
  svgI,
  fmt,
  rwf,
  toast,
  go,
  openSheet,
  closeSheet,
  pushPanel,
  popPanel,
  renderAll,
  renderHome,
  renderLearn,
  renderPay,
  renderKit,
  renderChat,
  renderLanding,
  openCard,
  topUp,
  openAttendance,
  openHomework,
  openDiscipline,
  openToday,
  openTrips,
  openTrip,
  tripConsent,
  tripPay,
  getBabyeyi,
  reportAbsence,
  openChat,
  sendMsg,
  openCircular,
  openProfile,
  openHealth,
  openLeave,
  openNotif,
  openNotifSettings,
  openGoals,
  newGoal,
  createGoal,
  openOrders,
  openOrder,
  exchangeSize,
  shopFor,
  startKit,
  kitDetail,
  kitNext,
  kitConfirm,
  kitIssue,
  setLimit,
  saveLimit,
  scanQR,
  linkChild,
  openLandingChildren,
  toggleLandingChildren,
  openLandingConsole,
  selectLandingChild,
  toggleLandingFees,
  lookUp,
  foundPop,
  popSave,
  loginPortal,
  closeLoginPortal,
  doLogin,
  loginOtp,
  logout,
  enterConsole,
  showLanding,
  setLang,
  pickLang,
  kaziAdvance,
  payFees,
  attDay,
  guestDo,
  kitSave,
  kitSelect,
  landDo,
  lkDone,
  lkFind,
  openActivity,
  openGoal,
  openMore,
  openSubject,
  openReportCard,
  owDraw,
  pfDone,
  pfScan,
  quickDo,
  quickRemove,
  quickSave,
  saveKid,
  sizeGuide,
  startOrder,
  tripDay,
  unsaveKid,
  syncRealBackend,
  registerPushNotifications,
  showLocalNotification,
  pollNotifications,
  startNotificationPolling,
  selectKitType,
  num,
  unpaid,
  findKid,
  learnerById,
  bbStep,
  bbScan,
  pfStep,
  pfPay,
  kitStep,
  kitDone,
  kitPay,
  raDraw,
  tcStep,
  goalStep,
  lkStep,
  limDraw,
  tripRe,
  toggleChildRow,
  toggleQuickRow,
  selectKid,
  submitAbsence,
  openDocuments,
  handleDocFiles,
  deleteDocItem,
  downloadDocItem,
};
Object.assign(window, fns);

// Bind all state variables to window via getters and setters so any inline event handler or legacy code can read and write seamlessly
const globalProps: Record<string, { get: () => any; set: (v: any) => void }> = {
  lTab: {
    get: () => lTab,
    set: (v) => {
      lTab = v;
    },
  },
  DOC_TAB: {
    get: () => DOC_TAB,
    set: (v) => {
      DOC_TAB = v;
    },
  },
  DOCS: {
    get: () => DOCS,
    set: (v) => {
      DOCS = v;
    },
  },
  OPENID: {
    get: () => OPENID,
    set: (v) => {
      OPENID = v;
    },
  },
  LSEL: {
    get: () => LSEL,
    set: (v) => {
      LSEL = v;
    },
  },
  K: {
    get: () => K,
    set: (v) => {
      K = v;
    },
  },
  KIT: {
    get: () => KIT,
    set: (v) => {
      KIT = v;
    },
  },
  KW: {
    get: () => KW,
    set: (v) => {
      KW = v;
    },
  },
  G: {
    get: () => G,
    set: (v) => {
      G = v;
    },
  },
  SHOW: {
    get: () => SHOW,
    set: (v) => {
      SHOW = v;
    },
  },
  LOGGED: {
    get: () => LOGGED,
    set: (v) => {
      LOGGED = v;
    },
  },
  LOOK: {
    get: () => LOOK,
    set: (v) => {
      LOOK = v;
    },
  },
  FOUND: {
    get: () => FOUND,
    set: (v) => {
      FOUND = v;
    },
  },
  FOUNDL: {
    get: () => FOUNDL,
    set: (v) => {
      FOUNDL = v;
    },
  },
  KIDS: {
    get: () => KIDS,
    set: (v) => {
      KIDS = v;
    },
  },
  SAVED: {
    get: () => SAVED,
    set: (v) => {
      SAVED = v;
    },
  },
  QSAVED: {
    get: () => QSAVED,
    set: (v) => {
      QSAVED = v;
    },
  },
  POOL: {
    get: () => POOL,
    set: (v) => {
      POOL = v;
    },
  },
  PARENT: {
    get: () => PARENT,
    set: (v) => {
      PARENT = v;
    },
  },
  LANG: {
    get: () => LANG,
    set: (v) => {
      LANG = v;
    },
  },
  ORDERS: {
    get: () => ORDERS,
    set: (v) => {
      ORDERS = v;
    },
  },
  OW: {
    get: () => OW,
    set: (v) => {
      OW = v;
    },
  },
  GOALS: {
    get: () => GOALS,
    set: (v) => {
      GOALS = v;
    },
  },
  TRIPS: {
    get: () => TRIPS,
    set: (v) => {
      TRIPS = v;
    },
  },
  LIMITS: {
    get: () => LIMITS,
    set: (v) => {
      LIMITS = v;
    },
  },
  RA: {
    get: () => RA,
    set: (v) => {
      RA = v;
    },
  },
  BB: {
    get: () => BB,
    set: (v) => {
      BB = v;
    },
  },
  PF: {
    get: () => PF,
    set: (v) => {
      PF = v;
    },
  },
  LK: {
    get: () => LK,
    set: (v) => {
      LK = v;
    },
  },
  TC: {
    get: () => TC,
    set: (v) => {
      TC = v;
    },
  },
};

for (const [key, descriptor] of Object.entries(globalProps)) {
  try {
    Object.defineProperty(window, key, {
      get: descriptor.get,
      set: descriptor.set,
      configurable: true,
      enumerable: true,
    });
  } catch (e) {
    (window as any)[key] = descriptor.get();
  }
}

function setupPwaInstallPrompt() {
  if ((window as any).Capacitor?.isNativePlatform?.()) return;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("[PWA] service worker registration failed", error);
    });
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem("sp_install_dismissed") === "1";
  } catch (e) {}
  if (isStandalone || dismissed) return;

  let installPrompt: any = null;
  const banner = document.createElement("aside");
  banner.className = "pwa-install-banner";
  banner.setAttribute("aria-label", "Install yoShule Parent App");
  banner.innerHTML = `<img src="./appLogo.png" alt="" width="42" height="42"><div class="pwa-install-copy"><strong>Install yoShule</strong><span>Open your parent app from your home screen</span></div><button class="pwa-install-action" type="button">Install</button><button class="pwa-install-dismiss" type="button" aria-label="Dismiss install prompt">&times;</button>`;
  document.body.append(banner);

  window.addEventListener("beforeinstallprompt", (event: any) => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    banner.remove();
  });

  banner
    .querySelector(".pwa-install-action")
    ?.addEventListener("click", async () => {
      if (installPrompt) {
        const prompt = installPrompt;
        installPrompt = null;
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice?.outcome === "accepted") banner.remove();
        return;
      }

      const isIos =
        /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      openSheet(
        `<h3>Install yoShule</h3><p class="lead">${isIos ? "Tap Share, then choose Add to Home Screen." : "Open your browser menu and choose Install app or Add to Home Screen."}</p><button class="go" onclick="closeSheet()">Got it</button>`,
      );
    });

  banner
    .querySelector(".pwa-install-dismiss")
    ?.addEventListener("click", () => {
      banner.remove();
      try {
        localStorage.setItem("sp_install_dismissed", "1");
      } catch (e) {}
    });
}

(window as any).__appStarted = true;

// Restore a real session only when a token is already stored.
if (parentRealApi.getToken()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      syncRealBackend().finally(() => {
        CHILDREN_LOADING = false;
        renderAll();
        renderLanding();
      });
    });
  } else {
    syncRealBackend().finally(() => {
      CHILDREN_LOADING = false;
      renderAll();
      renderLanding();
    });
  }
}

setupPwaInstallPrompt();

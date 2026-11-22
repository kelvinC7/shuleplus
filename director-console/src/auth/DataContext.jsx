import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { director } from '../lib/api/director';
import { useAuth } from '../auth/AuthContext';

const DataContext = createContext({ branches: [], overview: null, context: null, loading: false, selectedOrgId: null, setSelectedOrgId: () => {}, academicYear: null, term: null, setAcademicYear: () => {}, setTerm: () => {} });

function shortCode(name = '', code = '') {
  if (code) return String(code).slice(-2).toUpperCase();
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'S') + (parts[1]?.[0] || parts[0]?.[1] || 'C');
}

function mapBranch(b, ovSchool, fin, att) {
  const id = b.id || b.organizationId;
  const name = b.name || b.organizationName || 'School';
  const stu = Number(b.students ?? b.studentCount ?? ovSchool?.students ?? 0);
  const staff = Number(b.staff ?? b.staffCount ?? ovSchool?.staff ?? 0);
  const attRate = Number(att?.studentRate ?? ovSchool?.attendanceRate ?? 0);
  const inn = attRate && stu ? Math.round((attRate / 100) * stu) : (stu ? Math.round(stu * 0.95) : 0);
  const on = staff ? Math.max(0, staff - (att?.staffRate === 0 ? 0 : 0)) : 0;
  const billed = Number(fin?.feesBilled ?? b.feesBilled ?? 0);
  const collected = Number(fin?.feesCollected ?? b.feesCollected ?? 0);
  const fees = billed ? Math.round((collected / billed) * 100) : Number(b.feeCollectionRate ?? 0);
  const ft = Number(fin?.feesToday ?? b.feesToday ?? 0);
  const academic = Number(ovSchool?.academicScore ?? ovSchool?.passRate ?? 0);
  const health = Math.round(Math.max(0, Math.min(100, (attRate || 80) * 0.5 + (fees || academic || 80) * 0.3 + (academic || 80) * 0.2))) || Number(b.health ?? 80);
  return {
    id,
    sh: b.shortName || name,
    cr: shortCode(name, b.organizationCode || b.code),
    name,
    loc: [b.sector, b.district].filter(Boolean).join(', ') || b.loc || '',
    lv: b.level || b.schoolType || b.category || '',
    est: b.established || b.since || '',
    stu, inn, staff, on, fees, billed, ft, health,
    tn: b.teachingNow || b.tn || [0, 0],
    note: b.note || ['green', ''],
    al: Array.isArray(b.alerts) ? b.alerts : [],
    _raw: b,
  };
}

export function DataProvider({ children }) {
  const { token } = useAuth();
  const [branches, setBranches] = useState([]);
  const [context, setContext] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [term, setTerm] = useState(null);

  useEffect(() => {
    if (!token) { setBranches([]); setContext(null); setOverview(null); return; }
    let on = true;
    setLoading(true);
    (async () => {
      try {
        const ctx = await director.context(token).catch((e) => { console.warn('director context failed', e); return null; });
        if (!on) return;
        if (ctx) setContext(ctx);
        const pickId = (v) => (v && typeof v === 'object' ? (v.id || v.value || v.label) : v);
        const yrs = (ctx?.academicYears || []).map(pickId).filter(Boolean);
        const terms = (ctx?.terms || []).map(pickId).filter(Boolean);
        if (yrs.length) setAcademicYear((y) => y || yrs[yrs.length - 1] || yrs[0]);
        if (terms.length) setTerm((t) => t || terms[terms.length - 1] || terms[0]);

        let bs = Array.isArray(ctx?.branches) ? ctx.branches : [];
        if (!bs.length) {
          // fallback: same source SchoolRepresentative backend uses (IAM representative)
          try {
            const iamSchools = await (await import('../lib/api/iam')).iam.repSchools(token, { includePerformance: true });
            const list = Array.isArray(iamSchools) ? iamSchools : iamSchools?.schools || iamSchools?.items || iamSchools?.data || [];
            if (Array.isArray(list)) bs = list;
          } catch (e) { console.warn('iam rep schools failed', e); }
        }
        if (!on) return;
        const mapped = (Array.isArray(bs) ? bs : []).map((b) => mapBranch(b));
        setBranches(mapped);
        if (mapped.length) setSelectedOrgId((prev) => (prev && mapped.some(b => b.id === prev)) ? prev : mapped[0].id);
      } catch (e) { console.warn('context load failed', e); }
      finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [token]); // eslint-disable-line

  useEffect(() => {
    if (!token || !context) return;
    const orgId = selectedOrgId || (context.branches?.[0]?.id || context.branches?.[0]?.organizationId);
    if (!orgId) return;
    const pickId = (v) => (v && typeof v === 'object' ? (v.id || v.value || v.label) : v);
    const yr = academicYear || pickId(context.academicYears?.slice(-1)[0]);
    const tm = term || pickId(context.terms?.slice(-1)[0]);
    let on = true;
    (async () => {
      try {
        let ov = await director.overview(token, { organizationId: orgId, academicYear: yr, term: tm }).catch(() => null);
        if (!ov) {
          try { ov = await (await import('../lib/api/iam')).iam.repOverview(token, { organizationId: orgId, academicYear: yr, term: tm }); } catch {}
        }
        if (!on) return;
        setOverview(ov);
        const bs = Array.isArray(context.branches) ? context.branches : [];
        const finBy = Object.fromEntries((ov?.financial || []).map(f => [f.organizationId || f.id, f]));
        const attBy = Object.fromEntries((ov?.attendance?.bySchool || []).map(a => [a.organizationId || a.id, a]));
        const perfBy = Object.fromEntries((ov?.schoolPerformance || []).map(p => [p.organizationId || p.id, p]));
        if (bs.length) {
          setBranches(bs.map((b) => {
            const bid = b.id || b.organizationId;
            const base = mapBranch(b, perfBy[bid], finBy[bid], attBy[bid]);
            // enrich with summary when single school
            if (bs.length === 1 || selectedOrgId === bid) {
              const s = ov?.summary || {};
              const at = ov?.attendance?.summary || {};
              base.inn = at.studentRate && base.stu ? Math.round((at.studentRate / 100) * base.stu) : base.inn;
              base.on = at.staffRate && base.staff ? Math.round((at.staffRate / 100) * base.staff) : base.on;
              if (s.feesBilled) base.billed = s.feesBilled;
              if (s.feesCollected != null && base.billed) base.fees = Math.round((s.feesCollected / base.billed) * 100);
              if (s.feesCollected != null) base._feesCollected = s.feesCollected;
              if (s.feesOutstanding != null) base._feesOutstanding = s.feesOutstanding;
              if (s.healthScore) base.health = s.healthScore;
              if (ov?.teaching) base.tn = [Number(ov.teaching.teaching || 0), Number(ov.teaching.sessions || 0)];
              base.al = (ov?.attention || []).map(a => [a.title, a.body, a.link || '']);
            }
            return base;
          }));
        }
      } catch {}
    })();
    return () => { on = false; };
  }, [token, context, selectedOrgId, academicYear, term]); // eslint-disable-line

  const value = useMemo(() => ({ branches, overview, context, loading, selectedOrgId, setSelectedOrgId, academicYear, term, setAcademicYear, setTerm }), [branches, overview, context, loading, selectedOrgId, academicYear, term]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);

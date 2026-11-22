import { API_BASE_URL, STUDENT_API_BASE_URL, STUDENT_API_LOGIN_URL } from './config';

const API_BASE = API_BASE_URL;
const STUDENT_API_BASE = STUDENT_API_BASE_URL;

export interface RealParent {
  id: string;
  n: string;
  first: string;
  ph: string;
  email: string;
}

export interface RealKid {
  id: string;
  n: string;
  first: string;
  cls: string;
  lvl: string;
  code: string;
  sdms: string;
  cardno: string;
  photo?: string | null;
  gender?: string;
  role?: string;
  organizationId?: string;
  academicYear?: string;
  term?: string;
  schoolName?: string;
  type: string;
  ct: string;
  dorm: string;
  patron: string;
  card: number;
  lastTop: [string, number];
  fees: number;
  att: number;
  avg: number;
  prev: number;
  trend: number[];
  cls_avg: number[];
  rank: string;
  conduct: number;
  today: {
    where: string;
    what: string;
    with: string;
    period: string;
    trail: Array<[string, string, string]>;
  };
  todayLessons: Array<{
    period: string;
    subject: string;
    teacher: string;
    room: string;
    startTime: string;
    endTime: string;
  }>;
  subj: Array<[string, number, string, string]>;
  subjectMarks: Record<
    string,
    Array<{
      title: string;
      type: string;
      pct: number;
      score: number;
      maxScore: number;
      grade: string;
      date: string;
    }>
  >;
  reportCards: Array<{
    id: string;
    classId: string;
    term: string;
    academicYear: string;
    reportKind: string;
    className: string;
    publishedAt: string;
    allowed: boolean;
    message: string;
  }>;
  trendLabels: string[];
  hw: Array<[string, string, string, string, string, string]>;
  tests: Array<[string, string, string]>;
  cardtx: Array<[string, string, number]>;
  feeLines: Array<[string, string, string, string]>;
  health: Array<[string, string, string, string]>;
  disc: Array<[string, string, string, string]>;
  attendance?: Array<{
    date: string;
    status: string;
    notes?: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
  }>;
  attendanceSummary?: {
    monthlyPresent?: number;
    monthlyAbsent?: number;
    monthlyLate?: number;
    monthlyExcused?: number;
    attendanceRate?: number;
  };
  kit: {
    for: string;
    items: Array<[string, number, number]>;
    shoe: string;
    uni: string;
  };
  bus?: {
    n: string;
    route: string;
    drv: string;
    ph: string;
    pick: string;
    drop: string;
    st?: string;
  } | null;
}

export function formatParentPhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('250')) {
    return '0' + digits.slice(3).replace(/^0+/, '');
  }
  if (digits.startsWith('0')) {
    return digits;
  }
  if (digits.length === 9) {
    return '0' + digits;
  }
  return digits;
}

export class ParentRealApiService {
  private token: string | null = null;
  private currentLoginData: any = null;

  constructor() {
    this.token = localStorage.getItem('parent_access_token');
    try {
      const saved = localStorage.getItem('parent_login_data');
      if (saved) this.currentLoginData = JSON.parse(saved);
    } catch {}
  }

  getLoginData() {
    return this.currentLoginData;
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('parent_access_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('parent_access_token', token);
  }

  clearToken() {
    this.token = null;
    this.currentLoginData = null;
    localStorage.removeItem('parent_access_token');
    localStorage.removeItem('parent_login_data');
  }

  async fetchParentProfile() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await this.fetchWithTimeout(`${STUDENT_API_BASE}/public/parents/auth/me`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.currentLoginData = json.data;
          try {
            localStorage.setItem('parent_login_data', JSON.stringify(json.data));
          } catch {}
          return json.data;
        }
      }
    } catch (e) {
      console.warn('[ParentRealApi] fetchParentProfile error:', e);
    }
    return null;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchApi<T>(path: string, options: RequestInit = {}): Promise<T | null> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await this.fetchWithTimeout(`${API_BASE}${path}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        console.warn(`[ParentRealApi] ${path} returned status ${res.status}`);
        return null;
      }

      const json = await res.json();
      return json.data ?? json;
    } catch (err) {
      console.warn(`[ParentRealApi] fetch error for ${path}:`, err);
      return null;
    }
  }

  private async fetchApiStrict<T>(
    path: string,
    options: RequestInit = {},
    timeoutMs = 15000
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await this.fetchWithTimeout(
      `${API_BASE}${path}`,
      {
        ...options,
        headers,
      },
      timeoutMs
    );

    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || `Request failed (${res.status})`);
    }
    return (json?.data ?? json) as T;
  }

  async initiateCollectionPayment(payload: {
    studentId?: string;
    amount: number;
    phone: string;
    purpose?: string;
    description?: string;
    metadata?: unknown;
  }) {
    return this.fetchApiStrict<any>(
      '/payments/collections',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      45000
    );
  }

  async getCollectionPaymentStatus(reference: string) {
    return this.fetchApiStrict<any>(
      `/payments/collections/${encodeURIComponent(reference)}/status`,
      {},
      25000
    );
  }

  async getReportCard(query: {
    studentId: string;
    classId: string;
    academicYear: string;
    term: string;
    reportKind?: string;
  }) {
    const params = new URLSearchParams({
      studentId: query.studentId,
      classId: query.classId,
      academicYear: query.academicYear,
      term: query.term,
    });
    if (query.reportKind) params.set('reportKind', query.reportKind);
    return this.fetchApiStrict<any>(`/report-cards/view?${params.toString()}`, {}, 25000);
  }

  async lookupStudent(code: string) {
    const query = String(code || '').trim();
    if (!query) return null;
    try {
      const res = await this.fetchWithTimeout(
        `${STUDENT_API_BASE}/public/students/lookup?code=${encodeURIComponent(query)}`
      );
      if (!res.ok) {
        console.warn(`[ParentRealApi] student lookup returned status ${res.status}`);
        return null;
      }
      const json = await res.json();
      return json.success && json.data ? json.data : null;
    } catch (err) {
      console.warn('[ParentRealApi] student lookup network error:', err);
      throw err;
    }
  }

  async claimParentByCode(input: {
    studentCode: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    role: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  }) {
    const res = await this.fetchWithTimeout(`${STUDENT_API_BASE}/public/parents/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false || !json?.data) {
      throw new Error(json?.message || `Child linking failed (${res.status})`);
    }
    return json.data;
  }

  async login(phone: string, pin: string) {
    const formattedPhone = formatParentPhone(phone);
    const payload = JSON.stringify({ phone: formattedPhone, pin });
    const headers = { 'Content-Type': 'application/json' };

    const tryLogin = async (url: string) => {
      try {
        const res = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: payload,
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json?.success && json?.data?.token) return json.data;
        // Some APIs may return token/data at top level
        if (json?.token) return json;
        return null;
      } catch {
        return null;
      }
    };

    // Try configured StudentManagement login first, then ParentMIS local/public auth (seeded local data)
    const urls = [
      STUDENT_API_LOGIN_URL,
      `${API_BASE}/public/parents/auth/login`,
    ].filter((u, i, arr) => u && arr.indexOf(u) === i);

    for (const url of urls) {
      const data = await tryLogin(url);
      if (data?.token) {
        this.setToken(data.token);
        this.currentLoginData = data;
        try {
          localStorage.setItem('parent_login_data', JSON.stringify(data));
        } catch {}
        return data;
      }
    }
    return null;
  }

  async loadBundle() {
    const token = this.getToken();
    if (!token) return null;

    // 1. Fetch module data in parallel (notifications come via web push/local store, not notifications module)
    let notifData: any = null;
    try {
      const { getStoredNotifications } = await import('./push');
      notifData = { notifications: getStoredNotifications() };
    } catch {
      notifData = { notifications: [] };
    }
    const [storeData, eventsData, tripsData, goalsData, babyeyiSchools, initialDash] = await Promise.all([
      this.fetchApi<any>('/store'),
      this.fetchApi<any[]>('/events'),
      this.fetchApi<any[]>('/trips'),
      this.fetchApi<any[]>('/goals'),
      this.fetchApi<any[]>('/public/babyeyi/schools'),
      this.fetchApi<any>('/dashboard'),
    ]);

    // Ensure we have current login/session data from StudentManagement
    let loginData = this.getLoginData();
    if (!loginData || !loginData.parent || !loginData.students || !loginData.students.length) {
      const fetched = await this.fetchParentProfile();
      if (fetched) loginData = fetched;
    }

    const parentAccount = loginData?.parent || initialDash?.parent || {};
    const parentFullName = (
      parentAccount.name ||
      `${parentAccount.firstName || ''} ${parentAccount.lastName || ''}`
    ).trim();

    const parent: RealParent = {
      id: parentAccount.id || 'p-1',
      n: parentFullName || 'Parent',
      first: parentAccount.firstName || (parentFullName ? parentFullName.split(' ')[0] : 'Parent'),
      ph: parentAccount.phone || '',
      email: parentAccount.email || '',
    };

    // Combine all students from loginData + initialDash.linkedStudents
    const targetStudents: Array<{
      id: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      studentCode?: string;
      className?: string;
      academicYear?: string;
      term?: string;
      photo?: string | null;
      gender?: string;
      role?: string;
      organizationId?: string;
    }> = [];

    const seenStudentIds = new Set<string>();

    if (loginData?.students && Array.isArray(loginData.students)) {
      for (const s of loginData.students) {
        if (s.id && !seenStudentIds.has(s.id)) {
          seenStudentIds.add(s.id);
          targetStudents.push(s);
        }
      }
    }

    if (initialDash?.linkedStudents && Array.isArray(initialDash.linkedStudents)) {
      for (const s of initialDash.linkedStudents) {
        if (s.id && !seenStudentIds.has(s.id)) {
          seenStudentIds.add(s.id);
          targetStudents.push({
            id: s.id,
            name: s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
            firstName: s.firstName,
            lastName: s.lastName,
            studentCode: s.shuleCode,
            className: s.className,
            photo: s.avatarUrl,
            role: s.relationship,
            organizationId: s.organizationId,
          });
        }
      }
    }

    // If still no students found, fallback to initialDash.student
    if (targetStudents.length === 0 && initialDash?.student?.id) {
      const s = initialDash.student;
      targetStudents.push({
        id: s.id,
        name: s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        firstName: s.firstName,
        lastName: s.lastName,
        studentCode: s.shuleCode,
        className: s.class || s.className,
        photo: s.avatarUrl,
        organizationId: s.organizationId,
      });
    }

    const kids: RealKid[] = [];

    for (const s of targetStudents) {
      const sid = s.id;
      const [dash, acad, att, fees, wallet, hw, disc, hlth, tt, reports] = await Promise.all([
        this.fetchApi<any>(`/dashboard?studentId=${sid}`),
        this.fetchApi<any>(`/academics?studentId=${sid}`),
        this.fetchApi<any>(`/attendance?studentId=${sid}`),
        this.fetchApi<any>(`/fees?studentId=${sid}`),
        this.fetchApi<any>(`/wallet?studentId=${sid}`),
        this.fetchApi<any[]>(`/homework?studentId=${sid}`),
        this.fetchApi<any>(`/discipline?studentId=${sid}`),
        this.fetchApi<any[]>(`/health-records?studentId=${sid}`),
        this.fetchApi<any>(`/timetable?studentId=${sid}`),
        this.fetchApi<any>(`/report-cards?studentId=${sid}`),
      ]);

      const st = dash?.student || {};
      const topSubjs = dash?.academics?.topSubjects || [];
      const publishedMarks: any[] = acad?.publishedMarks || [];

      const marksBySubject = new Map<string, number[]>();
      for (const mark of publishedMarks) {
        const subject = String(mark.subject || mark.title || 'Subject');
        const max = Number(mark.maxScore || 0);
        const raw = Number(mark.score || 0);
        const pct =
          mark.percentage != null
            ? Number(mark.percentage)
            : max > 0
              ? (raw / max) * 100
              : raw;
        if (!Number.isFinite(pct)) continue;
        const list = marksBySubject.get(subject) || [];
        list.push(Math.max(0, Math.min(100, pct)));
        marksBySubject.set(subject, list);
      }
      const subjectAverages = Array.from(marksBySubject.entries()).map(([subject, scores]) => ({
        subject,
        exam: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        grade: '',
      }));

      const subjectMarks: RealKid['subjectMarks'] = {};
      for (const mark of publishedMarks) {
        const subject = String(mark.subject || mark.title || 'Subject').trim();
        const key = subject.toLowerCase();
        const max = Number(mark.maxScore || 0);
        const raw = Number(mark.score || 0);
        const pctRaw =
          mark.percentage != null ? Number(mark.percentage) : max > 0 ? (raw / max) * 100 : raw;
        const pct = Number.isFinite(pctRaw) ? Math.round(Math.max(0, Math.min(100, pctRaw))) : 0;
        if (!subjectMarks[key]) subjectMarks[key] = [];
        subjectMarks[key].push({
          title: mark.title || mark.type || 'Assessment',
          type: mark.type || 'Assessment',
          pct,
          score: raw,
          maxScore: max,
          grade: mark.grade || '',
          date: String(mark.date || '').slice(0, 10),
        });
      }
      for (const list of Object.values(subjectMarks)) {
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      }

      const reportCards: RealKid['reportCards'] = ((reports?.items || []) as any[]).map((r) => ({
        id: String(r.id || ''),
        classId: String(r.classId || ''),
        term: String(r.term || ''),
        academicYear: String(r.academicYear || ''),
        reportKind: String(r.reportKind || 'standard'),
        className: String(r.className || ''),
        publishedAt: String(r.publishedAt || '').slice(0, 10),
        allowed: r.access?.allowed !== false,
        message: String(r.access?.message || ''),
      }));

      const termTrend = ((acad?.terms || []) as any[])
        .map((t) => {
          const subs = (t.subjects || []) as any[];
          const total = subs.reduce((a, s) => a + Number(s.total || 0), 0);
          const avg = subs.length ? Math.round(total / subs.length) : 0;
          return {
            label: [t.term, t.academicYear].filter(Boolean).join(' ') || 'Term',
            avg,
          };
        })
        .filter((t) => t.avg > 0);

      const subjList: Array<[string, number, string, string]> = (
        topSubjs.length ? topSubjs : subjectAverages
      ).map((sub: any) => [
        sub.subject,
        Math.round(Number(sub.exam ?? sub.total ?? sub.percentage ?? 0)),
        sub.teacher || sub.teacherName || 'Subject Teacher',
        sub.grade ? `Grade ${sub.grade}` : 'Published mark',
      ]);
      const avgScore = subjList.length
        ? Math.round(
            (subjList.reduce((acc: number, sub: any) => acc + Number(sub[1] || 0), 0) /
              subjList.length) *
              10
          ) / 10
        : 0;

      const attSummary = att?.summary || dash?.attendance || {};
      const attendanceRecords = (att?.records || []).map((r: any) => ({
        date: String(r.date || '').slice(0, 10),
        status: String(r.status || '').toUpperCase(),
        notes: r.notes || '',
        checkInTime: r.checkInTime || null,
        checkOutTime: r.checkOutTime || null,
      }));

      const txList: Array<[string, string, number]> = (wallet?.recentTransactions || []).map((tx: any) => {
        const dt = (tx.date || '').slice(5, 10).replace('-', '/');
        const amt = tx.type === 'DEBIT' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
        return [dt || 'Recent', tx.description || 'Transaction', amt];
      });

      const feeLines: Array<[string, string, string, string]> = (fees?.statements || []).map((stmt: any) => [
        stmt.description || 'School Fees',
        Number(stmt.amount || 0).toLocaleString('en-US'),
        Number(stmt.paid || 0).toLocaleString('en-US'),
        Number(stmt.balance || 0).toLocaleString('en-US'),
      ]);

      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const hwList: Array<[string, string, string, string, string, string]> = (hw || []).map((h: any) => {
        const dueStr = String(h.dueDate || '').slice(0, 10);
        const day = dueStr.slice(8, 10) || '—';
        const month = months[Math.max(0, Number(dueStr.slice(5, 7)) - 1)] || '';
        const isDone = ['SUBMITTED', 'COMPLETED', 'MARKED'].includes(String(h.status || '').toUpperCase());
        return [
          day,
          month,
          h.subject || 'General',
          h.title || 'Assignment',
          isDone ? 'Submitted' : dueStr ? 'Due ' + dueStr : 'Due date not set',
          isDone ? 'green' : 'amber',
        ];
      });

      const healthList: Array<[string, string, string, string]> = (hlth || []).map((h: any) => [
        (h.date || '').slice(0, 10) || 'Recent',
        h.type || 'Clinic check',
        (h.description || '') + (h.treatment ? ' · ' + h.treatment : ''),
        h.status === 'RESOLVED' ? 'green' : 'navy',
      ]);

      const discList: Array<[string, string, string, string]> = (disc?.records || []).map((d: any) => [
        (d.date || '').slice(0, 10) || 'Recent',
        d.type === 'MERIT' ? 'Merit' : 'Demerit',
        d.description || '',
        d.type === 'MERIT' ? 'green' : 'amber',
      ]);

      const days = tt?.days || [];
      const todayIso = new Date().toISOString().slice(0, 10);
      const todayDay = days.find((d: any) => String(d.date || '').slice(0, 10) === todayIso) || days[0];
      const currentSlot = todayDay?.slots?.[0];
      const todayRecord =
        attendanceRecords.find((r) => r.date === todayIso) || attendanceRecords[0];
      const statusLabels: Record<string, string> = {
        PRESENT: 'At school',
        LATE: 'Arrived late',
        ABSENT: 'Not at school',
        EXCUSED: 'Excused absence',
      };
      const trail: Array<[string, string, string]> = [];
      if (todayRecord?.checkInTime) trail.push(['ok', 'Gate check-in', String(todayRecord.checkInTime)]);
      if (currentSlot) trail.push(['cur', 'In class now', String(currentSlot.startTime || '')]);
      if (todayRecord?.checkOutTime) trail.push(['ok', 'Gate check-out', String(todayRecord.checkOutTime)]);
      const todayObj = {
        where: currentSlot?.room
          ? 'In class · ' + currentSlot.room
          : todayRecord
            ? statusLabels[todayRecord.status] || 'Attendance recorded'
            : 'No timetable published',
        what: currentSlot?.subject || (todayRecord ? statusLabels[todayRecord.status] || 'No lessons scheduled' : 'No lessons scheduled'),
        with: currentSlot?.teacher || '',
        period: currentSlot
          ? `Period ${currentSlot.period || ''} · ${currentSlot.startTime || ''}–${currentSlot.endTime || ''}`.replace(/ · $/, '')
          : '',
        trail,
      };

      const todayLessons: RealKid['todayLessons'] = (todayDay?.slots || []).map((slot: any) => ({
        period: String(slot.period ?? ''),
        subject: String(slot.subject || ''),
        teacher: String(slot.teacher || ''),
        room: String(slot.room || ''),
        startTime: String(slot.startTime || ''),
        endTime: String(slot.endTime || ''),
      }));

      const exams = [
        ...(dash?.academics?.upcomingExams || []),
        ...(acad?.schedule || []).filter((e: any) => e.status === 'UPCOMING' || !e.hasPublishedMark),
      ];
      const seenExams = new Set<string>();
      const testList: Array<[string, string, string]> = [];
      for (const e of exams) {
        const date = String(e.date || '').slice(0, 10) || 'Date not set';
        const subject = e.subject || e.title || 'Subject';
        const key = `${date}|${subject}`;
        if (seenExams.has(key)) continue;
        seenExams.add(key);
        testList.push([date, subject + ' exam', e.type || 'Assessment']);
      }

      const studentName = s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || st.fullName || 'Student';
      const studentFirst = s.firstName || (studentName ? studentName.split(' ')[0] : 'Child');
      const studentClass = s.className || st.class || st.className || '';
      const studentCode = s.studentCode || st.shuleCode || '';
      const isBoarder = st.isBoarding === true;

      const kidObj: RealKid = {
        id: sid,
        n: studentName,
        first: studentFirst,
        cls: studentClass,
        lvl: studentClass.startsWith('S')
          ? 'Secondary'
          : studentClass.startsWith('P')
            ? 'Primary'
            : studentClass.startsWith('N')
              ? 'Nursery'
              : 'School',
        code: studentCode,
        sdms: studentCode,
        cardno: wallet?.cardNumber || st.cardNumber || '',
        photo: s.photo || st.avatarUrl || null,
        gender: s.gender || st.gender || '',
        role: s.role || 'GUARDIAN',
        organizationId: s.organizationId || st.organizationId || '',
        academicYear: s.academicYear || dash?.academics?.academicYear || '',
        term: s.term || dash?.academics?.term || '',
        schoolName: fees?.branding?.schoolName || dash?.organization?.name || '',
        type: isBoarder ? 'Boarder' : 'Day scholar',
        ct: st.classTeacher || '',
        dorm: isBoarder && st.dormitoryName
          ? `${st.dormitoryName}${st.roomNumber ? ' · Room ' + st.roomNumber : ''}`
          : '',
        patron: isBoarder ? st.dormitoryPatron || '' : '',
        card: wallet?.balance ?? 0,
        lastTop: wallet?.lastTopUp
          ? [(wallet.lastTopUp || '').slice(0, 10), wallet.lastTopUpAmount ?? 0]
          : ['—', 0],
        fees: Number(fees?.outstanding ?? dash?.fees?.outstanding ?? 0),
        att: Number(attSummary.attendanceRate ?? 0),
        avg: avgScore,
        prev: termTrend.length >= 2 ? termTrend[termTrend.length - 2].avg : 0,
        trend: termTrend.map((t) => t.avg),
        cls_avg: [],
        rank:
          dash?.academics?.classRank && dash?.academics?.totalStudents
            ? `${dash.academics.classRank} of ${dash.academics.totalStudents}`
            : '—',
        conduct: Number(disc?.score ?? dash?.academics?.disciplineScore ?? 0),
        today: todayObj,
        todayLessons,
        subj: subjList,
        subjectMarks,
        reportCards,
        trendLabels: termTrend.map((t) => t.label),
        hw: hwList,
        tests: testList,
        cardtx: txList,
        feeLines: feeLines,
        health: healthList,
        disc: discList,
        attendance: attendanceRecords,
        attendanceSummary: {
          monthlyPresent: Number(attSummary.monthlyPresent ?? 0),
          monthlyAbsent: Number(attSummary.monthlyAbsent ?? 0),
          monthlyLate: Number(attSummary.monthlyLate ?? 0),
          monthlyExcused: Number(attSummary.monthlyExcused ?? 0),
          attendanceRate: Number(attSummary.attendanceRate ?? 0),
        },
        kit: {
          for: studentClass ? studentClass + ' (2027)' : 'School kit',
          items: (storeData?.products || []).slice(0, 7).map((p: any) => [p.name, 1, p.price]),
          shoe: '',
          uni: '',
        },
        bus: st.transportRoute
          ? {
              n: st.busNumber || '',
              route: st.transportRoute,
              drv: st.driverName || '',
              ph: st.driverPhone || '',
              pick: st.pickupTime || '',
              drop: st.dropoffTime || '',
              st: todayRecord ? statusLabels[todayRecord.status] || '' : '',
            }
          : null,
      };

      kids.push(kidObj);
    }

    return {
      parent,
      kids,
      store: storeData,
      notifications: notifData,
      events: eventsData || [],
      trips: tripsData || [],
      goals: goalsData || [],
      babyeyiSchools: babyeyiSchools || [],
    };
  }

  // Real Mutations
  async reportAbsence(payload: { studentId: string; date: string; reason: string; notes?: string }) {
    return this.fetchApi('/attendance/absence', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async topUpWallet(payload: { studentId: string; amount: number; phone: string; method: string }) {
    return this.fetchApi('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createStoreOrder(payload: any) {
    return this.fetchApi('/store/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async markAllNotificationsRead() {
    try {
      const { markAllNotificationsReadLocal } = await import('./push');
      markAllNotificationsReadLocal();
    } catch {}
    return { success: true, local: true };
  }

  async submitTripConsent(tripId: string) {
    return this.fetchApi(`/trips/${tripId}/consent`, {
      method: 'POST',
    });
  }

  async payTripFee(tripId: string, amount: number) {
    return this.fetchApi(`/trips/${tripId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async createGoal(goal: any) {
    return this.fetchApi('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  async topUpGoal(goalId: string, amount: number) {
    return this.fetchApi(`/goals/${goalId}/topup`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async toggleGoalAutoSave(goalId: string) {
    return this.fetchApi(`/goals/${goalId}/auto-save`, {
      method: 'PATCH',
    });
  }

  async getDiscipline(studentId?: string) {
    const q = studentId ? `?studentId=${studentId}` : '';
    return this.fetchApi(`/discipline${q}`);
  }

  async getWalletLimits(studentId: string) {
    return this.fetchApi(`/wallet/limits?studentId=${studentId}`);
  }

  async saveWalletLimits(studentId: string, limits: any) {
    return this.fetchApi('/wallet/limits', {
      method: 'POST',
      body: JSON.stringify({ studentId, ...limits }),
    });
  }

  async requestSizeExchange(orderId: string, payload: { item: string; oldSize: string; newSize: string }) {
    return this.fetchApi(`/store/orders/${orderId}/exchange`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const parentRealApi = new ParentRealApiService();

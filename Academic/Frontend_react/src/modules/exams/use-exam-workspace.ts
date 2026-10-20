import { useCallback, useEffect, useState } from 'react';
import { useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import { getExamSession, listExamSessions } from './exam-api';
import type { ExamSession } from './exam-types';

const KEY = 'academic.examSessionId';

export function useExamWorkspace() {
  const { settings, ready, academicYear, term, setAcademicYear, setTerm } = useOrgAcademicPeriod();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [sessionId, setSessionIdState] = useState(() => localStorage.getItem(KEY) || '');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadList = useCallback(async () => {
    const rows = await listExamSessions({ academicYear: academicYear || undefined, term: term || undefined });
    setSessions(rows);
    if (!sessionId && rows[0]) {
      localStorage.setItem(KEY, rows[0].id);
      setSessionIdState(rows[0].id);
    }
  }, [academicYear, term, sessionId]);

  const reloadSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      return;
    }
    setLoading(true);
    try {
      setSession(await getExamSession(sessionId));
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!ready) return;
    reloadList().catch(() => setSessions([]));
  }, [ready, reloadList]);

  useEffect(() => {
    reloadSession().catch(() => setSession(null));
  }, [reloadSession]);

  function setSessionId(id: string) {
    localStorage.setItem(KEY, id);
    setSessionIdState(id);
  }

  return {
    settings,
    ready,
    academicYear,
    term,
    setAcademicYear,
    setTerm,
    sessions,
    sessionId,
    setSessionId,
    session,
    setSession,
    loading,
    reload: async () => {
      await reloadList();
      await reloadSession();
    },
    reloadSession,
  };
}

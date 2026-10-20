'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { fetchTeacherToday } from '@/services/timetable-smart-api';
import type { PeriodTransition, SmartLesson, TeacherTodayData } from '@/types/smart-timetable';
import {
  markPeriodAlertFired,
  periodAlertStorageKey,
  pickPeriodAlertThreshold,
  playPeriodNotificationSound,
  showPeriodBrowserNotification,
  type PeriodAlertPayload,
} from '@/utils/period-alerts';

const WEEKEND_DAYS = new Set(['Saturday', 'Sunday']);

function isSchoolDay(dayOfWeek: string) {
  return !WEEKEND_DAYS.has(dayOfWeek);
}

export function usePeriodNotifications(enabled = true) {
  const { ready, term, academicYear } = useAcademicSettings();
  const [today, setToday] = useState<TeacherTodayData | null>(null);
  const [activeAlert, setActiveAlert] = useState<PeriodAlertPayload | null>(null);
  const firedRef = useRef(new Set<string>());

  const evaluateAlert = useCallback((data: TeacherTodayData) => {
    const current = data.current;
    const transition = data.periodTransition;
    if (!current || !transition) {
      setActiveAlert(null);
      return;
    }

    const threshold = pickPeriodAlertThreshold(
      transition.minutesRemaining,
      firedRef.current,
      data.date,
      current.timetableId
    );

    if (threshold == null) return;

    const key = periodAlertStorageKey(data.date, current.timetableId, threshold);
    firedRef.current.add(key);
    markPeriodAlertFired(key);
    playPeriodNotificationSound();
    showPeriodBrowserNotification({
      threshold,
      minutesRemaining: transition.minutesRemaining,
      current,
      next: data.next,
      transition,
    });

    setActiveAlert({
      threshold,
      minutesRemaining: transition.minutesRemaining,
      current,
      next: data.next,
      transition,
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !ready) return;

    try {
      const data = await fetchTeacherToday({ term, academicYear });
      setToday(data);

      if (!isSchoolDay(data.dayOfWeek)) {
        setActiveAlert(null);
        return;
      }

      evaluateAlert(data);
    } catch {
      setToday(null);
    }
  }, [enabled, ready, term, academicYear, evaluateAlert]);

  useEffect(() => {
    if (!enabled || !ready) return;

    void refresh();
    const intervalMs =
      today?.periodTransition != null && today.periodTransition.minutesRemaining <= 6 ? 15000 : 30000;
    const timer = window.setInterval(() => void refresh(), intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, ready, refresh, today?.periodTransition?.minutesRemaining]);

  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  return {
    today,
    activeAlert,
    dismissAlert,
    refresh,
  };
}

export type { PeriodTransition, SmartLesson };

'use client';

import {
  BookOpen,
  Coffee,
  UtensilsCrossed,
  Users,
  Dumbbell,
  FileText,
  Briefcase,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { ScheduleSlotType } from '@/types';

const SLOT_TYPE_ICONS: Record<ScheduleSlotType, LucideIcon> = {
  LESSON: BookOpen,
  BREAK: Coffee,
  LUNCH: UtensilsCrossed,
  ASSEMBLY: Users,
  ACTIVITY: Dumbbell,
  EXAMINATION: FileText,
  MEETING: Briefcase,
  CLUB: Target,
};

export function ScheduleSlotTypeIcon({
  type,
  size = 14,
  className = 'text-muted shrink-0',
}: {
  type: ScheduleSlotType;
  size?: number;
  className?: string;
}) {
  const Icon = SLOT_TYPE_ICONS[type] ?? BookOpen;
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden />;
}

export const SCHEDULE_SLOT_TYPE_LABELS: Record<ScheduleSlotType, string> = {
  LESSON: 'Lesson',
  BREAK: 'Break',
  LUNCH: 'Lunch',
  ASSEMBLY: 'Assembly',
  ACTIVITY: 'Activity',
  EXAMINATION: 'Examination',
  MEETING: 'Staff Meeting',
  CLUB: 'Club',
};

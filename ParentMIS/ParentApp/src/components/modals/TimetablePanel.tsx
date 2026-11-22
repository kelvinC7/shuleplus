import React, { useState } from 'react';
import { Child } from '../../types';
import { Clock, MapPin, User, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TimetablePanel: React.FC<{ child: Child }> = ({ child }) => {
  const { t } = useApp();
  const [selectedDay, setSelectedDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'>('Wed');

  const schedule: Record<
    string,
    Array<{ period: string; time: string; subject: string; teacher: string; room: string }>
  > = {
    Wed: [
      {
        period: 'Period 1',
        time: '08:00 - 08:45',
        subject: 'Mathematics',
        teacher: 'Patrick Rukundo',
        room: 'Room 14',
      },
      {
        period: 'Period 2',
        time: '08:50 - 09:35',
        subject: 'History · Pre-colonial Rwanda',
        teacher: 'Samuel Rwigema',
        room: 'Room 14',
      },
      {
        period: 'Break',
        time: '09:35 - 10:05',
        subject: 'Morning Break & ShuleCard Snack',
        teacher: 'Duty Masters',
        room: 'Canteen Lawn',
      },
      {
        period: 'Period 3',
        time: '10:05 - 10:50',
        subject: 'Physics · Mechanics',
        teacher: 'Emmanuel Bizimana',
        room: 'Science Lab 2',
      },
      {
        period: 'Period 4',
        time: '10:55 - 11:40',
        subject: 'Chemistry',
        teacher: 'Marie Claire Mukamana',
        room: 'Chemistry Lab',
      },
      {
        period: 'Period 5',
        time: '11:45 - 12:30',
        subject: 'English Literature',
        teacher: 'Peace Umuhoza',
        room: 'Room 14',
      },
      {
        period: 'Lunch',
        time: '12:30 - 14:00',
        subject: 'Lunch & Rest',
        teacher: 'Patrons & Matrons',
        room: 'Dining Hall',
      },
      {
        period: 'Period 6',
        time: '14:00 - 15:00',
        subject: 'Biology Practical',
        teacher: 'Alice Uwingabire',
        room: 'Biology Lab',
      },
      {
        period: 'Sports',
        time: '15:15 - 16:45',
        subject: 'Athletics & Basketball Practice',
        teacher: 'Coach Eric Nshimiyimana',
        room: 'Sports Complex',
      },
    ],
    Mon: [
      {
        period: 'Assembly',
        time: '07:30 - 08:00',
        subject: 'School Assembly & Flag Raising',
        teacher: 'Headmaster',
        room: 'Main Quad',
      },
      {
        period: 'Period 1',
        time: '08:00 - 09:30',
        subject: 'Mathematics',
        teacher: 'Patrick Rukundo',
        room: 'Room 14',
      },
      {
        period: 'Period 2',
        time: '09:45 - 11:15',
        subject: 'Geography',
        teacher: 'Jean Kwizera',
        room: 'Room 14',
      },
    ],
    Tue: [
      {
        period: 'Period 1',
        time: '08:00 - 09:30',
        subject: 'Physics',
        teacher: 'Emmanuel Bizimana',
        room: 'Lab 2',
      },
      {
        period: 'Period 2',
        time: '09:45 - 11:15',
        subject: 'Chemistry',
        teacher: 'Marie Claire Mukamana',
        room: 'Room 14',
      },
    ],
    Thu: [
      {
        period: 'Period 1',
        time: '08:00 - 09:30',
        subject: 'History',
        teacher: 'Samuel Rwigema',
        room: 'Room 14',
      },
      {
        period: 'Period 2',
        time: '09:45 - 11:15',
        subject: 'Kinyarwanda',
        teacher: 'Marie Mukarugwiza',
        room: 'Room 14',
      },
    ],
    Fri: [
      {
        period: 'Period 1',
        time: '08:00 - 09:30',
        subject: 'English Debate',
        teacher: 'Peace Umuhoza',
        room: 'Auditorium',
      },
      {
        period: 'Period 2',
        time: '09:45 - 11:15',
        subject: 'ICT & Coding',
        teacher: 'David Mugisha',
        room: 'Computer Lab 1',
      },
    ],
  };

  const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const currentPeriods = schedule[selectedDay] || schedule['Wed'];

  return (
    <div className="space-y-4">
      {/* Day Selector */}
      <div className="flex bg-slate-100 p-1 rounded-2xl">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              selectedDay === d
                ? 'bg-white text-[#13213D] shadow-sm'
                : 'text-[#6B7385] hover:text-[#13213D]'
            }`}
          >
            {t(({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' } as const)[d])}
          </button>
        ))}
      </div>

      {/* Schedule list */}
      <div className="space-y-2.5">
        {currentPeriods.map((item, idx) => {
          const isBreak = item.period === 'Break' || item.period === 'Lunch';
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                isBreak
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-white border-[#E5E8EF] shadow-card'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                    isBreak
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-slate-100 text-[#13213D]'
                  }`}
                >
                  {t(item.period)}
                </span>
                <span className="text-[#6B7385] font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {item.time}
                </span>
              </div>

              <b className="text-sm font-extrabold text-[#13213D] block mt-1">
                {item.subject}
              </b>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-[#6B7385]">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#F5A623]" /> {item.teacher}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#1FA971]" /> {item.room}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

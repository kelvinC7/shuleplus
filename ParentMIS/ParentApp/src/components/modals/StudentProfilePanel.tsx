import React, { useState } from 'react';
import { Child, SubjectItem, DisciplineRecord } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  QrCode,
  ShieldCheck,
  Bus,
  Home,
  Phone,
  GraduationCap,
  Award,
  Calendar,
  Heart,
  Droplet,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  FileText,
  User,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StudentProfilePanel: React.FC<{ child: Child }> = ({ child }) => {
  const { parent, discipline, setActiveTab, popPanel, pushPanel, showToast, t } = useApp();
  const [profileTab, setProfileTab] = useState<'academics' | 'discipline' | 'identity' | 'attendance' | 'guardians' | 'medical'>('academics');

  const disc = discipline || {
    score: child.conduct || 100,
    records: child.disciplineRecords || [],
  };
  const conductScore = disc.score ?? child.conduct ?? 100;
  const records: DisciplineRecord[] =
    (disc.records && disc.records.length > 0 ? disc.records : child.disciplineRecords) || [];
  const merits = records.filter((r) => r.points > 0 || r.type === 'MERIT');
  const demerits = records.filter((r) => r.points < 0 || r.type !== 'MERIT');
  const permissions = child.permissions || [];

  const handleOpenMarksTab = () => {
    popPanel();
    setActiveTab('learn');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Master Student Header Card */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E5E8EF] text-center relative overflow-hidden">
        <div className="flex justify-center mb-3">
          <Avatar child={child} size="xl" className="ring-4 ring-amber-400/20" />
        </div>
        <h2 className="text-xl font-extrabold text-[#13213D] tracking-tight">{child.n}</h2>
        <p className="text-xs text-[#6B7385] font-semibold mt-0.5">
          {child.cls} {child.stream ? `· ${t('Stream')} ${child.stream}` : ''} · {child.lvl} · {t('Class Teacher:')} <b className="text-[#13213D]">{child.ct}</b>
        </p>

        {/* Status badges */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10.5px] font-bold rounded-full border border-emerald-200">
            {t('Active Enrolled')}
          </span>
          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10.5px] font-bold rounded-full border border-slate-200">
            {child.type}
          </span>
          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10.5px] font-bold rounded-full border border-amber-200">
            {t('Conduct')}: {conductScore}/100
          </span>
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 text-[10.5px] font-bold rounded-full border border-blue-200">
            {t('Rank')} {child.rank}
          </span>
        </div>

        {/* 4 Quick KPIs Row */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3.5 border-t border-[#E5E8EF] text-center">
          <div className="bg-slate-50 p-2 rounded-xl">
            <small className="text-[9px] uppercase font-bold text-[#6B7385] block">{t('Marks Avg')}</small>
            <b className="text-sm font-extrabold text-[#13213D]">{child.avg}%</b>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl">
            <small className="text-[9px] uppercase font-bold text-[#6B7385] block">{t('Conduct')}</small>
            <b className="text-sm font-extrabold text-emerald-700">{conductScore}</b>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl">
            <small className="text-[9px] uppercase font-bold text-[#6B7385] block">{t('Attendance')}</small>
            <b className="text-sm font-extrabold text-blue-700">{child.att}%</b>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl">
            <small className="text-[9px] uppercase font-bold text-[#6B7385] block">{t('Card')}</small>
            <b className="text-xs font-extrabold text-[#F5A623]">RWF {child.card.toLocaleString()}</b>
          </div>
        </div>
      </div>

      {/* 2. Navigation Pills across dimensions */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'academics', label: t('Marks & Academics') },
          { id: 'discipline', label: t('Discipline & Conduct') },
          { id: 'attendance', label: t('Attendance') },
          { id: 'identity', label: t('Official IDs & Card') },
          { id: 'guardians', label: t('Guardians') },
          { id: 'medical', label: t('Health') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setProfileTab(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${
              profileTab === tab.id
                ? 'bg-white text-[#13213D] shadow-sm'
                : 'text-[#6B7385] hover:text-[#13213D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. TAB CONTENT */}

      {/* ACADEMICS & MARKS TAB */}
      {profileTab === 'academics' && (
        <div className="space-y-3">
          {/* Summary Banner */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#6B7385] tracking-wider block">
                {t('Term 3 2026 Academic standing')}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-[#13213D]">{child.avg}%</span>
                <span className="text-xs text-emerald-700 font-bold">{t('Class Rank')} {child.rank}</span>
                <span className="text-xs text-[#6B7385]">· GPA {child.gpa || '3.4'}</span>
              </div>
            </div>
            <button
              onClick={handleOpenMarksTab}
              className="px-3 py-2 bg-[#13213D] hover:bg-[#1E335F] text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
            >
              {t('Full Portal')} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subject Breakdown List */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-[#13213D] flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#F5A623]" />
                {t('All Registered Subject Marks')} ({child.subj.length})
              </h4>
              <span className="text-[10.5px] text-[#6B7385] font-semibold">{t('Continuous + Exam')}</span>
            </div>

            <div className="divide-y divide-slate-100 space-y-2">
              {child.subj.map((s, idx) => {
                const gradeLabel =
                  s.score >= 80 ? 'Distinction' : s.score >= 65 ? 'Credit' : s.score >= 50 ? 'Pass' : 'Needs Support';
                const badgeColor =
                  s.score >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : s.score >= 65
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800';

                return (
                  <div key={idx} className="pt-2.5 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <b className="text-xs font-extrabold text-[#13213D]">{s.name}</b>
                        <span className="text-[10.5px] text-[#6B7385] block">{t('Teacher')}: {s.teacher}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-[#13213D]">{s.score}%</span>
                        <span className={`inline-block ml-1.5 px-2 py-0.5 text-[9.5px] font-extrabold rounded-md ${badgeColor}`}>
                          {gradeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Midterm, assignments, endterm pills */}
                    <div className="flex items-center gap-2 text-[10.5px] text-[#6B7385] pt-0.5">
                      <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {t('Midterm')}: <b className="text-slate-800">{s.midterm || s.score - 2}%</b>
                      </span>
                      <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {t('Assignments')}: <b className="text-slate-800">{s.assignments || s.score}%</b>
                      </span>
                      <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {t('End-term')}: <b className="text-slate-800">{s.endterm || s.score + 2}%</b>
                      </span>
                    </div>

                    {/* Teacher Remarks */}
                    {s.comment && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50/70 p-2 rounded-xl mt-1">
                        "{s.comment}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DISCIPLINE & CONDUCT TAB */}
      {profileTab === 'discipline' && (
        <div className="space-y-3">
          {/* Conduct Overview */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-[#F5A623] flex items-center justify-center font-black text-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6B7385] block">Conduct Rating</span>
                <b className="text-lg font-black text-[#13213D] leading-none">
                  {conductScore} <span className="text-xs text-[#6B7385]">/ 100</span>
                </b>
                <span className="inline-block ml-2 px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded-md">
                  Exemplary
                </span>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="text-emerald-700 font-bold block">+{merits.reduce((acc, r) => acc + Math.max(0, r.points), 0)} pts merits</span>
              <span className="text-rose-600 font-bold block">-{Math.abs(demerits.reduce((acc, r) => acc + Math.min(0, r.points), 0))} pts demerits</span>
            </div>
          </div>

          {/* Discipline Records List */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] space-y-2.5">
            <h4 className="text-xs font-bold text-[#13213D] flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Merits & Disciplinary Case Log ({records.length})
            </h4>

            {records.length > 0 ? (
              records.map((r, idx) => {
                const isMerit = r.points > 0 || r.type === 'MERIT';
                return (
                  <div
                    key={r.id || idx}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      isMerit ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        {isMerit ? (
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <b className={isMerit ? 'text-emerald-950' : 'text-rose-950'}>
                          {isMerit ? t('Merit') : t('Conduct Note')}
                        </b>
                        {r.category && (
                          <span className="px-1.5 py-0.5 text-[9.5px] font-bold bg-white/80 rounded border">
                            {r.category}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-[10.5px] font-black rounded ${isMerit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {r.points > 0 ? `+${r.points}` : r.points} pts
                      </span>
                    </div>

                    <p className="text-slate-700 text-xs font-medium leading-relaxed">{r.description}</p>

                    {r.sanction && (
                      <p className="text-[11px] text-[#6B7385] bg-white/70 p-1.5 rounded-lg border border-slate-200">
                        <b>{t('Action:')}</b> {r.sanction}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-[#6B7385] pt-1">
                      <span>{r.date ? new Date(r.date).toLocaleDateString() : t('This term')}</span>
                      <span className="font-semibold text-slate-700">{r.recordedBy || 'Dean of Discipline'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#6B7385] py-4 text-center">{t('No discipline cases or demerits recorded.')}</p>
            )}
          </div>

          {/* Exeunt Permissions */}
          {permissions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] space-y-2">
              <h4 className="text-xs font-bold text-[#13213D] flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                {t('Gate Passes & Exeunt Permissions')}
              </h4>
              {permissions.map((p) => (
                <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#13213D]">
                    <span>{p.destination}</span>
                    <span className="text-[10px] text-emerald-700 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{p.reason}</p>
                  <span className="text-[10px] text-[#6B7385] block">
                    {t('Departed:')} {new Date(p.departureDate).toLocaleDateString()} · {t('Returned on time')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {profileTab === 'attendance' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6B7385] block">{t('Attendance Rate')}</span>
                <span className="text-3xl font-black text-[#13213D]">{child.att}%</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs flex items-center gap-2 text-emerald-950 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('Present in school today · Checked in at 07:42 AM via RFID tap')}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-[#6B7385] block">{t('Days Present')}</span>
                <b className="text-emerald-700 font-extrabold text-sm">22</b>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-[#6B7385] block">{t('Late Arrivals')}</span>
                <b className="text-amber-700 font-extrabold text-sm">1</b>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-[#6B7385] block">{t('Excused Leaves')}</span>
                <b className="text-blue-700 font-extrabold text-sm">1</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL IDS & CARD TAB */}
      {profileTab === 'identity' && (
        <div className="space-y-3">
          {/* Digital ShuleCard Card Visual */}
          <div className="bg-gradient-to-br from-[#13213D] to-[#24396A] text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10">
              <QrCode className="w-32 h-32" />
            </div>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <Avatar child={child} size="md" className="border-white/30" />
                <div>
                  <small className="text-[9px] uppercase font-bold tracking-wider text-[#F5A623] block">
                    SHULECARD · UMUCYO SS
                  </small>
                  <b className="text-base font-extrabold text-white block">{child.n}</b>
                  <span className="text-xs text-white/70 font-mono tracking-wider">
                    {child.cardno}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-xl p-1 flex items-center justify-center">
                <QrCode className="w-9 h-9 text-white" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs relative z-10">
              <span className="text-white/70">{t('Pocket money balance:')}</span>
              <b className="text-[#F5A623] text-sm font-extrabold">
                RWF {child.card.toLocaleString()}
              </b>
            </div>
          </div>

          {/* Complete ID Table */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] space-y-2.5 text-xs">
            <h4 className="font-bold text-[#13213D] border-b border-slate-100 pb-2">
              {t('Identity & Placement Registry')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('National SDMS Code')}</span>
                <b className="text-[#13213D] font-mono">{child.sdms}</b>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('ShuleCard Smart Card')}</span>
                <b className="text-[#13213D] font-mono">{child.cardno}</b>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('School Admission Code')}</span>
                <b className="text-[#13213D] font-mono">{child.code}</b>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('National ID / Passport')}</span>
                <b className="text-[#13213D] font-mono">{child.nationalId || '1201070048210082'}</b>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('House / Color')}</span>
                <b className="text-[#13213D]">{child.house || 'Inyange (Blue House)'}</b>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('Admission Date')}</span>
                <b className="text-[#13213D]">{child.admissionDate || '09 Jan 2023'}</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GUARDIANS TAB */}
      {profileTab === 'guardians' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-[#1FA971]" />
              <h4 className="text-xs font-bold text-[#13213D]">
                {t('Registered Guardian Contacts')} ({child.guardians?.length || 2})
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              {(child.guardians || [parent.ph]).map((g, idx) => {
                const isMe = g === parent.ph;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl flex items-center justify-between font-semibold ${
                      isMe ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{g}</span>
                    </div>
                    {isMe && (
                      <span className="px-2 py-0.5 bg-[#F5A623] text-[#13213D] text-[10px] font-extrabold rounded-full">
                        {t('You (Active)')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#6B7385] leading-relaxed">
              {t('These registered numbers receive real-time SMS gate tap notifications, fee payment receipts, and disciplinary event alerts for {{name}}.', { name: child.first })}
            </p>
          </div>

          {/* Living & Transport summary */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] space-y-2 text-xs">
            <h4 className="font-bold text-[#13213D] border-b border-slate-100 pb-2">
              {child.type === 'Boarder' ? t('Hostel & Boarding') : t('School Transport Route')}
            </h4>
            {child.type === 'Boarder' ? (
              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                  <span className="text-[#6B7385] flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> {t('Dormitory')}</span>
                  <b className="text-slate-900">{child.dorm || 'Nyabinghi Hall · Room 12'}</b>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                  <span className="text-[#6B7385]">{t('Hostel Patron')}</span>
                  <b className="text-slate-900">{child.patron || 'Jean Bosco Habimana'}</b>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                  <span className="text-[#6B7385] flex items-center gap-1.5"><Bus className="w-3.5 h-3.5" /> {t('Route')}</span>
                  <b className="text-slate-900">{child.bus?.route}</b>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                  <span className="text-[#6B7385]">{t('Pick-up Point')}</span>
                  <b className="text-slate-900">{child.bus?.pick}</b>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                  <span className="text-[#6B7385]">{t('Driver')}</span>
                  <b className="text-slate-900">{child.bus?.drv}</b>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MEDICAL TAB */}
      {profileTab === 'medical' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF] space-y-3 text-xs">
            <h4 className="font-bold text-[#13213D] border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-500" />
              {t('Medical & Clinic Profile')}
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 flex items-center gap-2.5">
                <Droplet className="w-5 h-5 text-red-600" />
                <div>
                  <span className="text-[10px] text-red-700 uppercase font-bold block">{t('Blood Group')}</span>
                  <b className="text-sm font-black text-red-950">{child.medical?.bloodGroup || 'O+'}</b>
                </div>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="text-[10px] text-blue-700 uppercase font-bold block">{t('Genotype')}</span>
                  <b className="text-sm font-black text-blue-950">{child.medical?.genotype || 'AA'}</b>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385] text-[10.5px] font-bold block">{t('Known Allergies')}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(child.medical?.allergies && child.medical.allergies.length > 0) ? (
                    child.medical.allergies.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10.5px] font-bold">
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600 text-xs font-medium">{t('None reported')}</span>
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385] text-[10.5px] font-bold block">{t('Chronic Conditions')}</span>
                <span className="text-slate-800 text-xs font-semibold block mt-0.5">
                  {child.medical?.chronicConditions || 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

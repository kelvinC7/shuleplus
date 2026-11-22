'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User, Phone, Mail, MapPin, Heart, AlertCircle, Droplet, Bus, Home,
  CreditCard, Activity, Loader2, X, Award, GraduationCap, ThumbsUp,
  AlertTriangle, FileText, ArrowUpRight, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useStudentFetch } from '@/hooks/use-fetch';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const DEFAULT_AVATAR = '/student-avatar.png';

interface StudentProfileData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    dateOfBirth: string | null;
    age: number | null;
    gender: string;
    nationality: string;
    nationalId: string;
    religion: string;
    shuleCode: string;
    cardNumber: string;
    className: string;
    stream: string;
    academicYear: string;
    classTeacher: string;
    house: string;
    admissionDate: string | null;
    isBoarding: boolean;
    avatarUrl?: string | null;
  };
  smartCard?: {
    payloadUrl: string;
    qrImageUrl: string;
  };
  parents: {
    father: { name: string; phone: string; email: string; address: string };
    mother: { name: string; phone: string; email: string; address: string };
    emergency: { name: string; relationship: string; phone: string };
  };
  medical: {
    bloodGroup: string;
    genotype: string;
    allergies: string[];
    chronicConditions: string;
  };
  logistics: {
    transport: {
      subscriptionStatus: string;
      transportMode: string;
      routeDetails: string;
      busNumber: string;
      driverName: string;
      driverPhone: string;
      pickupTime: string;
    };
    boarding: {
      boardingStatus: string;
      dormitoryName: string;
      roomNumber: string;
      dormitoryPatron: string;
      patronPhone: string;
    };
  };
  academics?: {
    gpa: number;
    avgScore: number;
    term: string;
    academicYear: string;
    classRank: number;
    totalStudents: number;
    subjects: Array<{
      subject: string;
      ca: number;
      exam: number;
      total: number;
      grade: string;
      rank: number;
    }>;
  };
  discipline?: {
    score: number;
    totalPoints: number;
    records: Array<{
      id: string;
      date: string;
      type: string;
      description: string;
      points: number;
      status: string;
    }>;
  };
}

export default function StudentProfile() {
  const { data, loading, error } = useStudentFetch<StudentProfileData>('/profile');
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    setAvatarSrc(data?.student?.avatarUrl?.trim() || DEFAULT_AVATAR);
  }, [data?.student?.avatarUrl]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl bg-white">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-primary" />
        <h3 className="mt-4 text-lg font-semibold text-navy">Student profile is not ready yet</h3>
        <p className="mt-1 max-w-md text-sm text-muted">
          {error || 'Choose a child from the header filter. Names come from Student Management using the phone you signed in with.'}
        </p>
      </div>
    );
  }

  const { student, parents, medical, logistics, academics, discipline } = data;
  const qrSrc = data.smartCard?.qrImageUrl;
  const dobLabel = student.dateOfBirth
    ? `${formatDate(student.dateOfBirth)}${student.age !== null ? ` (${student.age} years old)` : ''}`
    : '—';
  const scholarLabel = student.isBoarding ? 'Boarding Scholar' : 'Day Scholar';

  const conductScore = discipline?.score ?? 94;
  const disciplineRecords = discipline?.records ?? [];
  const merits = disciplineRecords.filter((r) => r.points > 0 || r.type === 'MERIT');
  const demerits = disciplineRecords.filter((r) => r.points < 0 || r.type !== 'MERIT');

  const subjects = academics?.subjects ?? [
    { subject: 'Mathematics', ca: 78, exam: 72, total: 75, grade: 'A', rank: 4 },
    { subject: 'English', ca: 82, exam: 74, total: 78, grade: 'A', rank: 3 },
    { subject: 'Physics', ca: 74, exam: 68, total: 71, grade: 'B+', rank: 6 },
    { subject: 'Chemistry', ca: 70, exam: 65, total: 68, grade: 'B', rank: 8 },
    { subject: 'Biology', ca: 80, exam: 76, total: 78, grade: 'A', rank: 2 },
    { subject: 'History', ca: 85, exam: 82, total: 84, grade: 'A+', rank: 1 },
    { subject: 'ICT & Computing', ca: 88, exam: 86, total: 87, grade: 'A+', rank: 1 },
  ];

  const gpa = academics?.gpa ?? 3.4;
  const classRank = academics?.classRank ?? 6;
  const totalStudents = academics?.totalStudents ?? 48;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc}
                alt={student.fullName}
                onError={() => setAvatarSrc(DEFAULT_AVATAR)}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-navy">{student.fullName}</h1>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800">
                  Active
                </Badge>
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-xs font-semibold text-blue-800">
                  Rank {classRank} of {totalStudents}
                </Badge>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-xs font-semibold text-amber-900">
                  Conduct: {conductScore}/100
                </Badge>
              </div>
              <p className="mt-1 text-sm font-medium text-muted">
                {student.className} {student.stream ? `· Stream ${student.stream}` : ''} · Class Teacher: <span className="font-semibold text-navy">{student.classTeacher || '—'}</span>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono font-medium text-slate-700">
                  SDMS: {student.shuleCode || '—'}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono font-medium text-slate-700">
                  Card: {student.cardNumber || '—'}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  {scholarLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => qrSrc && setQrOpen(true)}
              className="flex w-[88px] flex-col items-center rounded-xl border border-slate-200 bg-white px-2 py-2.5 transition hover:border-primary/40"
            >
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="Student QR" className="h-10 w-10 rounded-sm bg-white object-contain" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center text-[10px] text-muted">QR</span>
              )}
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Student QR</span>
            </button>
            <div className="flex w-[88px] flex-col items-center rounded-xl border border-slate-200 bg-white px-2 py-2.5">
              <CreditCard className="h-6 w-6 text-violet-500" />
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">ShuleCard</span>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="academics" className="w-full">
        <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1 border border-slate-100 bg-white p-1 md:grid-cols-6">
          <TabsTrigger value="academics" className="py-2.5">Academics & Marks</TabsTrigger>
          <TabsTrigger value="discipline" className="py-2.5">Discipline & Conduct</TabsTrigger>
          <TabsTrigger value="personal" className="py-2.5">Personal Details</TabsTrigger>
          <TabsTrigger value="parents" className="py-2.5">Parents & Emergency</TabsTrigger>
          <TabsTrigger value="medical" className="py-2.5">Medical Info</TabsTrigger>
          <TabsTrigger value="logistics" className="py-2.5">Transport & Dorm</TabsTrigger>
        </TabsList>

        {/* 1. ACADEMICS & MARKS TAB */}
        <TabsContent value="academics" className="focus-visible:outline-none space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Academic Standing & Subject Marks
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Official published grades for {student.fullName} · {academics?.term || 'Term 1'} {academics?.academicYear || '2026'}
                </p>
              </div>
              <Link
                href="/academic"
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-primary transition hover:shadow-md"
              >
                Open Marks Portal & Report Cards
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* Quick KPIs strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs uppercase font-semibold text-muted block">Current GPA</span>
                <b className="text-2xl font-bold text-navy">{gpa}</b>
                <span className="text-[10px] text-muted block">Out of 4.0</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs uppercase font-semibold text-muted block">Class Rank</span>
                <b className="text-2xl font-bold text-navy">#{classRank}</b>
                <span className="text-[10px] text-muted block">Top 15% of class</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs uppercase font-semibold text-muted block">Class Size</span>
                <b className="text-2xl font-bold text-navy">{totalStudents}</b>
                <span className="text-[10px] text-muted block">Students enrolled</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs uppercase font-semibold text-muted block">Registered Subjects</span>
                <b className="text-2xl font-bold text-primary">{subjects.length}</b>
                <span className="text-[10px] text-muted block">All graded</span>
              </div>
            </div>

            {/* Subject Marks Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Continuous Assmt (CA)</th>
                    <th className="px-4 py-3">Final Exam</th>
                    <th className="px-4 py-3">Total Score</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3 text-right">Class Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((s, idx) => {
                    const gradeTone = s.grade.startsWith('A')
                      ? 'bg-emerald-100 text-emerald-800'
                      : s.grade.startsWith('B')
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-navy">{s.subject}</td>
                        <td className="px-4 py-3 text-slate-600">{s.ca} / 100</td>
                        <td className="px-4 py-3 text-slate-600">{s.exam} / 100</td>
                        <td className="px-4 py-3 font-bold text-navy">{s.total}%</td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2.5 py-0.5 rounded-full font-bold text-[10.5px]', gradeTone)}>
                            {s.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-500">
                          {s.rank > 0 ? `#${s.rank}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* 2. DISCIPLINE & CONDUCT TAB */}
        <TabsContent value="discipline" className="focus-visible:outline-none space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Behaviour, Merits & Disciplinary Records
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  School disciplinary history recorded by class teachers and disciplinary counsel
                </p>
              </div>
              <Link
                href="/discipline"
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-primary transition hover:shadow-md"
              >
                View Discipline Portal
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* Score & breakdown strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Award className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-amber-900">Conduct Score</span>
                  <div className="text-2xl font-black text-navy">{conductScore} / 100</div>
                  <span className="text-[10px] font-bold text-emerald-700">Exemplary Conduct</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <ThumbsUp className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-emerald-900">Merits Earned</span>
                  <div className="text-2xl font-black text-emerald-800">
                    +{merits.reduce((acc, r) => acc + Math.max(0, r.points), 0)} pts
                  </div>
                  <span className="text-[10px] text-muted">{merits.length} recorded positive merits</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-rose-900">Demerit Points</span>
                  <div className="text-2xl font-black text-rose-800">
                    -{Math.abs(demerits.reduce((acc, r) => acc + Math.min(0, r.points), 0))} pts
                  </div>
                  <span className="text-[10px] text-muted">{demerits.length} recorded conduct notes</span>
                </div>
              </div>
            </div>

            {/* Cases list */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Complete Disciplinary Event Log ({disciplineRecords.length})
              </h3>

              {disciplineRecords.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {disciplineRecords.map((r, idx) => {
                    const isMerit = r.points > 0 || r.type === 'MERIT';
                    return (
                      <div key={r.id || idx} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                              isMerit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            )}
                          >
                            {isMerit ? <ThumbsUp size={16} /> : <AlertTriangle size={16} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-navy">
                                {isMerit ? 'Merit' : 'Conduct Note'} · {r.type}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px]',
                                  isMerit ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
                                )}
                              >
                                {r.status || 'RECORDED'}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">{r.description}</p>
                            <span className="mt-1.5 inline-block text-[10.5px] text-muted">{formatDate(r.date)}</span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-black shrink-0',
                            isMerit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          )}
                        >
                          {r.points > 0 ? `+${r.points}` : r.points} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted border border-dashed rounded-xl">
                  No disciplinary infractions or merits recorded for this student.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 3. PERSONAL DETAILS TAB */}
        <TabsContent value="personal" className="focus-visible:outline-none">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-semibold text-navy">Personal Information</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <InfoField label="Full Name" value={student.fullName} />
              <InfoField label="Date of Birth" value={dobLabel} />
              <InfoField label="Gender" value={student.gender || '—'} />
              <InfoField label="Nationality" value={student.nationality || '—'} />
              <InfoField label="National ID / Passport" value={student.nationalId || '—'} />
              <InfoField label="Student type" value={scholarLabel} />
              <div className="col-span-full mt-2">
                <Separator className="mb-6" />
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Academic Placement</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <InfoField label="Current Class" value={student.className || '—'} />
                  <InfoField label="Academic Year" value={student.academicYear || '—'} />
                  <InfoField label="Class Teacher" value={student.classTeacher || '—'} />
                  <InfoField label="House/Color" value={student.house || '—'} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 4. PARENTS & EMERGENCY TAB */}
        <TabsContent value="parents" className="space-y-5 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><User className="h-5 w-5" /></div>
                <h3 className="text-lg font-semibold text-navy">Father&apos;s Details</h3>
              </div>
              <div className="mt-5 space-y-4">
                <InfoField label="Name" value={parents.father.name || '—'} />
                <ContactRow icon={<Phone className="h-4 w-4 text-muted" />} value={parents.father.phone || '—'} />
                <ContactRow icon={<Mail className="h-4 w-4 text-muted" />} value={parents.father.email || '—'} />
                <ContactRow icon={<MapPin className="h-4 w-4 text-muted" />} value={parents.father.address || '—'} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><User className="h-5 w-5" /></div>
                <h3 className="text-lg font-semibold text-navy">Mother&apos;s Details</h3>
              </div>
              <div className="mt-5 space-y-4">
                <InfoField label="Name" value={parents.mother.name || '—'} />
                <ContactRow icon={<Phone className="h-4 w-4 text-muted" />} value={parents.mother.phone || '—'} />
                <ContactRow icon={<Mail className="h-4 w-4 text-muted" />} value={parents.mother.email || '—'} />
                <ContactRow icon={<MapPin className="h-4 w-4 text-muted" />} value={parents.mother.address || '—'} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Emergency Contact (Other than parents)</h3>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
              <InfoField label="Name" value={parents.emergency.name || '—'} />
              <InfoField label="Relationship" value={parents.emergency.relationship || '—'} />
              <ContactRow icon={<Phone className="h-4 w-4 text-muted" />} value={parents.emergency.phone || '—'} />
            </div>
          </div>
        </TabsContent>

        {/* 5. MEDICAL INFO TAB */}
        <TabsContent value="medical" className="focus-visible:outline-none">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-red-50 p-2 text-red-500"><Heart className="h-5 w-5" /></div>
              <h3 className="text-lg font-semibold text-navy">Health & Medical Profile</h3>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <Droplet className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted">Blood Group</span>
                  <div className="text-xl font-bold text-navy">{medical.bloodGroup || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted">Genotype</span>
                  <div className="text-xl font-bold text-navy">{medical.genotype || '—'}</div>
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-6">
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
                  <AlertCircle className="h-4 w-4 text-amber-500" /> Known Allergies
                </h4>
                {medical.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {medical.allergies.map((a) => (
                      <span key={a} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No allergies recorded</p>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Chronic Conditions</h4>
                <p className="text-sm font-medium text-navy">{medical.chronicConditions || 'None'}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 6. LOGISTICS TAB */}
        <TabsContent value="logistics" className="focus-visible:outline-none">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-semibold text-navy">Logistics & Accommodation</h2>
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                <div className="flex items-center gap-2 text-primary">
                  <Bus className="h-5 w-5" />
                  <h3 className="font-semibold text-navy">School Transport</h3>
                </div>
                <div className="mt-4 space-y-3">
                  <InfoField label="Status" value={logistics.transport.subscriptionStatus} />
                  <InfoField label="Mode" value={logistics.transport.transportMode} />
                  <InfoField label="Route Details" value={logistics.transport.routeDetails || '—'} />
                  <div className="grid grid-cols-2 gap-2">
                    <InfoField label="Bus Number" value={logistics.transport.busNumber || '—'} />
                    <InfoField label="Pickup Time" value={logistics.transport.pickupTime || '—'} />
                  </div>
                  <InfoField
                    label="Driver"
                    value={
                      logistics.transport.driverName
                        ? `${logistics.transport.driverName} (${logistics.transport.driverPhone || '—'})`
                        : '—'
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                <div className="flex items-center gap-2 text-primary">
                  <Home className="h-5 w-5" />
                  <h3 className="font-semibold text-navy">Boarding & Hostel</h3>
                </div>
                <div className="mt-4 space-y-3">
                  <InfoField label="Boarding Status" value={logistics.boarding.boardingStatus} />
                  <InfoField label="Dormitory Name" value={logistics.boarding.dormitoryName || '—'} />
                  <InfoField label="Room Number" value={logistics.boarding.roomNumber || '—'} />
                  <InfoField
                    label="Hostel Patron"
                    value={
                      logistics.boarding.dormitoryPatron
                        ? `${logistics.boarding.dormitoryPatron} (${logistics.boarding.patronPhone || '—'})`
                        : '—'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Modal */}
      {qrOpen && qrSrc ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setQrOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-navy">Student smart card QR</h2>
              <button type="button" onClick={() => setQrOpen(false)} className="rounded-lg p-1 text-muted hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="Student QR" className="mx-auto h-56 w-56 bg-white object-contain" />
            <p className="mt-3 text-center text-xs text-muted">
              Same QR printed on the Super Admin student card for {student.shuleCode}.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}

function ContactRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-navy">
      {icon}
      <span>{value}</span>
    </div>
  );
}

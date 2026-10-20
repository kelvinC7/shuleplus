'use client';

import { useEffect, useState } from 'react';
import {
  User, Phone, Mail, MapPin, Heart, AlertCircle, Droplet, Bus, Home,
  CreditCard, Activity, Loader2, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useStudentFetch } from '@/hooks/use-fetch';
import { formatDate } from '@/lib/format';

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

  const { student, parents, medical, logistics, smartCard } = data;
  const dobLabel = student.dateOfBirth
    ? `${formatDate(student.dateOfBirth)}${student.age != null ? ` (${student.age} years)` : ''}`
    : '—';
  const qrSrc = smartCard?.qrImageUrl;
  const scholarLabel = student.isBoarding || logistics.boarding.boardingStatus === 'Boarding Scholar'
    ? 'Boarding Student'
    : 'Day Scholar';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 sm:h-32 sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt={student.fullName}
              onError={() => setAvatarSrc(DEFAULT_AVATAR)}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{student.fullName}</h1>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Active</Badge>
              <Badge className="border-slate-200 bg-slate-50 text-navy">{scholarLabel}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-navy">
                {student.className || '—'}
              </span>
              <span>
                ShuleCode: <strong className="text-navy">{student.shuleCode || '—'}</strong>
              </span>
              {student.admissionDate ? (
                <span>
                  Admitted:{' '}
                  <strong className="text-navy">
                    {new Date(student.admissionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </strong>
                </span>
              ) : null}
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

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1 border border-slate-100 bg-white p-1 md:grid-cols-4">
          <TabsTrigger value="personal" className="py-2.5">Personal Details</TabsTrigger>
          <TabsTrigger value="parents" className="py-2.5">Parents & Emergency</TabsTrigger>
          <TabsTrigger value="medical" className="py-2.5">Medical Info</TabsTrigger>
          <TabsTrigger value="logistics" className="py-2.5">Transport & Dorm</TabsTrigger>
        </TabsList>

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
                      <Badge key={a} variant="outline" className="border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">{a}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No known allergies.</p>
                )}
              </div>
              <Separator />
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
                  <Heart className="h-4 w-4 text-rose-500" /> Chronic Conditions
                </h4>
                <p className="text-sm text-navy">{medical.chronicConditions || 'None reported.'}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-5 focus-visible:outline-none">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-600"><Bus className="h-5 w-5" /></div>
                <h3 className="text-lg font-semibold text-navy">Transport Route</h3>
              </div>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                {logistics.transport.subscriptionStatus}
              </Badge>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <InfoField label="Transport Mode" value={logistics.transport.transportMode || '—'} />
              <InfoField label="Route Details" value={logistics.transport.routeDetails || '—'} />
              <InfoField label="Bus Number" value={logistics.transport.busNumber || '—'} />
              <InfoField label="Driver Name" value={logistics.transport.driverName || '—'} />
              <InfoField label="Driver Phone" value={logistics.transport.driverPhone || '—'} />
              <InfoField label="Pickup Time" value={logistics.transport.pickupTime || '—'} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Home className="h-5 w-5" /></div>
                <h3 className="text-lg font-semibold text-navy">Boarding Information</h3>
              </div>
              <Badge className="border-slate-200 bg-slate-50 text-navy">{scholarLabel}</Badge>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
              <InfoField label="Dormitory Name" value={logistics.boarding.dormitoryName || '—'} />
              <InfoField label="Room Number" value={logistics.boarding.roomNumber || '—'} />
              <InfoField label="Dormitory Patron" value={logistics.boarding.dormitoryPatron || '—'} />
              <InfoField label="Patron Phone" value={logistics.boarding.patronPhone || '—'} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {qrOpen && qrSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={() => setQrOpen(false)}>
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

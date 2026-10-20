'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Mail, Phone, Globe, User } from 'lucide-react';
import { ModulePage } from '@/components/ui/module-page';
import { SchoolLogo } from '@/components/schools/school-logo';
import { nesaApi, type SchoolProfile } from '@/services/nesa-api';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/40">{label}</p>
      <p className="mt-1 text-sm font-medium text-navy">{value?.trim() || '—'}</p>
    </div>
  );
}

export default function SchoolDetailsPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await nesaApi.getSchool(id);
        if (!cancelled) setSchool(res.data.data);
      } catch (err) {
        if (!cancelled) {
          setSchool(null);
          setError(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Failed to load school details'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const locationLine = [
    school?.village,
    school?.cell,
    school?.sector,
    school?.district,
    school?.province,
    school?.country ?? 'Rwanda',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <ModulePage
      title={school?.schoolName ?? 'School details'}
      subtitle="Profile and location from Authentication registry"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/nesa/schools"
            className="inline-flex items-center gap-2 rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-semibold text-navy"
          >
            <ArrowLeft size={14} /> Back to list
          </Link>
          {school ? (
            <Link
              href={`/nesa/circulars/list?schoolId=${school.organizationId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-primary"
            >
              View circulars
            </Link>
          ) : null}
        </div>
      }
    >
      {loading ? <p className="text-sm text-navy/45">Loading profile…</p> : null}
      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {school ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="nesa-card space-y-5">
            <div className="flex items-start gap-4">
              <SchoolLogo
                logoUrl={school.logoUrl}
                name={school.schoolName}
                className="h-16 w-16"
                iconSize={24}
              />
              <div>
                <h2 className="text-xl font-bold text-navy">{school.schoolName}</h2>
                <p className="mt-1 text-sm text-navy/50">
                  {school.organizationCode ?? 'No code'} ·{' '}
                  {(school.ownershipType ?? '—').replaceAll('_', ' ')}
                </p>
                {school.schoolMotto ? (
                  <p className="mt-2 text-sm italic text-navy/55">&ldquo;{school.schoolMotto}&rdquo;</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" value={school.schoolCategory} />
              <Field label="Program" value={school.schoolProgram} />
              <Field label="Curriculum" value={school.curriculum} />
              <Field label="Academic year" value={school.academicYear} />
              <Field label="Shift" value={school.schoolShift} />
              <Field
                label="Education levels"
                value={
                  Array.isArray(school.educationLevels)
                    ? school.educationLevels.join(', ')
                    : String(school.educationLevels ?? '')
                }
              />
            </div>
          </section>

          <section className="nesa-card space-y-4">
            <h3 className="text-sm font-bold text-navy">Location</h3>
            <div className="flex items-start gap-2 rounded-2xl bg-navy/[0.03] p-4 text-sm text-navy">
              <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{locationLine || 'Location not configured'}</span>
            </div>
            <div className="grid gap-3">
              <Field label="Province" value={school.province} />
              <Field label="District" value={school.district} />
              <Field label="Sector" value={school.sector} />
              <Field label="Cell" value={school.cell} />
              <Field label="Village" value={school.village} />
              <Field label="Address" value={school.address} />
            </div>
          </section>

          <section className="nesa-card space-y-4 xl:col-span-2">
            <h3 className="text-sm font-bold text-navy">Contacts & leadership</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-navy">
                <Mail size={14} className="text-navy/35" /> {school.email || '—'}
              </div>
              <div className="flex items-center gap-2 text-sm text-navy">
                <Phone size={14} className="text-navy/35" /> {school.phone || '—'}
              </div>
              <div className="flex items-center gap-2 text-sm text-navy">
                <Globe size={14} className="text-navy/35" /> {school.website || '—'}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(school.leaders && school.leaders.length > 0
                ? school.leaders
                : [
                    { name: school.principalName ?? '', role: 'Head Teacher' },
                    { name: school.deputyHeadName ?? '', role: 'Deputy Head' },
                    { name: school.bursarName ?? '', role: 'Accountant' },
                    { name: school.secretaryName ?? '', role: 'Secretary' },
                  ].filter((l) => l.name)
              ).map((leader) => (
                <div
                  key={`${leader.role}-${leader.name}`}
                  className="rounded-2xl border border-navy/10 bg-navy/[0.02] p-3"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-navy/40">
                    <User size={14} />
                  </div>
                  <p className="text-sm font-semibold text-navy">{leader.name}</p>
                  <p className="text-xs text-navy/45">{leader.role}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </ModulePage>
  );
}

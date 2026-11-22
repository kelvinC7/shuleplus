import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useSchoolAuth } from '@/contexts/school-auth-context';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea, CheckboxField } from '@/components/ui/form-field';
import { StudentManifestStep, type ManifestSelection } from '@/schools/components/StudentManifestStep';
import { StaffStep, type StaffRow } from '@/schools/components/StaffStep';
import { DocumentsConsentStep, type TripDocumentEntry } from '@/schools/components/DocumentsConsentStep';
import { TripWizardStepper } from '@/schools/components/TripWizardStepper';
import { TripReviewStep } from '@/schools/components/TripReviewStep';
import type { ReadinessReport, TripDetail, TripApprovalFeedback } from '@/schools/types/trip';
import { TransportRouteStep } from '@/schools/components/TransportRouteStep';
import { hasRequiredTripDocument, TRIP_DOC_TYPES } from '@/schools/config/trip-documents';
import { SchoolGovernmentFeedback } from '@/schools/components/SchoolGovernmentFeedback';
import { SchoolTripGovernanceTimeline } from '@/schools/components/SchoolTripGovernanceTimeline';

const STEPS = [
  'Trip information',
  'Student manifest',
  'Staff & supervision',
  'Transport & route',
  'Safety & risk',
  'Documents & consent',
  'Review & submit',
];

export default function RegisterTripWizardPage() {
  const { tripId: routeTripId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftIdFromQuery = searchParams.get('draft');
  const navigate = useNavigate();
  const { summary } = useSchoolAuth();
  const [step, setStep] = useState(0);
  const [tripId, setTripId] = useState<string | null>(routeTripId ?? null);
  const [tripReference, setTripReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);

  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [itinerary, setItinerary] = useState('');
  const [departAt, setDepartAt] = useState('');
  const [returnAt, setReturnAt] = useState('');
  const [tripLeaderName, setTripLeaderName] = useState('');
  const [participants, setParticipants] = useState<ManifestSelection[]>([]);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([{ fullName: '', role: 'Teacher', isLeader: true }]);
  const [vehicle, setVehicle] = useState({
    mode: 'Bus',
    plateNumber: '',
    vehicleType: 'Coaster',
    capacity: 30,
    driverName: '',
    driverPhone: '',
    driverLicenseCategory: '',
    driverLicenseNumber: '',
  });
  const [departurePoint, setDeparturePoint] = useState('');
  const [safety, setSafety] = useState({ risksIdentified: false, firstAidPlan: false, emergencyPlan: false });
  const [documents, setDocuments] = useState<TripDocumentEntry[]>([]);
  const [refreshingConsent, setRefreshingConsent] = useState(false);
  const [govFeedback, setGovFeedback] = useState<{
    status: string;
    correctionNote?: string | null;
    correctionDueAt?: string | null;
    approvals?: TripApprovalFeedback[];
    reference: string;
    title: string;
    currentStageKey?: string | null;
    submittedAt?: string | null;
  } | null>(null);

  const isEdit = Boolean(routeTripId);
  const draftCreateRef = useRef<Promise<string> | null>(null);
  /** After creating a draft on /trips/new, skip server hydrate so we do not reset the wizard step. */
  const skipHydrateOnceRef = useRef(false);
  const wizardTouchedRef = useRef(false);

  useEffect(() => {
    wizardTouchedRef.current =
      wizardTouchedRef.current || step > 0 || Boolean(title.trim()) || participants.length > 0;
  }, [step, title, participants.length]);

  useEffect(() => {
    const persistedId = routeTripId ?? draftIdFromQuery;
    if (!persistedId) return;

    if (skipHydrateOnceRef.current) {
      skipHydrateOnceRef.current = false;
      setTripId(persistedId);
      return;
    }

    if (!routeTripId && wizardTouchedRef.current && tripId === persistedId) {
      return;
    }

    (async () => {
      try {
        const { data } = await api.get<{ data: TripDetail }>(`/trips/${persistedId}`);
        hydrateFromTrip(data.data);
        setTripId(data.data.id);
        setTripReference(data.data.reference);
        if (!wizardTouchedRef.current) {
          setStep(data.data.wizardStep ?? 0);
        }
        await refreshReadiness(data.data.id);
      } catch {
        setError('Could not load trip draft');
      }
    })();
  }, [routeTripId, draftIdFromQuery]);

  function hydrateFromTrip(t: TripDetail) {
    setGovFeedback({
      status: t.status,
      correctionNote: t.correctionNote,
      correctionDueAt: t.correctionDueAt,
      approvals: t.approvals,
      reference: t.reference,
      title: t.title,
      currentStageKey: t.currentStageKey,
      submittedAt: t.submittedAt,
    });
    setTitle(t.title);
    setTripReference(t.reference);
    setPurpose(t.purpose ?? '');
    setDestination(t.destination ?? '');
    setItinerary(t.itinerary ?? '');
    setDepartAt(t.departAt ? t.departAt.slice(0, 16) : '');
    setReturnAt(t.returnAt ? t.returnAt.slice(0, 16) : '');
    setTripLeaderName(t.tripLeaderName ?? '');
    setParticipants(
      t.participants.map((p) => ({
        studentId: p.studentId,
        studentCode: p.studentCode ?? p.studentId,
        fullName: p.fullName,
        classLabel: p.classLabel ?? undefined,
        guardianPhone: p.guardianPhone ?? undefined,
        guardianEmail: p.guardianEmail ?? undefined,
        photoUrl: p.photoUrl ?? undefined,
        guardianConsent: p.guardianConsent,
      }))
    );
    if (t.staff.length) setStaffRows(t.staff.map((s) => ({ fullName: s.fullName, role: s.role, isLeader: s.isLeader })));
    if (t.vehicles[0]) {
      const v = t.vehicles[0];
      setVehicle({
        mode: v.mode ?? 'Bus',
        plateNumber: v.plateNumber ?? '',
        vehicleType: v.vehicleType ?? '',
        capacity: v.capacity ?? 30,
        driverName: v.driverName ?? '',
        driverPhone: v.driverPhone ?? '',
        driverLicenseCategory: v.driverLicenseCategory ?? '',
        driverLicenseNumber: v.driverLicenseNumber ?? '',
      });
    }
    const rd = t.routeDetails as { departurePoint?: string } | null;
    if (rd?.departurePoint) setDeparturePoint(rd.departurePoint);
    const sd = t.safetyDetails as typeof safety | null;
    if (sd) setSafety({ ...safety, ...sd });
    setDocuments(
      t.documents.map((d) => ({
        documentType: d.documentType,
        fileName: d.fileName ?? '',
        id: d.id,
        storageKey: d.storageKey,
        fileSize: d.fileSize,
      }))
    );
  }

  async function ensureDraft() {
    if (tripId) return tripId;
    if (draftCreateRef.current) return draftCreateRef.current;

    draftCreateRef.current = (async () => {
      const { data } = await api.post<{ data: { id: string; reference?: string } }>('/trips', {
        title: title.trim() || 'Untitled trip draft',
      });
      setTripId(data.data.id);
      if (data.data.reference) setTripReference(data.data.reference);
      if (!routeTripId) {
        skipHydrateOnceRef.current = true;
        wizardTouchedRef.current = true;
        setSearchParams({ draft: data.data.id }, { replace: true });
        try {
          await api.put(`/trips/${data.data.id}/wizard`, wizardPayload(step));
        } catch {
          /* Draft exists; full save happens on submit */
        }
      }
      return data.data.id;
    })();

    try {
      return await draftCreateRef.current;
    } finally {
      draftCreateRef.current = null;
    }
  }

  async function refreshReadiness(id: string) {
    try {
      const { data } = await api.get<{ data: ReadinessReport }>(`/trips/${id}/readiness`);
      setReadiness(data.data);
    } catch {
      setReadiness(null);
    }
  }

  async function refreshConsentFromServer() {
    if (!tripId) return;
    setRefreshingConsent(true);
    try {
      const { data } = await api.get<{ data: TripDetail }>(`/trips/${tripId}`);
      setParticipants((prev) =>
        prev.map((p) => {
          const row = data.data.participants.find((x) => x.studentId === p.studentId);
          return row ? { ...p, guardianConsent: row.guardianConsent } : p;
        })
      );
    } finally {
      setRefreshingConsent(false);
    }
  }

  useEffect(() => {
    if (step !== 5 || !tripId) return;
    void refreshConsentFromServer();
  }, [step, tripId]);

  function wizardPayload(targetStep: number) {
    const staff = staffRows.filter((s) => s.fullName.trim());
    const leader = staff.find((s) => s.isLeader);
    return {
      trip: {
        title: title.trim(),
        purpose: purpose.trim() || undefined,
        destination: destination.trim() || undefined,
        itinerary: itinerary.trim() || undefined,
        departAt: departAt ? new Date(departAt).toISOString() : undefined,
        returnAt: returnAt ? new Date(returnAt).toISOString() : undefined,
        tripLeaderName: (leader?.fullName ?? tripLeaderName).trim() || undefined,
        routeDetails: { departurePoint },
        safetyDetails: safety,
        wizardStep: targetStep,
      },
      participants,
      staff,
      vehicles: [vehicle],
      documents: documents.filter((d) => d.documentType && d.fileName),
    };
  }

  async function persistAllSections(targetStep = step) {
    const id = await ensureDraft();
    const { data } = await api.put<{ data: { trip: TripDetail; readiness: ReadinessReport } }>(
      `/trips/${id}/wizard`,
      wizardPayload(targetStep)
    );
    setReadiness(data.data.readiness);
    setTripReference(data.data.trip.reference);
    return id;
  }

  function validateCurrentStep(current: number): string | null {
    if (current === 0) {
      if (!title.trim()) return 'Enter a trip title.';
      if (!destination.trim()) return 'Enter the destination.';
    }
    if (current === 1 && !participants.length) return 'Add at least one student to the manifest.';
    if (current === 2) {
      const staff = staffRows.filter((s) => s.fullName.trim());
      if (!staff.length) return 'Add at least one staff member.';
      if (!staff.some((s) => s.isLeader)) return 'Mark one staff member as trip leader.';
    }
    if (current === 3) {
      if (!vehicle.plateNumber.trim()) return 'Enter the vehicle plate number.';
      if (!vehicle.driverName.trim()) return 'Enter the driver name.';
      if (!vehicle.driverLicenseCategory.trim()) return 'Select the driver license category.';
      if (!vehicle.driverLicenseNumber.trim()) return 'Enter the driver license number.';
    }
    if (current === 4 && (!safety.risksIdentified || !safety.firstAidPlan || !safety.emergencyPlan)) {
      return 'Complete the safety and risk checklist.';
    }
    if (current === 5) {
      for (const doc of TRIP_DOC_TYPES.filter((d) => d.required)) {
        if (!hasRequiredTripDocument(documents, doc.type)) {
          return `Upload required document: ${doc.type}.`;
        }
      }
    }
    return null;
  }

  function validateBeforeSubmit(): string | null {
    for (let i = 0; i <= 5; i++) {
      const msg = validateCurrentStep(i);
      if (msg) return msg;
    }
    return null;
  }

  function buildLocalReadiness(): ReadinessReport {
    const blockers: ReadinessReport['blockers'] = [];
    const push = (key: string, label: string, message: string) =>
      blockers.push({ key, label, level: 'blocker', message });

    if (!title.trim()) push('title', 'Trip title', 'Trip title is required.');
    if (!destination.trim()) push('destination', 'Destination', 'Destination is required.');
    if (!departAt) push('departAt', 'Departure', 'Set a departure date and time.');
    if (!participants.length) push('participants', 'Student manifest', 'Add students to the manifest.');
    if (!staffRows.some((s) => s.fullName.trim() && s.isLeader)) {
      push('trip_leader', 'Trip leader', 'Assign a trip leader in staff step.');
    }
    if (
      !vehicle.plateNumber.trim() ||
      !vehicle.driverName.trim() ||
      !vehicle.driverLicenseCategory.trim() ||
      !vehicle.driverLicenseNumber.trim()
    ) {
      push('transport', 'Transport', 'Complete transport and driver details.');
    }
    if (!safety.risksIdentified || !safety.firstAidPlan || !safety.emergencyPlan) {
      push('safety_plan', 'Safety plan', 'Complete all safety checklist items.');
    }
    for (const doc of TRIP_DOC_TYPES.filter((d) => d.required)) {
      if (!hasRequiredTripDocument(documents, doc.type)) {
        push('documents', 'Documents', `Missing: ${doc.type}`);
      }
    }
    const warnings: ReadinessReport['warnings'] = [];
    const pending = participants.filter((p) => !p.guardianConsent).length;
    if (pending > 0) {
      warnings.push({
        key: 'guardian_consent',
        label: 'Guardian consent',
        level: 'warning',
        message: `${pending} parent consent(s) pending — you can submit; parents approve in ParentMIS after submission.`,
      });
    }

    return { score: blockers.length ? 0 : 100, blockers, warnings, advisories: [] };
  }

  async function goNext() {
    const msg = validateCurrentStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    const nextStep = Math.min(STEPS.length - 1, step + 1);
    setStep(nextStep);
    if (nextStep === STEPS.length - 1) {
      setSaving(true);
      try {
        const id = await persistAllSections(nextStep);
        await refreshReadiness(id);
      } catch {
        setReadiness(buildLocalReadiness());
      } finally {
        setSaving(false);
      }
    }
  }

  async function submitTrip() {
    const msg = validateBeforeSubmit();
    if (msg) {
      setError(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await persistAllSections(6);
      const { data } = await api.get<{ data: ReadinessReport }>(`/trips/${id}/readiness`);
      setReadiness(data.data);
      if (data.data.blockers.length) {
        setError(data.data.blockers[0]?.message ?? 'Fix required items before submitting.');
        return;
      }
      await api.post(`/trips/${id}/submit`);
      navigate('/school/trips');
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Submission failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Trip application' : 'Register new trip'}
        description="Complete each step locally. Your trip is saved once when you submit the application."
      />

      <TripWizardStepper steps={STEPS} current={step} onStep={setStep} />

      {govFeedback && govFeedback.status !== 'DRAFT' ? (
        <>
          <SchoolTripGovernanceTimeline
            trip={{
              id: tripId ?? '',
              reference: govFeedback.reference,
              title: govFeedback.title,
              status: govFeedback.status,
              currentStageKey: govFeedback.currentStageKey,
              submittedAt: govFeedback.submittedAt,
              correctionNote: govFeedback.correctionNote,
              correctionDueAt: govFeedback.correctionDueAt,
              approvals: govFeedback.approvals,
              participants: [],
              staff: [],
              vehicles: [],
              documents: [],
            }}
          />
          <SchoolGovernmentFeedback
            trip={{
              id: tripId ?? '',
              reference: govFeedback.reference,
              title: govFeedback.title,
              status: govFeedback.status,
              correctionNote: govFeedback.correctionNote,
              correctionDueAt: govFeedback.correctionDueAt,
              approvals: govFeedback.approvals,
              participants: [],
              staff: [],
              vehicles: [],
              documents: [],
            }}
          />
        </>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-slate-50/80 px-6 py-4">
          <h2 className="text-sm font-bold text-navy">{STEPS[step]}</h2>
          <p className="text-xs text-slate-500">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        <div className="p-6">
          {step === 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Trip title" required className="md:col-span-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cultural visit · Nyagatare" />
              </Field>
              <Field label="Educational purpose" className="md:col-span-2">
                <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="Learning outcomes for this journey" />
              </Field>
              <Field label="Destination" required className="md:col-span-2">
                <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City, site, or venue" />
              </Field>
              <Field label="Itinerary summary" className="md:col-span-2">
                <Textarea value={itinerary} onChange={(e) => setItinerary(e.target.value)} rows={2} placeholder="Stops, activities, overnight stays" />
              </Field>
              <Field label="Departure" hint="Local date and time">
                <Input type="datetime-local" value={departAt} onChange={(e) => setDepartAt(e.target.value)} />
              </Field>
              <Field label="Expected return">
                <Input type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} />
              </Field>
              <Field label="Trip leader (name)" className="md:col-span-2">
                <Input value={tripLeaderName} onChange={(e) => setTripLeaderName(e.target.value)} placeholder="Filled automatically when you mark a staff leader" />
              </Field>
            </div>
          ) : null}

          {step === 1 ? (
            <StudentManifestStep
              selected={participants}
              onChange={setParticipants}
              manifestMode={summary?.studentManifestMode ?? 'manual'}
            />
          ) : null}

          {step === 2 ? (
            <StaffStep rows={staffRows} onChange={setStaffRows} onLeaderName={setTripLeaderName} />
          ) : null}

          {step === 3 ? (
            <TransportRouteStep
              departurePoint={departurePoint}
              onDeparturePointChange={setDeparturePoint}
              vehicle={vehicle}
              onVehicleChange={setVehicle}
            />
          ) : null}

          {step === 4 ? (
            <div className="grid gap-3 md:grid-cols-1">
              {(
                [
                  ['risksIdentified', 'Travel and destination risks identified', 'Hazards reviewed for route and venue'],
                  ['firstAidPlan', 'First aid arrangements documented', 'Kit, trained staff, and clinic contacts'],
                  ['emergencyPlan', 'Emergency response plan in place', 'Communication chain and evacuation steps'],
                ] as const
              ).map(([key, label, description]) => (
                <CheckboxField
                  key={key}
                  label={label}
                  description={description}
                  checked={safety[key]}
                  onChange={(checked) => setSafety({ ...safety, [key]: checked })}
                />
              ))}
            </div>
          ) : null}

          {step === 5 ? (
            <DocumentsConsentStep
              tripId={tripId}
              onEnsureDraft={ensureDraft}
              documents={documents}
              onDocumentsChange={setDocuments}
              participants={participants}
              onRefreshConsent={refreshConsentFromServer}
              refreshingConsent={refreshingConsent}
              driverName={vehicle.driverName}
              driverLicenseCategory={vehicle.driverLicenseCategory}
              driverLicenseNumber={vehicle.driverLicenseNumber}
            />
          ) : null}

          {step === 6 ? (
            <TripReviewStep
              title={title}
              summary={`${participants.length} learners · ${staffRows.filter((s) => s.fullName.trim()).length} staff · ${destination || 'No destination yet'}`}
              readiness={buildLocalReadiness()}
              onGoToStep={setStep}
              tripReference={tripReference}
            />
          ) : null}

          {error ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-slate-50/50 px-6 py-4">
          <Button variant="outline" disabled={step === 0 || saving} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <div className="flex flex-wrap gap-2">
            {step < STEPS.length - 1 ? (
              <Button variant="amber" disabled={saving} onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={saving || buildLocalReadiness().blockers.length > 0}
                onClick={submitTrip}
              >
                {saving ? 'Submitting…' : 'Submit application'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

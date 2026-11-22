export type TripDocumentKind = 'approval' | 'safety' | 'packing' | 'receipt';

export interface TripDocumentMeta {
  id: string;
  title: string;
  kind: TripDocumentKind;
  includesSignature?: boolean;
}

export interface TripGalleryItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  caption: string;
  schoolApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

export interface TripLiveUpdate {
  id: string;
  at: string;
  title: string;
  detail?: string;
  delivered: { inApp: boolean; push: boolean; sms: boolean };
}

export interface TripNotificationPrefs {
  smsEnabled: boolean;
  pushEnabled: boolean;
}

/** Trip shape stored in settings JSON (enrichment adds optional fields). */
export interface EnrichableTrip {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  reference?: string;
  purpose?: string;
  place: string;
  date: string;
  short: string;
  depart: string;
  ret: string;
  departAtIso?: string | null;
  returnAtIso?: string | null;
  cost: number;
  paid: number;
  inst: number;
  due: string;
  day: number;
  teacher: string;
  ph: string;
  plan: Array<[string, string]>;
  pack: string[];
  consent?: {
    by: string;
    at: string;
    atIso?: string;
    status?: 'approved' | 'declined';
    confirmations?: { read?: boolean; approve?: boolean; emergency?: boolean };
  };
  documents?: TripDocumentMeta[];
  gallery?: TripGalleryItem[];
  liveUpdates?: TripLiveUpdate[];
  notifications?: TripNotificationPrefs;
  mediaPublished?: boolean;
}

/** Pass through school-synced data only — no demo gallery, updates, or documents. */
export function enrichSchoolTrip<T extends EnrichableTrip>(trip: T): T {
  return {
    ...trip,
    documents: trip.documents ?? [],
    gallery: trip.gallery ?? [],
    liveUpdates: trip.liveUpdates ?? [],
    notifications: trip.notifications ?? { smsEnabled: false, pushEnabled: true },
  };
}

export function enrichSchoolTrips<T extends EnrichableTrip>(trips: T[]): T[] {
  return trips.map(enrichSchoolTrip);
}

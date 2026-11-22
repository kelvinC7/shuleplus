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

export interface SchoolTrip {
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

export type TripConsentState = 'approved' | 'declined' | 'awaiting';

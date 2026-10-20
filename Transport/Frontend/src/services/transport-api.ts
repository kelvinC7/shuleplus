import { api, type ApiEnvelope } from '@/services/api';

export const transportApi = {
  tenantEnsure: (body?: { organizationName?: string; organizationCode?: string }) =>
    api.post<ApiEnvelope<unknown>>('/tenant/ensure', body ?? {}),

  dashboard: () => api.get<ApiEnvelope<DashboardData>>('/dashboard'),
  liveOperations: () => api.get<ApiEnvelope<LiveOpsData>>('/live-operations'),

  settingsGet: () => api.get<ApiEnvelope<TransportSettings>>('/settings'),
  settingsPut: (body: Partial<TransportSettings>) =>
    api.put<ApiEnvelope<TransportSettings>>('/settings', body),

  tap: (body: { cardNumber: string; deviceCode?: string; type?: 'BOARDING' | 'EXIT'; busCode?: string }) =>
    api.post<ApiEnvelope<TapResult>>('/tap', body),

  trips: () => api.get<ApiEnvelope<Trip[]>>('/trips'),
  getTrip: (id: string) => api.get<ApiEnvelope<Trip>>(`/trips/${id}`),
  prepareTrip: (body: Record<string, unknown>) => api.post<ApiEnvelope<Trip>>('/trips/prepare', body),
  startTrip: (id: string, force?: boolean) => api.post<ApiEnvelope<Trip>>(`/trips/${id}/start`, { force }),
  completeTrip: (id: string) => api.post<ApiEnvelope<Trip>>(`/trips/${id}/complete`),
  reconcile: (id: string, studentCode: string, mark: string, note?: string) =>
    api.post<ApiEnvelope<unknown>>(`/trips/${id}/reconcile`, { studentCode, mark, note }),
  pingGps: (id: string, body: Record<string, unknown>) =>
    api.post<ApiEnvelope<Trip>>(`/trips/${id}/gps`, body),

  buses: () => api.get<ApiEnvelope<Bus[]>>('/buses'),
  createBus: (body: Record<string, unknown>) => api.post<ApiEnvelope<Bus>>('/buses', body),
  updateBus: (id: string, body: Record<string, unknown>) => api.patch<ApiEnvelope<Bus>>(`/buses/${id}`, body),

  drivers: () => api.get<ApiEnvelope<Crew[]>>('/drivers'),
  createDriver: (body: Record<string, unknown>) => api.post<ApiEnvelope<Crew>>('/drivers', body),
  attendants: () => api.get<ApiEnvelope<Crew[]>>('/attendants'),
  createAttendant: (body: Record<string, unknown>) => api.post<ApiEnvelope<Crew>>('/attendants', body),

  routes: () => api.get<ApiEnvelope<Route[]>>('/routes'),
  createRoute: (body: Record<string, unknown>) => api.post<ApiEnvelope<Route>>('/routes', body),
  createStop: (body: Record<string, unknown>) => api.post<ApiEnvelope<Stop>>('/stops', body),

  students: (q?: string) => api.get<ApiEnvelope<Student[]>>('/students', { params: q ? { q } : undefined }),
  createStudent: (body: Record<string, unknown>) => api.post<ApiEnvelope<Student>>('/students', body),
  updateStudent: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiEnvelope<Student>>(`/students/${id}`, body),

  cards: (params?: { status?: string; q?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: RfidCard[]; total: number; page: number; totalPages: number }>(
      '/cards',
      { params }
    ),
  createCard: (body: Record<string, unknown>) => api.post<ApiEnvelope<RfidCard>>('/cards', body),
  updateCardStatus: (id: string, status: string, reason?: string) =>
    api.patch<ApiEnvelope<RfidCard>>(`/cards/${id}/status`, { status, reason }),
  replaceCard: (id: string, newCardNumber?: string) =>
    api.post<ApiEnvelope<RfidCard>>(`/cards/${id}/replace`, { newCardNumber }),

  devices: () => api.get<ApiEnvelope<RfidDevice[]>>('/devices'),
  createDevice: (body: Record<string, unknown>) => api.post<ApiEnvelope<RfidDevice>>('/devices', body),
  testDevice: (id: string) => api.post<ApiEnvelope<RfidDevice>>(`/devices/${id}/test`),

  boarding: (q?: string) => api.get<ApiEnvelope<BoardingEvent[]>>('/boarding', { params: q ? { q } : undefined }),

  alerts: () => api.get<ApiEnvelope<SafetyAlert[]>>('/alerts'),
  resolveAlert: (id: string) => api.post<ApiEnvelope<unknown>>(`/alerts/${id}/resolve`),
  missing: () => api.get<ApiEnvelope<Student[]>>('/missing'),
  emergencies: () => api.get<ApiEnvelope<Emergency[]>>('/emergencies'),
  raiseEmergency: (body: Record<string, unknown>) => api.post<ApiEnvelope<Emergency>>('/emergencies', body),
  resolveEmergency: (id: string) => api.post<ApiEnvelope<Emergency>>(`/emergencies/${id}/resolve`),
  incidents: () => api.get<ApiEnvelope<Incident[]>>('/incidents'),
  createIncident: (body: Record<string, unknown>) => api.post<ApiEnvelope<Incident>>('/incidents', body),

  fees: () => api.get<ApiEnvelope<TransportFee[]>>('/fees'),
  createFee: (body: Record<string, unknown>) => api.post<ApiEnvelope<TransportFee>>('/fees', body),
  fuel: () => api.get<ApiEnvelope<FuelRecord[]>>('/fuel'),
  createFuel: (body: Record<string, unknown>) => api.post<ApiEnvelope<FuelRecord>>('/fuel', body),
  maintenance: () => api.get<ApiEnvelope<MaintenanceRecord[]>>('/maintenance'),
  createMaintenance: (body: Record<string, unknown>) =>
    api.post<ApiEnvelope<MaintenanceRecord>>('/maintenance', body),
  documents: () => api.get<ApiEnvelope<BusDocument[]>>('/documents'),
  createDocument: (body: Record<string, unknown>) => api.post<ApiEnvelope<BusDocument>>('/documents', body),

  notifications: () => api.get<ApiEnvelope<ParentNotification[]>>('/notifications'),
  reportsSummary: () => api.get<ApiEnvelope<ReportsSummary>>('/reports/summary'),
};

export interface TransportSettings {
  id: string;
  enableParentNotify: boolean;
  enableSms: boolean;
  enableEmail: boolean;
  enableWhatsapp: boolean;
  enablePush: boolean;
  requireReconciliation: boolean;
  allowWrongBus: boolean;
  duplicateTapSeconds: number;
  morningStart: string;
  schoolArrival: string;
  afternoonStart: string;
  homeArrival: string;
  academicYear: string;
  term: string;
  schoolName?: string | null;
}

export interface Bus {
  id: string;
  code: string;
  plateNumber: string;
  busType: string;
  capacity: number;
  status: string;
  lastLocation?: string | null;
  speedKmh?: number | null;
  mileageKm?: number;
  nextServiceKm?: number | null;
  insuranceValidTo?: string | null;
  inspectionValidTo?: string | null;
  currentStudents?: number;
  driver?: Crew | null;
  attendant?: Crew | null;
  route?: Route | null;
}

export interface Crew {
  id: string;
  name: string;
  phone?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  status: string;
  buses?: Bus[];
}

export interface Stop {
  id: string;
  name: string;
  sequence: number;
  etaMinutes?: number | null;
}

export interface Route {
  id: string;
  name: string;
  code: string;
  direction: string;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  status: string;
  stops?: Stop[];
  buses?: Bus[];
  _count?: { assignments: number };
}

export interface Student {
  id: string;
  studentCode: string;
  studentName: string;
  className?: string | null;
  liveState: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  transportSuspended?: boolean;
  pickupStop?: Stop | null;
  dropoffStop?: Stop | null;
  morningBus?: Bus | null;
  afternoonBus?: Bus | null;
  route?: Route | null;
  cards?: RfidCard[];
}

export interface RfidCard {
  id: string;
  cardNumber: string;
  status: string;
  studentName?: string | null;
  studentCode?: string | null;
  className?: string | null;
  usageCount?: number;
  lastUsedAt?: string | null;
  issuedAt?: string | null;
}

export interface RfidDevice {
  id: string;
  deviceCode: string;
  name: string;
  status: string;
  batteryPercent?: number | null;
  lastSeenAt?: string | null;
  bus?: Bus | null;
}

export interface TripPassenger {
  id: string;
  studentCode: string;
  studentName: string;
  className?: string | null;
  mark: string;
  boardedAt?: string | null;
  exitedAt?: string | null;
}

export interface Trip {
  id: string;
  status: string;
  direction: string;
  lastLocation?: string | null;
  speedKmh?: number | null;
  etaAt?: string | null;
  lastRfidAt?: string | null;
  lastRfidName?: string | null;
  expectedCount: number;
  boardedCount: number;
  exitedCount: number;
  missingCount: number;
  reconciled: boolean;
  startedAt?: string | null;
  bus: Bus;
  route?: Route | null;
  driver?: Crew | null;
  attendant?: Crew | null;
  passengers?: TripPassenger[];
}

export interface BoardingEvent {
  id: string;
  studentName: string;
  studentCode?: string | null;
  cardNumber?: string | null;
  busCode?: string | null;
  routeName?: string | null;
  stopName?: string | null;
  driverName?: string | null;
  type: string;
  outcome: string;
  scannedAt: string;
}

export interface SafetyAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  resolved: boolean;
  createdAt: string;
}

export interface Emergency {
  id: string;
  type: string;
  status: string;
  location?: string | null;
  studentCount?: number | null;
  driverName?: string | null;
  notes?: string | null;
  createdAt: string;
  bus?: Bus | null;
}

export interface Incident {
  id: string;
  title: string;
  detail?: string | null;
  busCode?: string | null;
  driverName?: string | null;
  severity: string;
  resolved: boolean;
  createdAt: string;
}

export interface TransportFee {
  id: string;
  studentName: string;
  studentCode?: string | null;
  academicYear: string;
  term: string;
  routeName?: string | null;
  amountRwf: number;
  paidRwf: number;
  status: string;
}

export interface FuelRecord {
  id: string;
  litres: number;
  costRwf: number;
  mileageKm?: number | null;
  driverName?: string | null;
  purchasedAt: string;
  bus?: Bus | null;
}

export interface MaintenanceRecord {
  id: string;
  kind: string;
  title: string;
  dueAt?: string | null;
  costRwf?: number | null;
  mileageKm?: number | null;
  notes?: string | null;
  bus?: Bus | null;
}

export interface BusDocument {
  id: string;
  kind: string;
  title: string;
  validTo?: string | null;
  bus?: Bus | null;
}

export interface ParentNotification {
  id: string;
  studentName: string;
  channel: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface DashboardData {
  organizationName: string;
  academicYear: string;
  term: string;
  kpis: Record<string, number>;
  liveTrips: Trip[];
  recentEvents: BoardingEvent[];
}

export interface LiveOpsData extends DashboardData {
  buses: Bus[];
  alerts: SafetyAlert[];
  emergencies: Emergency[];
  missingStudents: Student[];
  todayTrips: Trip[];
  refreshedAt: string;
}

export interface TapResult {
  access: string;
  type: string;
  status: string;
  student: { name: string; code?: string | null; className?: string | null; cardNumber: string };
  bus: { code: string; route?: string | null; driver?: string | null };
  time: string;
  parentMessage?: string;
}

export interface ReportsSummary {
  students: { total: number; onBus: number; missing: number; atSchool: number };
  buses: { code: string; used: number; capacity: number; percent: number }[];
  trips: { total: number; onTime: number; live: number; delayed: number };
  finance: {
    billed: number;
    revenue: number;
    fuelCost: number;
    maintenanceCost: number;
    litres: number;
    efficiency: number;
    profit: number;
  };
  boardingTrends: { day: string; boarded: number }[];
  recentEvents: BoardingEvent[];
  wrongBus: number;
}

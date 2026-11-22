import { api, type ApiEnvelope } from '@/services/api';

export const transportApi = {
  tenantEnsure: (body?: { organizationName?: string; organizationCode?: string }) =>
    api.post<ApiEnvelope<unknown>>('/tenant/ensure', body ?? {}),

  dashboard: () => api.get<ApiEnvelope<DashboardData>>('/dashboard'),
  liveOperations: () => api.get<ApiEnvelope<LiveOpsData>>('/live-operations'),

  settingsGet: () => api.get<ApiEnvelope<TransportSettings>>('/settings'),
  settingsPut: (body: Partial<TransportSettings>) =>
    api.put<ApiEnvelope<TransportSettings>>('/settings', body),

  tap: (body: {
    cardNumber: string;
    deviceCode?: string;
    type?: 'BOARDING' | 'EXIT';
    busCode?: string;
    tripId?: string;
    eventType?: TransportEventType;
    idempotencyKey?: string;
    attendanceMethod?: 'MANUAL' | 'QR' | 'RFID';
    clientRecordedAt?: string;
  }) => api.post<ApiEnvelope<TapResult>>('/tap', body),

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
  nextBusCode: () => api.get<ApiEnvelope<{ code: string }>>('/buses/next-code'),
  getBus: (id: string) => api.get<ApiEnvelope<Bus>>(`/buses/${id}`),
  createBus: (body: Record<string, unknown>) => api.post<ApiEnvelope<Bus>>('/buses', body),
  updateBus: (id: string, body: Record<string, unknown>) => api.patch<ApiEnvelope<Bus>>(`/buses/${id}`, body),
  deleteBus: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/buses/${id}`),
  assignBusDriver: (id: string, body: Record<string, unknown>) =>
    api.post<ApiEnvelope<Bus>>(`/buses/${id}/assign-driver`, body),
  orgUsers: (q?: string) =>
    api.get<ApiEnvelope<OrgAccessUser[]>>('/org-users', { params: q ? { q } : undefined }),

  drivers: () => api.get<ApiEnvelope<Crew[]>>('/drivers'),
  createDriver: (body: Record<string, unknown>) => api.post<ApiEnvelope<Crew>>('/drivers', body),
  attendants: () => api.get<ApiEnvelope<Crew[]>>('/attendants'),
  createAttendant: (body: Record<string, unknown>) => api.post<ApiEnvelope<Crew>>('/attendants', body),

  routes: () => api.get<ApiEnvelope<Route[]>>('/routes'),
  routesDashboard: () => api.get<ApiEnvelope<RoutesDashboard>>('/routes/dashboard'),
  routesPage: (params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    serviceDirection?: string;
    busId?: string;
  }) =>
    api.get<ApiEnvelope<RoutesPageResult>>('/routes/page', {
      params: {
        page: params?.page,
        limit: params?.limit,
        q: params?.q,
        status: params?.status,
        serviceDirection: params?.serviceDirection,
        busId: params?.busId,
      },
    }),
  nextRouteCode: () => api.get<ApiEnvelope<{ code: string }>>('/routes/next-code'),
  getRoute: (id: string) => api.get<ApiEnvelope<RouteDetail>>(`/routes/${id}`),
  routeSupervisors: (routeId: string) => api.get<ApiEnvelope<RouteSupervisor[]>>(`/routes/${routeId}/supervisors`),
  addRouteSupervisor: (routeId: string, body: Record<string, unknown>) =>
    api.post<ApiEnvelope<RouteSupervisor>>(`/routes/${routeId}/supervisors`, body),
  removeRouteSupervisor: (routeId: string, supervisorId: string) =>
    api.delete<ApiEnvelope<{ id: string }>>(`/routes/${routeId}/supervisors/${supervisorId}`),
  createRouteFull: (body: Record<string, unknown>) => api.post<ApiEnvelope<RouteDetail>>('/routes/full', body),
  updateRouteFull: (id: string, body: Record<string, unknown>) =>
    api.put<ApiEnvelope<RouteDetail>>(`/routes/${id}/full`, body),
  deleteRoute: (id: string) =>
    api.delete<ApiEnvelope<{ id: string; archived?: boolean; deleted?: boolean; message?: string }>>(`/routes/${id}`),
  purgeOperationalData: (confirm: string) =>
    api.post<ApiEnvelope<{ purged: boolean; message: string }>>('/operational-data/purge', { confirm }),
  createRoute: (body: Record<string, unknown>) => api.post<ApiEnvelope<Route>>('/routes', body),
  createStop: (body: Record<string, unknown>) => api.post<ApiEnvelope<Stop>>('/stops', body),

  students: (q?: string) => api.get<ApiEnvelope<Student[]>>('/students', { params: q ? { q } : undefined }),
  createStudent: (body: Record<string, unknown>) => api.post<ApiEnvelope<Student>>('/students', body),
  updateStudent: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiEnvelope<Student>>(`/students/${id}`, body),
  learnersDashboard: () => api.get<ApiEnvelope<LearnersDashboard>>('/learners/dashboard'),
  learnersClasses: () =>
    api.get<
      ApiEnvelope<{ studentManagementLinked: boolean; classes: { id: string; label: string }[] }>
    >('/learners/classes'),
  learnersDirectory: (params?: {
    q?: string;
    className?: string;
    classId?: string;
    excludeEnrolled?: boolean;
    assignmentStatus?: 'all' | 'assigned' | 'unassigned';
    limit?: number;
  }) =>
    api.get<ApiEnvelope<LearnerDirectoryRow[]>>('/learners/directory', {
      params: {
        ...params,
        excludeEnrolled: params?.excludeEnrolled ? 'true' : undefined,
      },
    }),
  routeEnrollmentSummary: (routeId: string) =>
    api.get<ApiEnvelope<RouteEnrollmentSummary>>(`/routes/${routeId}/enrollment-summary`),
  routeLearnersDetail: (routeId: string) =>
    api.get<ApiEnvelope<RouteLearnersDetail>>(`/routes/${routeId}/learners-detail`),
  bulkAssignStudents: (body: Record<string, unknown>) =>
    api.post<ApiEnvelope<BulkAssignResult>>('/students/bulk-assign', body),
  unassignStudents: (assignmentIds: string[]) =>
    api.post<ApiEnvelope<{ unassigned: number }>>('/students/unassign', { assignmentIds }),
  notificationTemplates: () => api.get<ApiEnvelope<NotificationTemplate[]>>('/notification-templates'),
  updateNotificationTemplate: (id: string, body: Partial<NotificationTemplate>) =>
    api.patch<ApiEnvelope<NotificationTemplate>>(`/notification-templates/${id}`, body),

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

  attendanceRoutes: () => api.get<ApiEnvelope<AttendanceRouteOption[]>>('/attendance/routes'),
  attendanceEnsureTrip: (body: {
    routeId: string;
    direction: 'TO_SCHOOL' | 'TO_HOME';
    serviceDate?: string;
    busId?: string;
  }) => api.post<ApiEnvelope<Trip>>('/attendance/trips/ensure', body),
  attendanceStartJourney: (tripId: string) =>
    api.post<ApiEnvelope<BeginRouteJourneyResult>>(`/attendance/trips/${tripId}/start-journey`, {}),
  attendanceDashboard: (tripId: string, eventType: TransportEventType) =>
    api.get<ApiEnvelope<AttendanceDashboard>>('/attendance/dashboard', { params: { tripId, eventType } }),
  attendanceRecord: (body: {
    tripId: string;
    eventType: TransportEventType;
    studentCode: string;
    action: 'CONFIRM' | 'ABSENT';
    idempotencyKey?: string;
    clientRecordedAt?: string;
    note?: string;
  }) => api.post<ApiEnvelope<{ duplicate?: boolean; event: BoardingEvent }>>('/attendance/record', body),
  attendanceBulkConfirm: (body: {
    tripId: string;
    eventType: TransportEventType;
    studentCodes: string[];
    idempotencyPrefix?: string;
  }) => api.post<ApiEnvelope<{ studentCode: string; ok: boolean; error?: string }[]>>('/attendance/bulk-confirm', body),
  attendanceSync: (events: OfflineAttendanceEvent[]) =>
    api.post<ApiEnvelope<{ idempotencyKey: string; ok: boolean; error?: string; eventId?: string }[]>>(
      '/attendance/sync',
      { events }
    ),
  attendanceHistory: (params?: AttendanceHistoryQuery) =>
    api.get<ApiEnvelope<AttendanceHistoryResult>>('/attendance/history', { params }),
  attendanceEventDetail: (id: string) =>
    api.get<ApiEnvelope<AttendanceEventDetailFull>>(`/attendance/events/${id}`),

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

  parentPortalChangeRequests: (status?: string) =>
    api.get<ApiEnvelope<ParentPortalChangeRequest[]>>('/parent-portal/change-requests', {
      params: status ? { status } : undefined,
    }),
  respondParentPortalChangeRequest: (
    id: string,
    body: { status: 'APPROVED' | 'REJECTED'; schoolResponse?: string }
  ) => api.patch<ApiEnvelope<ParentPortalChangeRequest>>(`/parent-portal/change-requests/${id}`, body),
  parentPortalIssueReports: (status?: string) =>
    api.get<ApiEnvelope<ParentPortalIssueReport[]>>('/parent-portal/issue-reports', {
      params: status ? { status } : undefined,
    }),
  updateParentPortalIssueReport: (id: string, body: { status?: string; schoolNote?: string }) =>
    api.patch<ApiEnvelope<ParentPortalIssueReport>>(`/parent-portal/issue-reports/${id}`, body),
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
  defaultNotifyLanguage?: 'RW' | 'EN' | 'FR';
}

export type TransportEventType =
  | 'BOARDING_TO_SCHOOL'
  | 'ARRIVED_AT_SCHOOL'
  | 'BOARDING_TO_HOME'
  | 'DROPPED_OFF_HOME'
  | 'ROUTE_PICKUP_STARTED'
  | 'ROUTE_HOME_STARTED'
  | 'TRIP_DELAY'
  | 'TRIP_CANCELLED'
  | 'EXCEPTION';

export interface BeginRouteJourneyResult {
  trip: Trip & { journeyStarted?: boolean };
  alreadyStarted: boolean;
  startedAt: string;
  parentsNotified: number;
  journeyEventType?: TransportEventType;
}

export interface NotificationTemplate {
  id: string;
  eventType: TransportEventType;
  channel: string;
  language: 'RW' | 'EN' | 'FR';
  title: string;
  body: string;
  isActive: boolean;
}

export interface LearnersDashboard {
  academicYear: string;
  term: string;
  totalInSchool: number | null;
  assigned: number;
  unassigned: number | null;
  activeRoutesWithAssignments: number;
  studentManagementLinked: boolean;
}

export interface LearnerDirectoryRow {
  source: 'student_management' | 'transport';
  id: string;
  studentCode: string;
  fullName: string;
  className?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  alreadyEnrolled: boolean;
  currentRoute?: { id: string; name: string; code: string } | null;
  pickupStopName?: string | null;
  dropoffStopName?: string | null;
}

export interface RouteLearnersDetail {
  route: {
    id: string;
    name: string;
    code: string;
    status: string;
    serviceDirection?: string;
    startLabel?: string;
    endLabel?: string;
    departureTime?: string | null;
    arrivalTime?: string | null;
    pathGeoJson?: Route['pathGeoJson'];
    color?: string;
  };
  bus: {
    id: string;
    code: string;
    plateNumber: string;
    capacity: number;
    driverName?: string | null;
    attendantName?: string | null;
  } | null;
  assigned: number;
  capacity: number;
  capacityPercent: number | null;
  stopCount: number;
  destinationsWithLearners: number;
  stops: {
    stop: Stop;
    pickupCount: number;
    dropoffCount: number;
    learners: {
      id: string;
      studentCode: string;
      studentName: string;
      className?: string | null;
      pickupStopName?: string | null;
      dropoffStopName?: string | null;
    }[];
  }[];
  allLearners: {
    id: string;
    studentCode: string;
    studentName: string;
    className?: string | null;
    pickupStopName?: string | null;
    dropoffStopName?: string | null;
  }[];
}

export interface RouteEnrollmentSummary {
  routeId: string;
  routeName: string;
  assigned: number;
  capacity: number;
  remaining: number | null;
  stops: Stop[];
  bus?: { id: string; code: string } | null;
}

export interface BulkAssignResult {
  route: { id: string; name: string; code: string };
  bus: { id: string; code: string; capacity: number } | null;
  assigned: number;
  results: { studentCode: string; status: string; id: string }[];
}

export interface OrgAccessUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  roles: string[];
}

export interface Bus {
  id: string;
  code: string;
  plateNumber: string;
  busType: string;
  capacity: number;
  status: string;
  gpsDevice?: string | null;
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
  kind?: string | null;
  provinceId?: string | null;
  districtId?: string | null;
  sectorId?: string | null;
  cellId?: string | null;
  villageId?: string | null;
  placeName?: string | null;
  adminLabel?: string | null;
  address?: string | null;
  plannedTime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  etaMinutes?: number | null;
}

export interface RoutesDashboard {
  totalRoutes: number;
  activeRoutes: number;
  totalStops: number;
  enrolledLearners: number;
  assignedBuses: number;
}

export interface RoutesPageResult {
  items: RouteListRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RouteStopDraft {
  id?: string;
  name: string;
  sequence: number;
  kind?: string;
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  cellId?: string;
  villageId?: string;
  placeName?: string;
  adminLabel?: string;
  address?: string;
  plannedTime?: string;
  latitude?: number;
  longitude?: number;
  etaMinutes?: number;
}

export interface Route {
  id: string;
  name: string;
  code: string;
  direction: string;
  serviceDirection?: string;
  color?: string;
  lineWidth?: number;
  lineOpacity?: number;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  operatingDays?: number[] | null;
  pathGeoJson?: { type: 'LineString'; coordinates: [number, number][] } | null;
  schoolLat?: number | null;
  schoolLng?: number | null;
  schoolName?: string | null;
  primaryBusId?: string | null;
  status: string;
  notes?: string | null;
  stops?: Stop[];
  buses?: Bus[];
  _count?: { assignments: number; trips?: number };
}

export interface RouteListRow extends Route {
  primaryBus?: Bus | null;
  startLabel?: string;
  endLabel?: string;
  learnerCount?: number;
  stopCount?: number;
  tripCount?: number;
}

export interface RouteSupervisor {
  id: string;
  routeId: string;
  iamUserId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  roleTitle: string;
  createdAt?: string;
}

export interface RouteDetail extends RouteListRow {
  assignments?: {
    id: string;
    studentCode: string;
    studentName: string;
    className?: string | null;
    pickupStopId?: string | null;
    dropoffStopId?: string | null;
  }[];
}

export interface Student {
  id: string;
  studentCode: string;
  studentName: string;
  className?: string | null;
  liveState: string;
  enrollmentStatus?: string | null;
  serviceDirection?: string | null;
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
  eventType?: TransportEventType | string;
  attendanceMethod?: string;
  syncStatus?: string;
  outcome: string;
  scannedAt: string;
}

export interface AttendanceRouteOption {
  id: string;
  name: string;
  code: string;
  primaryBusId?: string | null;
  buses: { id: string; code: string; plateNumber: string }[];
  stopCount: number;
  supervisors: RouteSupervisor[];
  tripsToday: { id: string; direction: string; status: string; busCode: string }[];
}

export type AttendanceRosterStatus = 'NOT_RECORDED' | 'RECORDED' | 'ABSENT' | 'PENDING_SYNC';

export interface AttendanceRosterRow {
  passengerId: string;
  studentCode: string;
  studentName: string;
  className?: string | null;
  assignedStopId?: string | null;
  assignedStopName?: string | null;
  mark: string;
  status: AttendanceRosterStatus;
  eventId?: string | null;
  recordedAt?: string | null;
  attendanceMethod?: string | null;
}

export interface AttendanceDashboard {
  serviceDate: string;
  trip: Trip;
  eventType: TransportEventType;
  stats: {
    expected: number;
    confirmed: number;
    notRecorded: number;
    absent: number;
    pendingSync: number;
    exceptions: number;
    notifications: { total: number; delivered: number; failed: number; pending: number };
  };
  roster: AttendanceRosterRow[];
  devices: RfidDevice[];
  journeyStatus: string;
  journeyStartedAt?: string | null;
}

export interface AttendanceHistoryQuery {
  page?: number;
  limit?: number;
  q?: string;
  routeId?: string;
  tripId?: string;
  eventType?: TransportEventType;
  method?: 'MANUAL' | 'QR' | 'RFID';
  from?: string;
  to?: string;
  syncStatus?: string;
}

export interface AttendanceHistoryRow {
  id: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  eventType: string;
  type: string;
  outcome: string;
  attendanceMethod: string;
  syncStatus: string;
  scannedAt: string;
  stopName?: string | null;
  busCode?: string | null;
  routeName?: string | null;
  tripId?: string | null;
  tripDirection?: string | null;
  recordedByUserId?: string | null;
  deviceCode?: string | null;
  notifications: {
    id: string;
    status: string;
    channel: string;
    sentAt?: string | null;
    providerRef?: string | null;
  }[];
}

export interface AttendanceHistoryResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  rows: AttendanceHistoryRow[];
}

export interface AttendanceNotificationDetail {
  id: string;
  channel: string;
  status: string;
  language?: string | null;
  title: string;
  message: string;
  providerRef?: string | null;
  retryCount: number;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    relationship: string;
    notifySms: boolean;
    notifyPush: boolean;
    notifyEmail: boolean;
  } | null;
}

export interface AttendanceEventDetailFull {
  id: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  eventType: string;
  type: string;
  outcome: string;
  attendanceMethod: string;
  syncStatus: string;
  scannedAt: string;
  clientRecordedAt?: string | null;
  createdAt: string;
  cardNumber?: string | null;
  busCode?: string | null;
  routeName?: string | null;
  stopName?: string | null;
  driverName?: string | null;
  deviceCode?: string | null;
  recordedByUserId?: string | null;
  idempotencyKey?: string | null;
  trip?: {
    id: string;
    direction: string;
    status: string;
    tripDate: string;
    startedAt?: string | null;
    bus: Bus;
    route?: Route | null;
    driver?: Crew | null;
    attendant?: Crew | null;
  } | null;
  stop?: Stop | null;
  device?: RfidDevice | null;
  notifications: AttendanceNotificationDetail[];
}

/** @deprecated use AttendanceEventDetailFull */
export interface AttendanceEventDetail extends BoardingEvent {
  trip?: Trip | null;
  notifications?: ParentNotification[];
  device?: RfidDevice | null;
}

export interface OfflineAttendanceEvent {
  tripId: string;
  eventType: TransportEventType;
  studentCode: string;
  action: 'CONFIRM' | 'ABSENT';
  idempotencyKey: string;
  clientRecordedAt: string;
  method: 'MANUAL' | 'QR' | 'RFID';
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
  studentCode?: string | null;
  eventType?: TransportEventType | string | null;
  language?: string | null;
  channel: string;
  title: string;
  message: string;
  status: string;
  retryCount?: number;
  createdAt: string;
}

export interface DashboardData {
  organizationName: string;
  academicYear: string;
  term: string;
  kpis: Record<string, number>;
  liveTrips: Trip[];
  recentEvents: BoardingEvent[];
  charts?: {
    boardingTrend: { day: string; boarded: number }[];
    fleetBreakdown: { active: number; maintenance: number; inactive: number; other: number };
  };
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

export interface ParentPortalPerson {
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface ParentPortalStudent {
  firstName: string;
  lastName: string;
  shuleCode: string;
  className?: string | null;
}

export interface ParentPortalChangeRequest {
  id: string;
  requestType: string;
  reason: string;
  status: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  schoolResponse: string | null;
  createdAt: string;
  student?: ParentPortalStudent;
  parent?: ParentPortalPerson;
}

export interface ParentPortalIssueReport {
  id: string;
  issueType: string;
  details: string;
  status: string;
  schoolNote: string | null;
  createdAt: string;
  student?: ParentPortalStudent;
  parent?: ParentPortalPerson;
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

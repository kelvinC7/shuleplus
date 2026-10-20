export interface BookResource {
  id: string;
  isbn?: string;
  title: string;
  author?: string;
  publisher?: string;
  edition?: string;
  publicationYear?: number;
  bookCode?: string;
  language?: string;
  description?: string;
  coverUrl?: string;
  classLevel?: string;
  academicYear?: string;
  totalCopies: number;
  availableCopies: number;
  status: string;
  categoryId?: string;
  subjectId?: string;
  shelfLocationId?: string;
  category?: ResourceCategory;
  subject?: Subject;
  shelf?: ShelfLocation;
  copies?: BookCopy[];
  createdAt: string;
}

export interface BookCopy {
  id: string;
  barcode: string;
  qrCode?: string;
  libraryId: string;
  resourceId: string;
  status: string;
  condition?: string;
  purchasePrice?: number;
  source?: string;
  acquiredDate?: string;
  notes?: string;
  resource?: BookResource;
  createdAt: string;
}

export interface ResourceCategory {
  id: string;
  name: string;
  description?: string;
  type: string;
  resourceCount?: number;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  category?: string;
}

export interface ShelfLocation {
  id: string;
  building: string;
  room?: string;
  section: string;
  shelf: string;
  row?: string;
  position?: string;
  capacity?: number;
  floor?: number;
  name?: string;
}

export interface Loan {
  id: string;
  copyId: string;
  borrowerType: string;
  borrowerId: string;
  borrowerName: string;
  borrowerClass?: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  renewedCount: number;
  status: string;
  issuedBy?: string;
  notes?: string;
  copy?: { id: string; barcode: string; resource?: BookResource };
}

export interface Fine {
  id: string;
  loanId: string;
  borrowerType: string;
  borrowerId: string;
  amount: number | string;
  reason: string;
  status: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  loan?: Loan & { copy?: { resource?: { title?: string } } };
}

export interface Reservation {
  id: string;
  resourceId: string;
  copyId?: string;
  borrowerType: string;
  borrowerId: string;
  borrowerName: string;
  borrowerClass?: string;
  reservationDate: string;
  expiryDate?: string;
  position?: number;
  status: string;
  resource?: BookResource;
  copy?: BookCopy;
}

export interface LibraryVisit {
  id: string;
  borrowerType: string;
  borrowerId: string;
  borrowerName: string;
  borrowerClass?: string;
  checkIn: string;
  checkOut?: string;
  reason?: string;
}

export interface BookRequest {
  id: string;
  requesterType: string;
  requesterId: string;
  requesterName: string;
  title: string;
  author?: string;
  reason?: string;
  priority: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DigitalResource {
  id: string;
  title: string;
  description?: string;
  fileType: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  uploadedBy?: string;
  accessRoles: string[];
  subjectId?: string;
  classLevel?: string;
  downloadCount: number;
  createdAt: string;
}

export interface BookTransfer {
  id: string;
  copyId: string;
  fromOrgId: string;
  toOrgId: string;
  status: string;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface LibrarySettings {
  loanPeriodDays: number;
  maxBooksStudent: number;
  maxBooksTeacher: number;
  renewalsAllowed: boolean;
  maxRenewals: number;
  finesEnabled: boolean;
  finePerDay?: number;
  maxFine?: number;
  lostBookPolicy: string;
  qrEnabled: boolean;
  barcodeEnabled: boolean;
  dueReminderDays: number;
  overdueReminderDays: number;
}

export interface LibraryDashboard {
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  overdueBooks: number;
  lostBooks: number;
  damagedBooks: number;
  studentsWithLoans: number;
  teachersWithLoans: number;
  booksBorrowedToday: number;
  booksReturnedToday: number;
  pendingReservations: number;
  libraryVisitsToday: number;
  totalFines: number;
  recentLoans: any[];
  topBooks: any[];
  topReaders: any[];
}

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardData {
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  overdueBooks: number;
  lostBooks: number;
  damagedBooks: number;
  studentsWithLoans: number;
  teachersWithLoans: number;
  booksBorrowedToday: number;
  booksReturnedToday: number;
  pendingReservations: number;
  libraryVisitsToday: number;
  totalFines: number;
  recentLoans: any[];
  topBooks: any[];
  topReaders: any[];
}

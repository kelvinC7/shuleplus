export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
}

export type WebsiteStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ApplicantStatus = 'NEW' | 'REVIEWED' | 'CONTACTED' | 'ACCEPTED' | 'REJECTED';

import type { GalleryItem } from '@/lib/gallery';
import type { SchoolLeader } from '@/lib/leaders';

export interface WebsitePage {
  id: string;
  websiteId: string;
  slug: string;
  title: string;
  content: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolWebsite {
  id: string;
  organizationId: string;
  organizationName: string;
  slug: string;
  template: string;
  templateName: string | null;
  title: string;
  tagline: string | null;
  heroTitle: string | null;
  heroText: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  schoolCategory: string | null;
  schoolProgram: string | null;
  educationLevels: string[] | null;
  leaders: SchoolLeader[] | null;
  websiteUrl: string | null;
  about: string | null;
  vision: string | null;
  mission: string | null;
  admissionInfo: string | null;
  admissionsEnabled: boolean;
  admissionForm: Array<{
    id: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
  }> | null;
  customCss: string | null;
  stats: Array<{ label: string; value: string }> | null;
  programs: Array<{ name: string; description: string }> | null;
  news: Array<{ title: string; date: string; excerpt: string }> | null;
  gallery: GalleryItem[] | string[] | null;
  status: WebsiteStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publicUrl?: string;
  html?: string | null;
  pages?: WebsitePage[];
}

export interface Applicant {
  id: string;
  websiteId: string;
  fullName: string;
  email: string | null;
  phone: string;
  gradeAppliedFor: string | null;
  birthDate: string | null;
  parentName: string | null;
  previousSchool: string | null;
  message: string | null;
  formData: Record<string, unknown> | null;
  status: ApplicantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  websiteId: string;
  websiteStatus: WebsiteStatus;
  websiteTitle: string;
  slug: string;
  publicUrl: string;
  published: boolean;
  publishedAt: string | null;
  applicantCount: number;
  newCount: number;
  reviewedCount: number;
  contactedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pageCount: number;
  status: string;
}

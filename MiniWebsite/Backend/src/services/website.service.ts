import fs from 'node:fs';
import path from 'node:path';
import { TenantStatus, WebsiteStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { sitesDir } from '../config/paths';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { fetchIamSchoolProfile, fetchIamAcademicSettings, type IamSchoolProfile } from '../clients/iam.client';
import { resolveExternalAssetUrl, resolveAnyAssetUrl } from '../utils/asset-url';
import { normalizeAdmissionForm } from '../constants/admission-form';
import { normalizeApplicantFormData } from '../utils/applicant-upload';
import { fetchBabyeyiCircularList, fetchBabyeyiCircularOptions, fetchBabyeyiPrintHtml } from '../clients/babyeyi.client';
import { renderSiteDocument, type TemplatePage } from './template.service';
import { formatLocationAddress } from '../utils/location';
import { normalizeLeaders, type SchoolLeader } from '../utils/leaders';

function siteDefaultsFromProfile(
  profile: IamSchoolProfile | null,
  organizationId: string,
  organizationName: string
) {
  const name = profile?.schoolName?.trim() || organizationName || 'My School';
  const province = profile?.province?.trim() || null;
  const district = profile?.district?.trim() || null;
  const sector = profile?.sector?.trim() || null;
  const cell = profile?.cell?.trim() || null;
  const village = profile?.village?.trim() || null;
  const address =
    profile?.address?.trim() ||
    formatLocationAddress({
      village,
      cell,
      sector,
      district,
      province,
      country: profile?.country?.trim() || 'Rwanda',
    }) ||
    null;

  return {
    organizationId,
    organizationName: name,
    slug: slugify(name),
    title: name,
    logoUrl: resolveExternalAssetUrl(profile?.logoUrl),
    email: profile?.email?.trim() || null,
    phone: profile?.phone?.trim() || null,
    address,
    province,
    district,
    sector,
    cell,
    village,
    schoolCategory: profile?.schoolCategory?.trim() || null,
    schoolProgram: profile?.schoolProgram?.trim() || null,
    educationLevels: Array.isArray(profile?.educationLevels) ? profile!.educationLevels : [],
    leaders: normalizeLeaders(
      (profile?.leaders ?? []).map((leader, index) => ({
        id: `leader-${index}`,
        name: leader.name,
        role: leader.role,
        phone: leader.phone ?? '',
        email: leader.email ?? '',
      }))
    ),
    websiteUrl: profile?.website?.trim() || null,
    about: profile?.schoolMotto?.trim() || null,
    primaryColor: '#001121',
    secondaryColor: '#f59e0b',
    status: WebsiteStatus.DRAFT,
    template: 'vschool',
    templateName: 'vSchool Classic',
  };
}

export function slugify(value: string): string {
  const slug = String(value)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new AppError(400, 'Invalid website address (slug)');
  if (slug.length > 48) throw new AppError(400, 'Website address must be 48 characters or fewer');
  return slug;
}

function siteDir(slug: string): string {
  return path.join(sitesDir, slug);
}

function writeSiteFile(slug: string, html: string): void {
  const dir = siteDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}

function readSiteFile(slug: string): string | null {
  try {
    return fs.readFileSync(path.join(siteDir(slug), 'index.html'), 'utf8');
  } catch {
    return null;
  }
}

function removeSiteDir(slug: string): void {
  fs.rmSync(siteDir(slug), { recursive: true, force: true });
}

export function publicSiteUrl(slug: string): string {
  return `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/${slug}`;
}

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === '';
}

function buildIamSyncPatch(
  site: {
    title: string;
    tagline: string | null;
    heroTitle: string | null;
    heroText: string | null;
    logoUrl: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    province: string | null;
    district: string | null;
    sector: string | null;
    cell: string | null;
    village: string | null;
    about: string | null;
    schoolCategory: string | null;
    schoolProgram: string | null;
    educationLevels: unknown;
    leaders: unknown;
    websiteUrl: string | null;
  },
  profile: IamSchoolProfile | null,
  options: { onlyEmpty?: boolean } = { onlyEmpty: true }
): Record<string, unknown> {
  if (!profile) return {};

  const patch: Record<string, unknown> = {};
  const onlyEmpty = options.onlyEmpty !== false;

  const setIf = (
    key:
      | 'title'
      | 'tagline'
      | 'heroText'
      | 'email'
      | 'phone'
      | 'province'
      | 'district'
      | 'sector'
      | 'cell'
      | 'village'
      | 'about'
      | 'schoolCategory'
      | 'schoolProgram'
      | 'websiteUrl',
    value: string | null | undefined
  ) => {
    const next = value?.trim();
    if (!next) return;
    const current = site[key];
    if (!onlyEmpty || isBlank(current)) patch[key] = next;
  };

  setIf('title', profile.schoolName);
  setIf('email', profile.email);
  setIf('phone', profile.phone);
  setIf('province', profile.province);
  setIf('district', profile.district);
  setIf('sector', profile.sector);
  setIf('cell', profile.cell);
  setIf('village', profile.village);
  setIf('about', profile.schoolMotto || profile.description);
  setIf('tagline', profile.schoolMotto);
  setIf('heroText', profile.description || profile.schoolMotto);
  setIf('schoolCategory', profile.schoolCategory);
  setIf('schoolProgram', profile.schoolProgram);
  setIf('websiteUrl', profile.website);

  const levels = Array.isArray(profile.educationLevels)
    ? profile.educationLevels.filter((level) => String(level).trim())
    : [];
  if (levels.length && (onlyEmpty || !Array.isArray(site.educationLevels) || site.educationLevels.length === 0)) {
    patch.educationLevels = levels;
  }

  const leaders = normalizeLeaders(
    (profile.leaders ?? []).map((leader, index) => ({
      id: `leader-${index}`,
      name: leader.name,
      role: leader.role,
      phone: leader.phone ?? '',
      email: leader.email ?? '',
    }))
  );
  if (leaders.length && (onlyEmpty || normalizeLeaders(site.leaders).length === 0)) {
    patch.leaders = leaders;
  }

  const formattedAddress = formatLocationAddress({
    village: profile.village,
    cell: profile.cell,
    sector: profile.sector,
    district: profile.district,
    province: profile.province,
    address: profile.address,
    country: profile.country || 'Rwanda',
  });

  if (formattedAddress && (!onlyEmpty || isBlank(site.address))) {
    patch.address = profile.address?.trim() || formattedAddress;
  }

  const logoUrl = resolveExternalAssetUrl(profile.logoUrl);
  if (logoUrl && (!onlyEmpty || isBlank(site.logoUrl))) {
    patch.logoUrl = logoUrl;
  }

  return patch;
}

export class WebsiteService {
  /** Lazy provisioning: creates tenant + draft website on first access. */
  async getOrCreateSite(organizationId: string) {
    const tenant = await prisma.tenant.upsert({
      where: { organizationId },
      update: { status: TenantStatus.ACTIVE },
      create: {
        organizationId,
        organizationName: organizationId,
        status: TenantStatus.ACTIVE,
      },
    });

    let site = await prisma.schoolWebsite.findUnique({
      where: { organizationId },
      include: { pages: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!site) {
      const profile = await fetchIamSchoolProfile(organizationId);
      site = await prisma.schoolWebsite.create({
        data: siteDefaultsFromProfile(profile, organizationId, tenant.organizationName),
        include: { pages: { orderBy: { sortOrder: 'asc' } } },
      });
    } else if (!site.logoUrl) {
      const profile = await fetchIamSchoolProfile(organizationId);
      const logoUrl = resolveExternalAssetUrl(profile?.logoUrl);
      if (logoUrl) {
        site = await prisma.schoolWebsite.update({
          where: { organizationId },
          data: { logoUrl },
          include: { pages: { orderBy: { sortOrder: 'asc' } } },
        });
      }
    }

    return site;
  }

  /** Pull school logo (and relative URL fixes) from IAM before publishing. */
  private async ensureBrandingFromIam<T extends { id: string; organizationId: string; logoUrl: string | null }>(
    site: T
  ): Promise<T> {
    const profile = await fetchIamSchoolProfile(site.organizationId);
    const iamLogo = resolveExternalAssetUrl(profile?.logoUrl);
    const resolvedCurrent = resolveAnyAssetUrl(site.logoUrl);

    const data: { logoUrl?: string } = {};
    if (iamLogo && !site.logoUrl) data.logoUrl = iamLogo;
    else if (resolvedCurrent && resolvedCurrent !== site.logoUrl) data.logoUrl = resolvedCurrent;

    if (!Object.keys(data).length) return site;

    const updated = await prisma.schoolWebsite.update({
      where: { id: site.id },
      data,
    });
    return { ...site, logoUrl: updated.logoUrl };
  }

  async getSite(organizationId: string) {
    const site = await this.getOrCreateSite(organizationId);
    return {
      ...site,
      publicUrl: publicSiteUrl(site.slug),
    };
  }

  async updateSite(
    organizationId: string,
    data: Partial<{
      title: string;
      tagline: string;
      heroTitle: string;
      heroText: string;
      heroImageUrl: string;
      logoUrl: string;
      primaryColor: string;
      secondaryColor: string;
      email: string;
      phone: string;
      address: string;
      province: string;
      district: string;
      sector: string;
      cell: string;
      village: string;
      schoolCategory: string;
      schoolProgram: string;
      educationLevels: string[];
      leaders: SchoolLeader[];
      websiteUrl: string;
      about: string;
      vision: string;
      mission: string;
      admissionInfo: string;
      admissionsEnabled: boolean;
      admissionForm: unknown;
      customCss: string;
      stats: Array<{ label: string; value: string }>;
      programs: Array<{ name: string; description: string }>;
      news: Array<{ title: string; date: string; excerpt: string }>;
      gallery: unknown;
      template: string;
      templateName: string;
      status: string;
    }>
  ) {
    const site = await this.getOrCreateSite(organizationId);

    const allowed: Record<string, unknown> = {};
    for (const key of [
      'title',
      'tagline',
      'heroTitle',
      'heroText',
      'heroImageUrl',
      'logoUrl',
      'primaryColor',
      'secondaryColor',
      'email',
      'phone',
      'address',
      'province',
      'district',
      'sector',
      'cell',
      'village',
      'schoolCategory',
      'schoolProgram',
      'educationLevels',
      'leaders',
      'websiteUrl',
      'about',
      'vision',
      'mission',
      'admissionInfo',
      'admissionsEnabled',
      'admissionForm',
      'customCss',
      'stats',
      'programs',
      'news',
      'gallery',
      'template',
      'templateName',
    ]) {
      if (data[key as keyof typeof data] !== undefined) allowed[key] = data[key as keyof typeof data];
    }
    if (data.status) {
      const status = String(data.status).toUpperCase();
      if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
        throw new AppError(400, 'Invalid website status');
      }
      allowed.status = status;
      if (status === 'PUBLISHED') allowed.publishedAt = new Date();
    }

    if (data.title !== undefined && !String(data.title).trim()) {
      throw new AppError(400, 'School name is required');
    }
    if (allowed.title !== undefined) allowed.title = String(allowed.title).trim();

    const updated = await prisma.schoolWebsite.update({
      where: { id: site.id },
      data: allowed,
      include: { pages: { orderBy: { sortOrder: 'asc' } } },
    });

    if (updated.status === WebsiteStatus.PUBLISHED) {
      await this.regenerate(site.id);
    }

    return { ...updated, publicUrl: publicSiteUrl(updated.slug) };
  }

  async updateSlug(organizationId: string, slug: string) {
    const site = await this.getOrCreateSite(organizationId);
    const next = slugify(slug);

    if (next === site.slug) return this.getSite(organizationId);

    const taken = await prisma.schoolWebsite.findUnique({ where: { slug: next } });
    if (taken) throw new AppError(409, 'That website address is already taken');

    const oldSlug = site.slug;
    const updated = await prisma.schoolWebsite.update({
      where: { id: site.id },
      data: { slug: next },
      include: { pages: { orderBy: { sortOrder: 'asc' } } },
    });

    // Move the generated file so the new URL serves instantly.
    const oldFile = readSiteFile(oldSlug);
    if (oldFile) {
      removeSiteDir(oldSlug);
      writeSiteFile(next, oldFile);
    }

    if (updated.status === WebsiteStatus.PUBLISHED) {
      await this.regenerate(site.id);
    }

    return { ...updated, publicUrl: publicSiteUrl(updated.slug) };
  }

  /** Regenerates the HTML snapshot from current site data and writes the file. */
  async regenerate(websiteId: string) {
    let site = await prisma.schoolWebsite.findUnique({
      where: { id: websiteId },
      include: { pages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!site) throw new AppError(404, 'Website not found');

    site = await this.ensureBrandingFromIam(site);

    const html = renderSiteDocument(site, (site.pages ?? []) as TemplatePage[]);
    writeSiteFile(site.slug, html);
    await prisma.schoolWebsite.update({ where: { id: site.id }, data: { html } });
    return { html, publicUrl: publicSiteUrl(site.slug) };
  }

  /** Renders HTML from draft fields without persisting — used for live editor preview. */
  async preview(
    organizationId: string,
    draft: Partial<{
      slug: string;
      title: string;
      tagline: string;
      heroTitle: string;
      heroText: string;
      heroImageUrl: string;
      logoUrl: string;
      primaryColor: string;
      secondaryColor: string;
      email: string;
      phone: string;
      address: string;
      province: string;
      district: string;
      sector: string;
      cell: string;
      village: string;
      schoolCategory: string;
      schoolProgram: string;
      educationLevels: string[];
      leaders: SchoolLeader[];
      websiteUrl: string;
      about: string;
      vision: string;
      mission: string;
      admissionInfo: string;
      admissionsEnabled: boolean;
      admissionForm: unknown;
      customCss: string;
      stats: Array<{ label: string; value: string }>;
      programs: Array<{ name: string; description: string }>;
      news: Array<{ title: string; date: string; excerpt: string }>;
      gallery: unknown;
    }>
  ) {
    const site = await this.getOrCreateSite(organizationId);
    const merged = { ...site, ...draft };
    const html = renderSiteDocument(merged, (site.pages ?? []) as TemplatePage[]);
    return { html, publicUrl: publicSiteUrl(merged.slug) };
  }

  async publish(organizationId: string) {
    let site = await this.getOrCreateSite(organizationId);
    const isFirstPublish = !site.publishedAt;

    if (isFirstPublish) {
      const profile = await fetchIamSchoolProfile(organizationId);
      const patch = buildIamSyncPatch(site, profile, { onlyEmpty: true });
      if (Object.keys(patch).length) {
        site = await prisma.schoolWebsite.update({
          where: { id: site.id },
          data: patch,
          include: { pages: { orderBy: { sortOrder: 'asc' } } },
        });
      }
    }

    site = await this.ensureBrandingFromIam(site);
    const { html } = await this.regenerate(site.id);
    const updated = await prisma.schoolWebsite.update({
      where: { id: site.id },
      data: { status: WebsiteStatus.PUBLISHED, publishedAt: site.publishedAt ?? new Date() },
      include: { pages: { orderBy: { sortOrder: 'asc' } } },
    });
    return { ...updated, html, publicUrl: publicSiteUrl(updated.slug) };
  }

  async unpublish(organizationId: string) {
    const site = await this.getOrCreateSite(organizationId);
    const updated = await prisma.schoolWebsite.update({
      where: { id: site.id },
      data: { status: WebsiteStatus.DRAFT },
      include: { pages: { orderBy: { sortOrder: 'asc' } } },
    });
    return { ...updated, publicUrl: publicSiteUrl(updated.slug) };
  }

  // ── Pages ──────────────────────────────────────────────────────────────────
  async listPages(organizationId: string) {
    const site = await this.getOrCreateSite(organizationId);
    return prisma.websitePage.findMany({
      where: { websiteId: site.id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createPage(
    organizationId: string,
    data: { slug: string; title: string; content: string; sortOrder?: number }
  ) {
    const site = await this.getOrCreateSite(organizationId);
    const pageSlug = slugify(data.slug || data.title);
    if (['home', 'about', 'programs', 'admissions', 'news', 'gallery', 'contact'].includes(pageSlug)) {
      throw new AppError(400, `'${pageSlug}' is a reserved section name`);
    }
    const existing = await prisma.websitePage.findFirst({
      where: { websiteId: site.id, slug: pageSlug },
    });
    if (existing) throw new AppError(409, 'A page with that address already exists');

    const created = await prisma.websitePage.create({
      data: {
        websiteId: site.id,
        slug: pageSlug,
        title: String(data.title || pageSlug),
        content: String(data.content ?? ''),
        sortOrder: data.sortOrder ?? 0,
      },
    });

    if (site.status === WebsiteStatus.PUBLISHED) await this.regenerate(site.id);
    return created;
  }

  async updatePage(
    organizationId: string,
    pageId: string,
    data: { slug?: string; title?: string; content?: string; sortOrder?: number }
  ) {
    const site = await this.getOrCreateSite(organizationId);
    const page = await prisma.websitePage.findFirst({
      where: { id: pageId, websiteId: site.id },
    });
    if (!page) throw new AppError(404, 'Page not found');

    const allowed: Record<string, unknown> = {};
    if (data.slug !== undefined) {
      const next = slugify(data.slug);
      const taken = await prisma.websitePage.findFirst({
        where: { websiteId: site.id, slug: next, NOT: { id: pageId } },
      });
      if (taken) throw new AppError(409, 'A page with that address already exists');
      allowed.slug = next;
    }
    if (data.title !== undefined) allowed.title = String(data.title || page.slug);
    if (data.content !== undefined) allowed.content = String(data.content);
    if (data.sortOrder !== undefined) allowed.sortOrder = data.sortOrder;

    const updated = await prisma.websitePage.update({ where: { id: pageId }, data: allowed });

    if (site.status === WebsiteStatus.PUBLISHED) await this.regenerate(site.id);
    return updated;
  }

  async deletePage(organizationId: string, pageId: string) {
    const site = await this.getOrCreateSite(organizationId);
    const page = await prisma.websitePage.findFirst({
      where: { id: pageId, websiteId: site.id },
    });
    if (!page) throw new AppError(404, 'Page not found');
    await prisma.websitePage.delete({ where: { id: pageId } });
    if (site.status === WebsiteStatus.PUBLISHED) await this.regenerate(site.id);
    return { success: true };
  }

  // ── Applicants ─────────────────────────────────────────────────────────────
  async listApplicants(organizationId: string, status?: string) {
    const site = await this.getOrCreateSite(organizationId);
    return prisma.applicant.findMany({
      where: { websiteId: site.id, ...(status ? { status: status.toUpperCase() as never } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateApplicantStatus(organizationId: string, applicantId: string, status: string) {
    const site = await this.getOrCreateSite(organizationId);
    const next = String(status).toUpperCase();
    if (!['NEW', 'REVIEWED', 'CONTACTED', 'ACCEPTED', 'REJECTED'].includes(next)) {
      throw new AppError(400, 'Invalid applicant status');
    }
    const applicant = await prisma.applicant.findFirst({
      where: { id: applicantId, websiteId: site.id },
    });
    if (!applicant) throw new AppError(404, 'Applicant not found');
    return prisma.applicant.update({
      where: { id: applicantId },
      data: { status: next as never },
    });
  }

  // ── Public ─────────────────────────────────────────────────────────────────
  /** Public directory: all schools with a published website, no auth required. */
  async listPublicSites() {
    const sites = await prisma.schoolWebsite.findMany({
      where: { status: WebsiteStatus.PUBLISHED },
      include: { tenant: true },
      orderBy: { organizationName: 'asc' },
    });
    return sites.map((site) => this.toPublicSiteSummary(site));
  }

  /** Landing portal: resolve a published mini-website for the student's school. */
  async lookupPublicSiteByOrganization(organizationId: string) {
    const id = organizationId.trim();
    if (!id) throw new AppError(400, 'organizationId is required');

    const site = await prisma.schoolWebsite.findFirst({
      where: {
        status: WebsiteStatus.PUBLISHED,
        OR: [{ organizationId: id }, { tenant: { organizationCode: id } }],
      },
      include: { tenant: true },
    });

    if (!site) return null;
    return this.toPublicSiteSummary(site);
  }

  private toPublicSiteSummary(site: {
    id: string;
    organizationId: string;
    slug: string;
    title: string;
    organizationName: string;
    tagline: string | null;
    logoUrl: string | null;
    heroImageUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    about: string | null;
    programs: unknown;
    stats: unknown;
    publishedAt: Date | null;
    tenant?: { district?: string | null } | null;
  }) {
    return {
      id: site.id,
      organizationId: site.organizationId,
      slug: site.slug,
      title: site.title,
      organizationName: site.organizationName,
      tagline: site.tagline,
      district: site.tenant?.district ?? null,
      logoUrl: site.logoUrl,
      heroImageUrl: site.heroImageUrl,
      primaryColor: site.primaryColor,
      secondaryColor: site.secondaryColor,
      email: site.email,
      phone: site.phone,
      address: site.address,
      about: site.about,
      programs: site.programs,
      stats: site.stats,
      publishedAt: site.publishedAt,
      publicUrl: publicSiteUrl(site.slug),
    };
  }

  async findPublicBySlug(slug: string) {
    return prisma.schoolWebsite.findUnique({
      where: { slug },
      include: { pages: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  /** Reads the pre-generated file so the site loads without hitting Prisma per request. */
  getPublicHtml(slug: string): string | null {
    return readSiteFile(slug);
  }

  async createPublicApplicant(
    slug: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      gradeAppliedFor?: string;
      birthDate?: string;
      parentName?: string;
      previousSchool?: string;
      message?: string;
      formData?: Record<string, unknown>;
    }
  ) {
    const site = await prisma.schoolWebsite.findUnique({ where: { slug } });
    if (!site) throw new AppError(404, 'School website not found');
    if (site.status !== WebsiteStatus.PUBLISHED) throw new AppError(404, 'School website not found');
    if (!site.admissionsEnabled) throw new AppError(400, 'Admissions are not open for this school');

    const normalizedForm = data.formData ? normalizeApplicantFormData(data.formData) : {};
    const fullName = String(normalizedForm.fullName ?? data.fullName ?? '').trim();
    const phone = String(normalizedForm.phone ?? data.phone ?? '').trim();
    const email = String(normalizedForm.email ?? data.email ?? '').trim() || null;

    if (!fullName || !phone) {
      throw new AppError(400, 'Full name and phone number are required');
    }

    const fields = normalizeAdmissionForm(site.admissionForm);
    for (const field of fields) {
      if (!field.required) continue;
      const val = normalizedForm[field.id];
      if (val == null || String(val).trim() === '') {
        throw new AppError(400, `${field.label} is required`);
      }
    }

    return prisma.applicant.create({
      data: {
        websiteId: site.id,
        fullName,
        email,
        phone,
        gradeAppliedFor: String(normalizedForm.gradeAppliedFor ?? data.gradeAppliedFor ?? '').trim() || null,
        birthDate: String(normalizedForm.birthDate ?? data.birthDate ?? '').trim() || null,
        parentName: String(normalizedForm.parentName ?? data.parentName ?? '').trim() || null,
        previousSchool: String(normalizedForm.previousSchool ?? data.previousSchool ?? '').trim() || null,
        message: String(normalizedForm.message ?? data.message ?? '').trim() || null,
        formData: Object.keys(normalizedForm).length
          ? (normalizedForm as Prisma.InputJsonValue)
          : undefined,
        status: 'NEW',
      },
    });
  }

  async getPublicCircularOptions(slug: string) {
    const site = await prisma.schoolWebsite.findUnique({ where: { slug } });
    if (!site || site.status !== WebsiteStatus.PUBLISHED) throw new AppError(404, 'School website not found');
    const [babyeyi, academic] = await Promise.all([
      fetchBabyeyiCircularOptions(site.organizationId),
      fetchIamAcademicSettings(site.organizationId),
    ]);
    const years = [...new Set([...(academic?.academicYears ?? []), ...(babyeyi.academicYears ?? [])])].sort();
    const terms = [...new Set([...(academic?.terms ?? []), ...(babyeyi.terms ?? [])])];
    return {
      academicYears: years.length ? years : babyeyi.academicYears,
      terms: terms.length ? terms : babyeyi.terms,
      count: babyeyi.count,
      currentAcademicYear: academic?.currentAcademicYear ?? years[years.length - 1] ?? null,
      currentTerm: academic?.currentTerm ?? terms[0] ?? null,
    };
  }

  async listPublicCirculars(slug: string, filters?: { academicYear?: string; term?: string }) {
    const site = await prisma.schoolWebsite.findUnique({ where: { slug } });
    if (!site || site.status !== WebsiteStatus.PUBLISHED) throw new AppError(404, 'School website not found');
    return fetchBabyeyiCircularList(site.organizationId, filters);
  }

  async getPublicCircularPrint(slug: string, circularId: string, opts?: { lang?: string; autoprint?: boolean }) {
    const site = await prisma.schoolWebsite.findUnique({ where: { slug } });
    if (!site || site.status !== WebsiteStatus.PUBLISHED) throw new AppError(404, 'School website not found');
    const html = await fetchBabyeyiPrintHtml(site.organizationId, circularId, opts);
    if (!html) throw new AppError(404, 'Circular not found');
    return html;
  }
}

export const websiteService = new WebsiteService();

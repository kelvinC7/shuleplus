import type { Circular } from '@/types';
import { buildOfficialDocHtml, openOfficialPrintHtml } from '@/lib/official-doc/build-official-doc-html';
import { resolveAssetUrl, type DocLang } from '@/lib/official-doc/tokens';
import type { OfficialDocBrand } from '@/lib/official-doc/types';
import { fetchSchoolInfo, recordCircularDownload } from '@/services/babyeyi-api';

/** Legacy entry — opens printable official HTML (prefer OfficialDocModal for full View & Print). */
export async function exportCircularPdf(circular: Circular, schoolName?: string) {
  try {
    await recordCircularDownload(circular.id);
  } catch {
    /* non-blocking */
  }

  let brand: OfficialDocBrand = {
    schoolName: schoolName || 'School',
    district: circular.district,
    sector: circular.sector,
    province: circular.province,
    qrUrl: resolveAssetUrl(circular.qrCodePath),
  };

  try {
    const school = await fetchSchoolInfo();
    brand = {
      schoolName: schoolName || school.profile.schoolName || 'School',
      district: circular.district || school.profile.district,
      sector: circular.sector || school.profile.sector,
      province: circular.province || school.profile.province,
      principalName: school.profile.principalName,
      logoUrl: resolveAssetUrl(school.branding?.logoUrl || school.profile.logoPath),
      signatureUrl: resolveAssetUrl(school.branding?.signatureUrl || school.profile.signaturePath),
      stampUrl: resolveAssetUrl(school.branding?.stampUrl || school.profile.stampPath),
      qrUrl: resolveAssetUrl(circular.qrCodePath),
    };
  } catch {
    /* use circular fallbacks */
  }

  const lang = (circular.language as DocLang) || 'en';
  const html = buildOfficialDocHtml({ circular, brand, lang, autoprint: false });
  openOfficialPrintHtml(html);
}

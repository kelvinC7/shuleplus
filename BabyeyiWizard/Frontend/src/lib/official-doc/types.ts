export interface OfficialDocBrand {
  schoolName: string;
  district?: string;
  sector?: string;
  province?: string;
  principalName?: string;
  logoUrl?: string | null;
  otherLogoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  qrUrl?: string | null;
}

/** A4 @ ~96dpi ≈ 210mm */
export const BABYEYI_PDF_WIDTH_PX = 794;
export const BABYEYI_PDF_A4_HEIGHT_PX = Math.round((794 * 297) / 210);

export const DOC = {
  navy: '#1e3a5f',
  body: '#1e293b',
  muted: '#64748b',
  hairline: '#e2e8f0',
  amber: '#FEBF10',
  white: '#ffffff',
  font: "var(--font-montserrat), 'Montserrat', system-ui, -apple-system, sans-serif",
} as const;

/** Google Fonts link for print/PDF iframes (Next font variable is unavailable off-document). */
export const MONTSERRAT_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap';

import { procurementApi } from '@/services/procurement-api';
import type { DocumentVerification, VerificationDocumentType } from '@/types';

/**
 * Creates (or reuses) the persistent verification identity for a document and
 * returns the QR image to embed in its PDF. Failures never block PDF
 * generation; the caller simply omits the footer when `null` is returned.
 */
export async function ensureDocumentVerification(
  documentType: VerificationDocumentType,
  documentId?: string,
  options?: {
    reference?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<DocumentVerification | null> {
  try {
    return await procurementApi.documentVerifications.ensure({
      documentType,
      documentId,
      reference: options?.reference,
      metadata: options?.metadata,
    });
  } catch (error) {
    console.error('[document-verification] unable to create verification', error);
    return null;
  }
}

import type { UniformStudent } from "@/types";

export interface ReceiptData {
  receiptNumber: string;
  student: Pick<
    UniformStudent,
    | "id"
    | "firstName"
    | "lastName"
    | "className"
    | "academicStudentId"
    | "phone"
    | "gender"
  > & {
    profileMeta?: Record<string, unknown> | null;
  };
  items: {
    name: string;
    size?: string | null;
    color?: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  issuedAt: string;
  issuedBy?: string;
  notes?: string;
  schoolName?: string;
  paymentMethod?: string;
  schoolLogoUrl?: string;
  schoolEmail?: string;
  schoolPhone?: string;
  schoolPoBox?: string;
  schoolAddress?: string;
  signatureUrl?: string;
  stampUrl?: string;
}

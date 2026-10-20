'use client';

import dynamic from 'next/dynamic';

export const GetBabyeyiModal = dynamic(
  () => import('./get-babyeyi-modal').then((m) => m.GetBabyeyiModal),
  { ssr: false },
);

export const PayFeesModal = dynamic(
  () => import('./pay-fees-modal').then((m) => m.PayFeesModal),
  { ssr: false },
);

export const RequestLoanModal = dynamic(
  () => import('./request-loan-modal').then((m) => m.RequestLoanModal),
  { ssr: false },
);

export const SchoolInfoModal = dynamic(
  () => import('./school-info-modal').then((m) => m.SchoolInfoModal),
  { ssr: false },
);

export const AdmissionModal = dynamic(
  () => import('./admission-modal').then((m) => m.AdmissionModal),
  { ssr: false },
);

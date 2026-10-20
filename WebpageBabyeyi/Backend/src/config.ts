import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT ?? '3099', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  STUDENT_MANAGEMENT_URL: process.env.STUDENT_MANAGEMENT_URL ?? 'http://localhost:3052/api',
  BABYEYI_WIZARD_URL: process.env.BABYEYI_WIZARD_URL ?? 'http://localhost:3012/api',
  SCHOOL_FEES_URL: process.env.SCHOOL_FEES_URL ?? 'http://localhost:3014/api',
  AUTH_URL: process.env.AUTH_URL ?? 'http://localhost:3001/api/v1',
  MINIWEBSITE_API_URL: process.env.MINIWEBSITE_API_URL ?? 'http://localhost:4026/api',
};

/** Mirrors Prisma DeveloperAccessType — safe for route registration without generated client. */
export const DeveloperAccessLevels = {
  DEVELOPER: 'DEVELOPER',
  TECHNICAL_ADMIN: 'TECHNICAL_ADMIN',
  API_VIEWER: 'API_VIEWER',
} as const;

export type DeveloperAccessLevel = (typeof DeveloperAccessLevels)[keyof typeof DeveloperAccessLevels];

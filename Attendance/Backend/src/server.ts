import { env, logAttendanceIntegrations } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./config/database";
import { startAutoAbsenceScheduler } from "./jobs/auto-absence.job";

async function main() {
  const app = createApp();
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`RFID Attendance API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    logAttendanceIntegrations();
    startAutoAbsenceScheduler();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

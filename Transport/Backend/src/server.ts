import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { ensureDatabase, ensureSchema } from "./config/ensure-database";

async function main() {
  await ensureDatabase();
  const app = createApp();
  await prisma.$connect();
  await ensureSchema(prisma);
  app.listen(env.PORT, () => {
    console.log(`Smart Transport API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

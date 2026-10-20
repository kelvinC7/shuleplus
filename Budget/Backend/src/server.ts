import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";

async function main() {
  const app = createApp();
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`School Budget API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { startMqttIngestion, stopMqttIngestion } from './services/mqtt-ingestion.service';

const app = createApp();

async function start() {
  await prisma.$connect();
  startMqttIngestion();
  app.listen(env.PORT, () => {
    console.log(`[Device Module] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    if (env.MQTT_BROKER_URL) {
      console.log(`[Device Module] MQTT ingestion enabled (${env.MQTT_TOPIC_PREFIX}/+/events)`);
    }
    console.log(`[Device Module] HTTPS ingestion: POST ${env.API_PREFIX}/ingest/events`);
  });
}

process.on('SIGTERM', () => {
  stopMqttIngestion();
  void prisma.$disconnect();
});

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

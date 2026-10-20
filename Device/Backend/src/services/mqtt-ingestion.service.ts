import mqtt, { type MqttClient } from 'mqtt';
import { env } from '../config/env';
import * as ingestion from '../services/ingestion.service';

let client: MqttClient | null = null;

export function startMqttIngestion() {
  if (!env.MQTT_BROKER_URL) return;

  const prefix = env.MQTT_TOPIC_PREFIX.replace(/\/$/, '');
  client = mqtt.connect(env.MQTT_BROKER_URL, {
    username: env.MQTT_USERNAME || undefined,
    password: env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log(`[Device Module] MQTT connected → ${env.MQTT_BROKER_URL}`);
    client?.subscribe(`${prefix}/+/events`, (err) => {
      if (err) console.error('[Device Module] MQTT subscribe error', err);
    });
    client?.subscribe(`${prefix}/+/heartbeat`, (err) => {
      if (err) console.error('[Device Module] MQTT heartbeat subscribe error', err);
    });
  });

  client.on('message', (topic, payload) => {
    void handleMqttMessage(topic, payload);
  });

  client.on('error', (err) => {
    console.error('[Device Module] MQTT error', err.message);
  });
}

async function handleMqttMessage(topic: string, payload: Buffer) {
  try {
    const prefix = env.MQTT_TOPIC_PREFIX.replace(/\/$/, '');
    const parts = topic.replace(prefix, '').split('/').filter(Boolean);
    const deviceCode = parts[0]?.toUpperCase();
    const channel = parts[1];
    if (!deviceCode) return;

    const body = JSON.parse(payload.toString()) as Record<string, unknown>;
    const token =
      (typeof body.deviceToken === 'string' && body.deviceToken) ||
      (typeof body.token === 'string' && body.token) ||
      '';
    if (!token) return;

    const device = await ingestion.authenticateDevice(deviceCode, token);

    if (channel === 'heartbeat') {
      await ingestion.ingestHeartbeat(device.id, body as ingestion.IngestHeartbeatInput);
      return;
    }

    if (channel === 'events') {
      if (Array.isArray(body.events)) {
        await ingestion.ingestCardEventBatch(
          device.id,
          body.events as ingestion.IngestEventInput[]
        );
      } else {
        await ingestion.ingestCardEvent(device.id, body as ingestion.IngestEventInput);
      }
    }
  } catch (err) {
    console.error('[Device Module] MQTT message handling failed', err);
  }
}

export function stopMqttIngestion() {
  client?.end(true);
  client = null;
}

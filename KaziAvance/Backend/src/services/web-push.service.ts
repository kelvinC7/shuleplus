import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  createSign,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../config/prisma";

type VapidKeys = { publicKey: string; privateKey: string };
type PushKeys = { p256dh?: string; auth?: string };
type StoredSubscription = {
  employeeId: string;
  endpoint: string;
  keys: PushKeys;
  expirationTime?: number | null;
  updatedAt: string;
};
type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const VAPID_PATH = path.join(DATA_DIR, "vapid.json");
const SUBS_PATH = path.join(DATA_DIR, "push-subscriptions.json");
const REMINDER_PATH = path.join(DATA_DIR, "push-reminders.json");
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:ticha-avance@localhost";

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function b64url(buf: Buffer) {
  return buf.toString("base64url");
}

function fromB64url(value: string) {
  return Buffer.from(value, "base64url");
}

function generateVapidKeys(): VapidKeys {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pubJwk = publicKey.export({ format: "jwk" });
  const privJwk = privateKey.export({ format: "jwk" });
  const uncompressed = Buffer.concat([
    Buffer.from([0x04]),
    fromB64url(String(pubJwk.x)),
    fromB64url(String(pubJwk.y)),
  ]);
  return { publicKey: b64url(uncompressed), privateKey: String(privJwk.d) };
}

export function getVapidPublicKey() {
  ensureDir();
  let keys = readJson<VapidKeys | null>(VAPID_PATH, null);
  if (!keys?.publicKey || !keys?.privateKey) {
    keys = generateVapidKeys();
    writeJson(VAPID_PATH, keys);
  }
  return keys;
}

function loadSubscriptions(): StoredSubscription[] {
  return readJson<StoredSubscription[]>(SUBS_PATH, []);
}

function saveSubscriptions(rows: StoredSubscription[]) {
  writeJson(SUBS_PATH, rows);
}

export function saveEmployeeSubscription(
  employeeId: string,
  body: { endpoint?: string; keys?: PushKeys; expirationTime?: number | null }
) {
  const endpoint = String(body.endpoint || "").trim();
  if (!endpoint) throw new Error("Push endpoint is required");
  const rows = loadSubscriptions().filter((s) => s.endpoint !== endpoint);
  rows.push({
    employeeId,
    endpoint,
    keys: body.keys || {},
    expirationTime: body.expirationTime ?? null,
    updatedAt: new Date().toISOString(),
  });
  saveSubscriptions(rows);
}

export function removeEmployeeSubscription(employeeId: string, endpoint?: string) {
  const rows = loadSubscriptions().filter((s) => {
    if (s.employeeId !== employeeId) return true;
    if (endpoint) return s.endpoint !== endpoint;
    return false;
  });
  saveSubscriptions(rows);
}

function vapidJwt(audience: string, keys: VapidKeys) {
  const pub = fromB64url(keys.publicKey);
  const x = pub.subarray(1, 33);
  const y = pub.subarray(33, 65);
  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ aud: audience, exp: now + 12 * 60 * 60, sub: VAPID_SUBJECT })
  ).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: keys.privateKey,
      x: x.toString("base64url"),
      y: y.toString("base64url"),
    },
    format: "jwk",
  });
  const signer = createSign("SHA256");
  signer.update(unsigned);
  signer.end();
  const sig = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${unsigned}.${b64url(sig)}`;
}

function encryptPayload(subscription: StoredSubscription, payload: string) {
  const uaPublic = fromB64url(String(subscription.keys.p256dh || ""));
  const authSecret = fromB64url(String(subscription.keys.auth || ""));
  if (uaPublic.length !== 65 || authSecret.length !== 16) {
    throw new Error("Invalid subscription keys");
  }

  const local = createECDH("prime256v1");
  local.generateKeys();
  const asPublic = local.getPublicKey();
  const shared = local.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    uaPublic,
    asPublic,
  ]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(
    hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16)
  );
  const nonce = Buffer.from(
    hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12)
  );

  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const padded = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([0x02])]);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const idlen = Buffer.from([asPublic.length]);
  return Buffer.concat([salt, rs, idlen, asPublic, encrypted]);
}

async function sendOne(sub: StoredSubscription, payload: PushPayload) {
  const keys = getVapidPublicKey();
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = vapidJwt(audience, keys);
  const body = encryptPayload(sub, JSON.stringify(payload));

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
      TTL: "86400",
      Urgency: "normal",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(body.length),
    },
    body,
  });

  if (res.status === 404 || res.status === 410) {
    removeEmployeeSubscription(sub.employeeId, sub.endpoint);
    return;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Push failed ${res.status} ${text}`.trim());
  }
}

export async function notifyEmployee(employeeId: string, payload: PushPayload) {
  const subs = loadSubscriptions().filter((s) => s.employeeId === employeeId);
  if (!subs.length) return { sent: 0 };
  let sent = 0;
  for (const sub of subs) {
    try {
      await sendOne(sub, payload);
      sent += 1;
    } catch (error) {
      console.error("[web-push] send failed", sub.endpoint, error);
    }
  }
  return { sent };
}

export function notifyEmployeeSafe(employeeId: string, payload: PushPayload) {
  void notifyEmployee(employeeId, payload).catch((error) => {
    console.error("[web-push] notify failed", error);
  });
}

function reminderKey(id: string) {
  return id;
}

export async function sendDueRepaymentReminders() {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 7);
  const sent = readJson<Record<string, string>>(REMINDER_PATH, {});

  const due = await prisma.advanceRepayment.findMany({
    where: {
      status: { not: "Paid" },
      paidAt: null,
      dueDate: { lte: soon },
      advanceRequest: { status: { in: ["Approved", "Disbursed"] } },
    },
    include: { advanceRequest: true },
  });

  for (const row of due) {
    const key = reminderKey(row.id);
    if (sent[key]) continue;
    const overdue = row.dueDate.getTime() < now.getTime();
    const days = Math.abs(Math.round((row.dueDate.getTime() - now.getTime()) / 86400000));
    await notifyEmployee(row.employeeId, {
      title: overdue ? "Overdue repayment" : "Repayment reminder",
      body: overdue
        ? `${row.advanceRequest.requestNumber}: ${row.amount.toLocaleString()} Frw is ${days} day${days === 1 ? "" : "s"} overdue.`
        : `${row.advanceRequest.requestNumber}: ${row.amount.toLocaleString()} Frw is due in ${days} day${days === 1 ? "" : "s"}.`,
      tag: `repay-${row.id}`,
      url: "/repayment-schedule",
    });
    sent[key] = new Date().toISOString();
  }
  writeJson(REMINDER_PATH, sent);
}

let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function startPushReminderLoop() {
  if (reminderTimer) return;
  const run = () => {
    void sendDueRepaymentReminders().catch((error) => {
      console.error("[web-push] reminder loop", error);
    });
  };
  setTimeout(run, 12_000);
  reminderTimer = setInterval(run, 6 * 60 * 60 * 1000);
}

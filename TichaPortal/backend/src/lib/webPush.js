const {
  createCipheriv,
  createPrivateKey,
  createSign,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const VAPID_PATH = path.join(DATA_DIR, 'vapid.json');
const SUBS_PATH = path.join(DATA_DIR, 'push-subscriptions.json');
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@shuleplus.rw';

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function fromB64url(value) {
  return Buffer.from(String(value || ''), 'base64url');
}

function generateVapidKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pubJwk = publicKey.export({ format: 'jwk' });
  const privJwk = privateKey.export({ format: 'jwk' });
  const uncompressed = Buffer.concat([
    Buffer.from([0x04]),
    fromB64url(pubJwk.x),
    fromB64url(pubJwk.y),
  ]);
  return { publicKey: b64url(uncompressed), privateKey: String(privJwk.d) };
}

function getVapidPublicKey() {
  ensureDir();
  let keys = readJson(VAPID_PATH, null);
  if (!keys || !keys.publicKey || !keys.privateKey) {
    keys = generateVapidKeys();
    writeJson(VAPID_PATH, keys);
  }
  return keys;
}

function loadSubscriptions() {
  return readJson(SUBS_PATH, []);
}

function saveSubscriptions(rows) {
  writeJson(SUBS_PATH, rows);
}

function norm(v) {
  const s = String(v ?? '').trim();
  return s || null;
}
function normEmail(v) {
  const s = norm(v);
  return s ? s.toLowerCase() : null;
}

function teacherKeyOf(identity) {
  const org = norm(identity.organizationId) || 'org';
  const id = norm(identity.iamUserId) || norm(identity.userId) || normEmail(identity.email) || 'unknown';
  return `${org}:${id}`;
}

function saveSubscription(identity, body) {
  const endpoint = norm(body && body.endpoint);
  if (!endpoint) throw new Error('Push endpoint is required');
  const org = norm(identity.organizationId);
  const iamUserId = norm(identity.iamUserId || identity.userId || identity.sub);
  const email = normEmail(identity.email);
  const teacherKey = teacherKeyOf({ organizationId: org, iamUserId, email });

  const rows = loadSubscriptions().filter((s) => s.endpoint !== endpoint);
  rows.push({
    teacherKey,
    organizationId: org,
    iamUserId,
    email,
    endpoint,
    keys: (body && body.keys) || {},
    expirationTime: (body && body.expirationTime) ?? null,
    updatedAt: new Date().toISOString(),
  });
  saveSubscriptions(rows);
  return { teacherKey, endpoint };
}

function removeSubscription(identity, endpoint) {
  const ep = norm(endpoint);
  const org = norm(identity.organizationId);
  const iamUserId = norm(identity.iamUserId || identity.userId || identity.sub);
  const email = normEmail(identity.email);
  const teacherKey = teacherKeyOf({ organizationId: org, iamUserId, email });

  const rows = loadSubscriptions().filter((s) => {
    if (ep) return s.endpoint !== ep;
    if (s.teacherKey === teacherKey) return false;
    if (org && iamUserId && s.organizationId === org && s.iamUserId === iamUserId) return false;
    if (org && email && s.organizationId === org && normEmail(s.email) === email) return false;
    return true;
  });
  saveSubscriptions(rows);
}

function vapidJwt(audience, keys) {
  const pub = fromB64url(keys.publicKey);
  const x = pub.subarray(1, 33);
  const y = pub.subarray(33, 65);
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ aud: audience, exp: now + 12 * 60 * 60, sub: VAPID_SUBJECT })
  ).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const key = createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: keys.privateKey,
      x: x.toString('base64url'),
      y: y.toString('base64url'),
    },
    format: 'jwk',
  });
  const signer = createSign('SHA256');
  signer.update(unsigned);
  signer.end();
  const sig = signer.sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${b64url(sig)}`;
}

function encryptPayload(subscription, payload) {
  const uaPublic = fromB64url(subscription.keys && subscription.keys.p256dh);
  const authSecret = fromB64url(subscription.keys && subscription.keys.auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) {
    throw new Error('Invalid subscription keys');
  }

  const { createECDH } = require('node:crypto');
  const local = createECDH('prime256v1');
  local.generateKeys();
  const asPublic = local.getPublicKey();
  const shared = local.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'utf8'),
    uaPublic,
    asPublic,
  ]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'utf8'), 16)
  );
  const nonce = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'utf8'), 12)
  );

  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const padded = Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([0x02])]);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const idlen = Buffer.from([asPublic.length]);
  return Buffer.concat([salt, rs, idlen, asPublic, encrypted]);
}

async function sendOne(sub, payload) {
  const keys = getVapidPublicKey();
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = vapidJwt(audience, keys);
  const body = encryptPayload(sub, JSON.stringify(payload));

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
      TTL: '86400',
      Urgency: 'normal',
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(body.length),
    },
    body,
  });

  if (res.status === 404 || res.status === 410) {
    removeSubscription({ organizationId: sub.organizationId, iamUserId: sub.iamUserId, email: sub.email }, sub.endpoint);
    return { ok: false, gone: true };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Push failed ${res.status} ${text}`.trim());
  }
  return { ok: true, gone: false };
}

function matchesIdentity(sub, identity) {
  const org = norm(identity.organizationId);
  if (org && norm(sub.organizationId) && norm(sub.organizationId) !== org) return false;
  const iamUserId = norm(identity.iamUserId || identity.userId);
  const email = normEmail(identity.email);
  const key = identity.teacherKey ? norm(identity.teacherKey) : null;

  if (key && norm(sub.teacherKey) === key) return true;
  if (iamUserId && norm(sub.iamUserId) === iamUserId) return true;
  if (email && normEmail(sub.email) === email) return true;
  // allow org-scoped fallback if only one strong id matches
  if (!iamUserId && !email && key) return false;
  return Boolean((iamUserId && norm(sub.iamUserId) === iamUserId) || (email && normEmail(sub.email) === email));
}

async function notifyByIdentity(identity, payload) {
  const subs = loadSubscriptions().filter((s) => matchesIdentity(s, identity));
  if (!subs.length) return { sent: 0, matched: 0, reason: 'no_subscription' };
  let sent = 0;
  for (const sub of subs) {
    try {
      const r = await sendOne(sub, payload);
      if (r.ok) sent += 1;
    } catch (error) {
      console.error('[ticha-push] send failed', sub.endpoint, error && error.message ? error.message : error);
    }
  }
  return { sent, matched: subs.length, reason: sent ? null : 'send_failed' };
}

module.exports = {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  notifyByIdentity,
};
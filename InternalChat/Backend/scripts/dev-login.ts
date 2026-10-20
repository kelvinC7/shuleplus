/**
 * Dev helper: prints a signed access token for local testing.
 *
 *   pnpm run dev:login -- --user u-alice --org org-dev-chat --email alice@chat.dev
 *
 * The token is accepted by authenticate() and can be used for both REST
 * (Authorization: Bearer <token>) and WebSocket (auth.token) connections.
 */
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const sub = arg('user', 'u-admin');
const organizationId = arg('org', 'org-dev-chat');
const email = arg('email', `${sub}@chat.dev`);
const roles = arg('roles', 'staff').split(',').map((s) => s.trim()).filter(Boolean);

const token = jwt.sign(
  {
    sub,
    email,
    organizationId,
    sessionId: 'dev-session',
    roles,
    modules: ['chat'],
  },
  env.JWT_ACCESS_SECRET,
  { expiresIn: '24h' }
);

console.log(token);
console.log('');
console.log('REST:       Authorization: Bearer <token>');
console.log('WebSocket:  io("http://localhost:3055", { auth: { token } })');
console.log(`Upload limit: ${env.MAX_ATTACHMENT_BYTES} bytes`);

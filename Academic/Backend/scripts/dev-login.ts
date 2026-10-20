/**
 * Dev helper — logs in as the seeded Saint Theo admin and prints
 * the token + ready-to-click URL for the Academic frontend.
 *
 * Usage: npm run dev:login
 */

const IAM_API = 'http://localhost:3001/api/v1';

async function main() {
  const res = await fetch(`${IAM_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sttheo.rw', password: 'Admin@123!Test' }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Login failed (${res.status}):`, text);
    process.exit(1);
  }

  const json: any = await res.json();
  const token: string = json.data.accessToken;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Token for admin@sttheo.rw');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(token);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Open in browser:');
  console.log(`  http://localhost:3004/?token=${token}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Also decode the payload so you can inspect it
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  console.log('  JWT payload:');
  console.log(`    sub:            ${payload.sub}`);
  console.log(`    email:          ${payload.email}`);
  console.log(`    organizationId: ${payload.organizationId}`);
  console.log(`    roles:          ${payload.roles.join(', ')}`);
  console.log(`    modules:        ${payload.modules.join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

(async function(){
  const base = process.env.BABYEYI_API ?? 'http://localhost:3099/api';
  console.log('BASE:', base);
  try {
    const ping = await fetch(`${base}/babyeyi/_ping`);
    console.log('PING status', ping.status, await ping.text());
  } catch (e) {
    console.error('Ping failed', e.toString());
  }
  try {
    const lookup = await fetch(`${base}/babyeyi/lookup`);
    console.log('LOOKUP (no code) status', lookup.status);
    const txt = await lookup.text();
    console.log('LOOKUP body:', txt.slice(0, 400));
    process.exit(0);
  } catch (e) {
    console.error('Lookup failed', e.toString());
    process.exit(2);
  }
})();

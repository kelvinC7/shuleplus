const env = require('./env');

async function syncHomeworkToParentMis(payload) {
  const base = (env.PARENT_MIS_API_URL || '').replace(/\/$/, '');
  if (!base) {
    console.warn('[homework] PARENT_MIS_API_URL not set — skipping parent sync');
    return { synced: 0, skipped: true };
  }
  try {
    const res = await fetch(`${base}/webhooks/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[homework] ParentMIS sync failed: ${res.status} ${text}`);
      return { synced: 0, error: text || res.statusText };
    }
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.warn('[homework] ParentMIS unreachable', err.message);
    return { synced: 0, error: err.message };
  }
}

module.exports = { syncHomeworkToParentMis };

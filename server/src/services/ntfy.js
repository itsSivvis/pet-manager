// Sends push notifications through an ntfy server (https://ntfy.sh or self-hosted).
// Uses JSON publishing so titles with umlauts/emoji are transmitted correctly.

export async function sendNtfy(
  ntfy,
  { title, message, tags = [], priority = 3 },
  fetchImpl = fetch,
) {
  if (!ntfy?.url || !ntfy?.topic) throw new Error('ntfy is not configured');
  const headers = { 'Content-Type': 'application/json' };
  if (ntfy.token) headers.Authorization = `Bearer ${ntfy.token}`;
  const res = await fetchImpl(ntfy.url.replace(/\/+$/, ''), {
    method: 'POST',
    headers,
    body: JSON.stringify({ topic: ntfy.topic, title, message, tags, priority }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`ntfy responded with HTTP ${res.status}`);
}

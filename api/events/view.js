import sql from '../_lib/db.js';
import { allowMethod, sendError } from '../_lib/http.js';
import { clientKey, rateLimit } from '../_lib/rateLimit.js';
import { recordEvent } from '../_lib/users.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return;
  if (!rateLimit(clientKey(req, 'view'), 40, 60_000)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const username = String(req.body?.username || '').toLowerCase();
    const users = await sql`
      SELECT id FROM users WHERE username = ${username} AND is_public = true LIMIT 1
    `;
    if (!users.length) return res.status(404).json({ error: 'Profile not found' });
    await recordEvent({ type: 'view', scannedId: users[0].id });
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
}

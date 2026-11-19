import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';
import { allowMethod, sendError } from '../_lib/http.js';
import usernameLib from '../../logic/username.js';

const { validateUsername } = usernameLib;

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const checked = validateUsername(req.query.username);
    if (!checked.ok) {
      return res.json({ available: false, username: checked.username, reason: 'invalid' });
    }
    const rows = await sql`SELECT id FROM users WHERE username = ${checked.username} LIMIT 1`;
    const available = rows.length === 0 || rows[0].id === user.id;
    res.json({
      available,
      username: checked.username,
      reason: available ? 'available' : 'taken',
    });
  } catch (err) {
    sendError(res, err);
  }
}

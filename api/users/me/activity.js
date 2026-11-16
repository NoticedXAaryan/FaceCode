import sql from '../../_lib/db.js';
import { verifyAuth } from '../../_lib/auth.js';
import { allowMethod, sendError } from '../../_lib/http.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    try {
      const events = await sql`
        SELECT e.id, e.matched, e.event_type, e.platform, e.scanned_at,
               u.username AS scanner_username, u.full_name AS scanner_name
        FROM scan_events e
        LEFT JOIN users u ON u.id = e.scanner_user_id
        WHERE e.scanned_user_id = ${user.id}
        ORDER BY e.scanned_at DESC
        LIMIT 30
      `;
      return res.json({ events });
    } catch {
      const events = await sql`
        SELECT id, matched, scanned_at
        FROM scan_events
        WHERE scanned_user_id = ${user.id}
        ORDER BY scanned_at DESC
        LIMIT 30
      `;
      return res.json({
        events: events.map((event) => ({ ...event, event_type: 'scan' })),
      });
    }
  } catch (err) {
    sendError(res, err);
  }
}

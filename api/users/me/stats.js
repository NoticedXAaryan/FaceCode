import sql from '../../_lib/db.js';
import { verifyAuth } from '../../_lib/auth.js';
import { allowMethod, sendError } from '../../_lib/http.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const linkRows = await sql`SELECT COUNT(*) AS count FROM social_links WHERE user_id = ${user.id}`;
    const linkCount = parseInt(linkRows[0]?.count, 10) || 0;
    try {
      const rows = await sql`
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'scan' AND matched) AS scans,
          COUNT(*) FILTER (WHERE event_type = 'view') AS views,
          COUNT(*) FILTER (WHERE event_type = 'click') AS clicks
        FROM scan_events
        WHERE scanned_user_id = ${user.id}
      `;
      return res.json({
        scanCount: parseInt(rows[0]?.scans, 10) || 0,
        views: parseInt(rows[0]?.views, 10) || 0,
        clicks: parseInt(rows[0]?.clicks, 10) || 0,
        links: linkCount,
      });
    } catch {
      const rows = await sql`
        SELECT COUNT(*) AS count FROM scan_events
        WHERE scanned_user_id = ${user.id} AND matched = true
      `;
      return res.json({
        scanCount: parseInt(rows[0]?.count, 10) || 0,
        views: 0,
        clicks: 0,
        links: linkCount,
      });
    }
  } catch (err) {
    sendError(res, err);
  }
}

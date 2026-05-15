import sql from '../../_lib/db.js';
import { verifyAuth } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const rows = await sql`
      SELECT COUNT(*) AS count FROM scan_events WHERE scanned_user_id = ${user.id}
    `;
    res.json({ scanCount: parseInt(rows[0]?.count, 10) || 0, views: 0, links: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const faces = await sql`
      SELECT 1 FROM face_embeddings WHERE user_id = ${user.id} LIMIT 1
    `;

    const profiles = await sql`
      SELECT username FROM users WHERE id = ${user.id} LIMIT 1
    `;

    const username = profiles[0]?.username ?? null;
    const hasProfile = !!(username && String(username).trim().length >= 3);

    res.json({
      hasFace: faces.length > 0,
      hasProfile,
      username,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

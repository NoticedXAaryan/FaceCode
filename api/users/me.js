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
      SELECT username, full_name, bio, avatar_url, is_public, primary_link_platform
      FROM users WHERE id = ${user.id} LIMIT 1
    `;

    const profile = profiles[0] ?? null;
    const username = profile?.username ?? null;
    const hasProfile = !!(username && String(username).trim().length >= 3);

    const links = hasProfile
      ? await sql`
          SELECT platform, url, display_order FROM social_links
          WHERE user_id = ${user.id} ORDER BY display_order
        `
      : [];

    res.json({
      hasFace: faces.length > 0,
      hasProfile,
      username,
      fullName: profile?.full_name ?? null,
      isPublic: profile?.is_public ?? true,
      profile: profile
        ? {
            ...profile,
            links: links || [],
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

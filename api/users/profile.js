import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { fullName, username, bio, isPublic, primaryLinkPlatform, links } = req.body;

    await sql`
      INSERT INTO users (id, email, full_name, username, bio, is_public, primary_link_platform)
      VALUES (${user.id}, ${user.email}, ${fullName}, ${username}, ${bio}, ${isPublic}, ${primaryLinkPlatform})
      ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        username = COALESCE(EXCLUDED.username, users.username),
        bio = COALESCE(EXCLUDED.bio, users.bio),
        is_public = COALESCE(EXCLUDED.is_public, users.is_public),
        primary_link_platform = COALESCE(EXCLUDED.primary_link_platform, users.primary_link_platform)
    `;

    if (links && Array.isArray(links)) {
      await sql`DELETE FROM social_links WHERE user_id = ${user.id}`;
      for (let i = 0; i < links.length; i++) {
        await sql`
          INSERT INTO social_links (user_id, platform, url, display_order)
          VALUES (${user.id}, ${links[i].platform}, ${links[i].url}, ${i})
        `;
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

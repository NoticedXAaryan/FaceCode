import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';
import { allowMethod, sendError } from '../_lib/http.js';
import { getLinks, hasCompletedProfile } from '../_lib/users.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const faces = await sql`SELECT 1 FROM face_embeddings WHERE user_id = ${user.id} LIMIT 1`;
    const profiles = await sql`
      SELECT username, full_name, bio, avatar_url, is_public, primary_link_platform
      FROM users WHERE id = ${user.id} LIMIT 1
    `;
    const profile = profiles[0] ?? null;
    const links = profile ? await getLinks(user.id) : [];

    res.json({
      hasFace: faces.length > 0,
      hasProfile: hasCompletedProfile(profile),
      username: profile?.username ?? null,
      fullName: profile?.full_name ?? null,
      isPublic: profile?.is_public ?? true,
      profile: profile ? { ...profile, links: links || [] } : null,
    });
  } catch (err) {
    sendError(res, err);
  }
}

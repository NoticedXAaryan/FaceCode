import sql from '../../_lib/db.js';
import { verifyAuth } from '../../_lib/auth.js';
import { allowMethod, sendError } from '../../_lib/http.js';
import { getLinks, hasCompletedProfile } from '../../_lib/users.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const profiles = await sql`
      SELECT id, email, username, full_name, bio, avatar_url, is_public, primary_link_platform, created_at
      FROM users WHERE id = ${user.id} LIMIT 1
    `;
    const profile = profiles[0] || null;
    const links = profile ? await getLinks(user.id) : [];
    const faces = await sql`SELECT updated_at FROM face_embeddings WHERE user_id = ${user.id} LIMIT 1`;
    let events = [];
    try {
      events = await sql`
        SELECT matched, event_type, platform, scanned_at
        FROM scan_events WHERE scanned_user_id = ${user.id}
        ORDER BY scanned_at DESC LIMIT 100
      `;
    } catch {
      events = await sql`
        SELECT matched, scanned_at FROM scan_events
        WHERE scanned_user_id = ${user.id}
        ORDER BY scanned_at DESC LIMIT 100
      `;
    }

    res.json({
      exportedAt: new Date().toISOString(),
      profile,
      links,
      hasFace: faces.length > 0,
      faceUpdatedAt: faces[0]?.updated_at || null,
      hasProfile: hasCompletedProfile(profile),
      events,
      note: 'Face embeddings are biometric templates and are not included in this export. Remove them from Settings.',
    });
  } catch (err) {
    sendError(res, err);
  }
}

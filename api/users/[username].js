import sql from '../_lib/db.js';
import { allowMethod, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;
  const { username } = req.query;

  try {
    const users = await sql`
      SELECT id, username, full_name, bio, avatar_url, is_public, primary_link_platform
      FROM users WHERE username = ${username} AND is_public = true
    `;
    if (!users.length) {
      return res.status(404).json({ error: 'User not found or profile is private' });
    }
    const user = users[0];
    const links = await sql`
      SELECT platform, url, display_order FROM social_links
      WHERE user_id = ${user.id} ORDER BY display_order
    `;
    res.json({ user, links: links || [] });
  } catch (err) {
    sendError(res, err);
  }
}

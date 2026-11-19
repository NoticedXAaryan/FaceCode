import { verifyAuth } from '../_lib/auth.js';
import { allowMethod, sendError } from '../_lib/http.js';
import { saveProfile } from '../_lib/users.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'PUT')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const saved = await saveProfile(user, req.body || {});
    res.json({
      success: true,
      username: saved.profile.username,
      profile: { ...saved.profile, links: saved.links },
    });
  } catch (err) {
    sendError(res, err);
  }
}

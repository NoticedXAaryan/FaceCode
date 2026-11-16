import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';
import { allowMethod, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'DELETE')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await sql`DELETE FROM face_embeddings WHERE user_id = ${user.id}`;
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
}

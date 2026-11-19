import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';
import { allowMethod, sendError } from '../_lib/http.js';
import { ensureUser } from '../_lib/users.js';
import { extractFaceEmbedding } from '../_lib/faceService.js';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    await ensureUser(user);
    const { embedding, model } = await extractFaceEmbedding(imageBase64);
    await sql`DELETE FROM face_embeddings WHERE user_id = ${user.id}`;
    try {
      await sql`
        INSERT INTO face_embeddings (user_id, embedding)
        VALUES (${user.id}, ${JSON.stringify(embedding)}::jsonb)
      `;
    } catch (err) {
      const message = String(err.message || '');
      if (!message.includes('jsonb') && !message.includes('type')) throw err;
      await sql`
        INSERT INTO face_embeddings (user_id, embedding)
        VALUES (${user.id}, ${embedding})
      `;
    }

    res.json({ success: true, model, message: 'Face enrolled successfully' });
  } catch (err) {
    sendError(res, err);
  }
}

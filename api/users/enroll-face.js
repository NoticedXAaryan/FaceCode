import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';
import { extractFaceEmbedding, isReady } from '../_lib/faceService.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (!isReady()) {
      return res.status(503).json({ error: 'Face service not ready. Set HUGGINGFACE_API_KEY.' });
    }

    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const embedding = await extractFaceEmbedding(imageBase64);

    await sql`DELETE FROM face_embeddings WHERE user_id = ${user.id}`;
    await sql`INSERT INTO face_embeddings (user_id, embedding) VALUES (${user.id}, ${embedding})`;

    res.json({ success: true, message: 'Face enrolled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

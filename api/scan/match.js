import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';
import { extractFaceEmbedding, cosineSimilarity, isReady } from '../_lib/faceService.js';

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
      return res.status(503).json({
        matched: false,
        error: 'Face service not ready. Add HUGGINGFACE_API_KEY.',
      });
    }

    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const scannedEmbedding = await extractFaceEmbedding(imageBase64);

    const embeddings = await sql`SELECT user_id, embedding FROM face_embeddings`;

    if (!embeddings || embeddings.length === 0) {
      return res.json({ matched: false, message: 'No enrolled faces found' });
    }

    let bestMatch = null;
    let bestScore = 0;
    const THRESHOLD = 0.6;

    for (const row of embeddings) {
      const score = cosineSimilarity(scannedEmbedding, row.embedding);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = row;
      }
    }

    if (!bestMatch || bestScore < THRESHOLD) {
      return res.json({ matched: false, score: bestScore });
    }

    const users = await sql`
      SELECT id, username, full_name, bio, avatar_url, is_public, primary_link_platform
      FROM users WHERE id = ${bestMatch.user_id} AND is_public = true
    `;

    if (users.length === 0) {
      return res.json({ matched: false, message: 'Matched user has a private profile' });
    }

    const matchedUser = users[0];

    const links = await sql`
      SELECT platform, url, display_order FROM social_links
      WHERE user_id = ${matchedUser.id} ORDER BY display_order
    `;

    // Log scan event (fire-and-forget)
    sql`
      INSERT INTO scan_events (scanner_user_id, scanned_user_id, matched)
      VALUES (${user.id}, ${matchedUser.id}, ${true})
    `.catch(() => {});

    res.json({
      matched: true,
      score: bestScore,
      user: matchedUser,
      links: links || [],
    });
  } catch (err) {
    console.error('Scan match error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

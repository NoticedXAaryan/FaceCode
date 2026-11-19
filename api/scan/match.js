import sql from '../_lib/db.js';
import { verifyAuth } from '../_lib/auth.js';
import { allowMethod, sendError } from '../_lib/http.js';
import { rateLimit } from '../_lib/rateLimit.js';
import { ensureUser, getLinks, recordEvent } from '../_lib/users.js';
import {
  cosineSimilarity,
  extractFaceEmbedding,
  parseEmbedding,
  thresholdFor,
} from '../_lib/faceService.js';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!rateLimit(`scan:${user.id}`, 20, 60_000)) {
    return res.status(429).json({ error: 'Too many scans. Wait a moment and try again.' });
  }

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    await ensureUser(user);
    const { embedding: scanned, model } = await extractFaceEmbedding(imageBase64);
    const rows = await sql`SELECT user_id, embedding FROM face_embeddings`;

    let best = null;
    let bestScore = 0;
    for (const row of rows) {
      if (row.user_id === user.id) continue;
      const stored = parseEmbedding(row.embedding);
      const score = cosineSimilarity(scanned, stored);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }

    const threshold = thresholdFor(scanned);
    if (!best || bestScore < threshold) {
      return res.json({ matched: false, score: bestScore, engine: model });
    }

    const users = await sql`
      SELECT id, username, full_name, bio, avatar_url, is_public, primary_link_platform
      FROM users WHERE id = ${best.user_id} AND is_public = true
    `;
    if (!users.length) {
      return res.json({ matched: false, message: 'Matched user has a private profile', score: bestScore });
    }

    const matchedUser = users[0];
    const links = await getLinks(matchedUser.id);
    recordEvent({
      type: 'scan',
      scannerId: user.id,
      scannedId: matchedUser.id,
      matched: true,
    }).catch(() => {});

    res.json({
      matched: true,
      score: bestScore,
      engine: model,
      user: matchedUser,
      links: links || [],
    });
  } catch (err) {
    sendError(res, err);
  }
}

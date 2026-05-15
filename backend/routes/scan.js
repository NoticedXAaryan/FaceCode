const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const supabaseAdmin = require('../supabaseAdmin');
const { extractFaceEmbedding, cosineSimilarity, isReady } = require('../services/faceService');
const verifyAuth = require('../middleware/verifyAuth');

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many scan requests. Wait a minute.' },
});

router.post('/match', scanLimiter, verifyAuth, async (req, res) => {
  try {
    if (!isReady()) {
      return res.status(503).json({
        matched: false,
        error: 'Face service not ready. Add HUGGINGFACE_API_KEY to backend .env',
      });
    }

    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const scannedEmbedding = await extractFaceEmbedding(imageBase64);

    const { data: embeddings, error } = await supabaseAdmin
      .from('face_embeddings')
      .select('user_id, embedding');

    if (error) return res.status(500).json({ error: error.message });
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

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, bio, avatar_url, is_public, primary_link_platform')
      .eq('id', bestMatch.user_id)
      .eq('is_public', true)
      .single();

    if (userError || !user) {
      return res.json({ matched: false, message: 'Matched user has a private profile' });
    }

    const { data: links } = await supabaseAdmin
      .from('social_links')
      .select('platform, url, display_order')
      .eq('user_id', user.id)
      .order('display_order');

    await supabaseAdmin.from('scan_events').insert({
      scanner_user_id: req.user.id,
      scanned_user_id: user.id,
      matched: true,
    }).catch(() => {});

    res.json({
      matched: true,
      score: bestScore,
      user,
      links: links || [],
    });
  } catch (err) {
    console.error('Scan match error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

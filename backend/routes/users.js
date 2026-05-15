const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../supabaseAdmin');
const { extractFaceEmbedding, isReady } = require('../services/faceService');
const verifyAuth = require('../middleware/verifyAuth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/me/stats', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { count: scanCount } = await supabaseAdmin
      .from('scan_events')
      .select('*', { count: 'exact', head: true })
      .eq('scanned_user_id', userId);
    res.json({ scanCount: scanCount || 0, views: 0, links: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/enroll-face', verifyAuth, async (req, res) => {
  try {
    if (!isReady()) {
      return res.status(503).json({ error: 'Face service not ready. Set HUGGINGFACE_API_KEY in backend .env' });
    }
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const embedding = await extractFaceEmbedding(imageBase64);
    const userId = req.user.id;

    await supabaseAdmin.from('face_embeddings').delete().eq('user_id', userId);

    const { error } = await supabaseAdmin.from('face_embeddings').insert({
      user_id: userId,
      embedding: embedding,
    });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: 'Face enrolled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, username, bio, isPublic, primaryLinkPlatform, links } = req.body;

    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        full_name: fullName,
        username: username,
        bio: bio,
        is_public: isPublic,
        primary_link_platform: primaryLinkPlatform,
      })
      .eq('id', userId);

    if (userError) return res.status(500).json({ error: userError.message });

    if (links && Array.isArray(links)) {
      await supabaseAdmin.from('social_links').delete().eq('user_id', userId);
      if (links.length > 0) {
        const linkRows = links.map((link, index) => ({
          user_id: userId,
          platform: link.platform,
          url: link.url,
          display_order: index,
        }));
        const { error: linkError } = await supabaseAdmin.from('social_links').insert(linkRows);
        if (linkError) return res.status(500).json({ error: linkError.message });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/face', verifyAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('face_embeddings')
      .delete()
      .eq('user_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, bio, avatar_url, is_public, primary_link_platform')
      .eq('username', username)
      .eq('is_public', true)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found or profile is private' });

    const { data: links } = await supabaseAdmin
      .from('social_links')
      .select('platform, url, display_order')
      .eq('user_id', user.id)
      .order('display_order');

    res.json({ user, links: links || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
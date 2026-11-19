import { verifyAuth } from '../_lib/auth.js';
import { allowMethod, sendError } from '../_lib/http.js';
import { saveProfile } from '../_lib/users.js';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return;
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const normalized = String(req.body?.imageBase64 || '').replace(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
      '',
    );
    const input = Buffer.from(normalized, 'base64');
    if (!input.length) return res.status(400).json({ error: 'imageBase64 required' });

    const sharp = (await import('sharp')).default;
    const jpeg = await sharp(input)
      .rotate()
      .resize(256, 256, { fit: 'cover' })
      .jpeg({ quality: 72 })
      .toBuffer();
    const avatarUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    const saved = await saveProfile(user, { avatarUrl });
    res.json({ success: true, avatarUrl: saved.profile.avatar_url });
  } catch (err) {
    err.status = err.status || 400;
    sendError(res, err);
  }
}

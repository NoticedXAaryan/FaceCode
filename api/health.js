import sql from './_lib/db.js';
import { isReady } from './_lib/faceService.js';

export default async function handler(req, res) {
  try {
    const dbResult = await sql`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      auth: 'clerk',
      faceService: isReady() ? 'ready' : 'not ready',
      model: 'openai/clip-vit-base-patch32',
      runtime: 'vercel-serverless',
    });
  } catch (err) {
    res.json({
      status: 'ok',
      database: 'error: ' + err.message,
      auth: 'clerk',
      faceService: isReady() ? 'ready' : 'not ready',
    });
  }
}

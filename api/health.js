import sql from './_lib/db.js';
import { engineName } from './_lib/faceService.js';

export default async function handler(req, res) {
  const faceService = engineName();
  try {
    await sql`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      auth: 'clerk',
      faceService,
      runtime: 'vercel-serverless',
    });
  } catch (err) {
    res.status(200).json({
      status: 'degraded',
      database: err.message,
      auth: 'clerk',
      faceService,
      runtime: 'vercel-serverless',
    });
  }
}

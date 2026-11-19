import sql from './_lib/db.js';
import { engineName } from './_lib/faceService.js';
import { allowMethod } from './_lib/http.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;
  const faceService = engineName();
  try {
    await sql`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      auth: 'better-auth',
      faceService,
      runtime: 'vercel-serverless',
    });
  } catch (err) {
    res.status(200).json({
      status: 'degraded',
      database: err.message,
      auth: 'better-auth',
      faceService,
      runtime: 'vercel-serverless',
    });
  }
}

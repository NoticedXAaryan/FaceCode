#!/usr/bin/env node
/**
 * In-memory FaceTag API used by Robot Framework acceptance tests.
 * Auth: Authorization: Bearer test-<userId>
 * Face embeddings: deterministic hash of imageBase64 (same image => same vector).
 */
import http from 'node:http';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';

const PORT = Number(process.env.MOCK_API_PORT || 8787);
const HOST = process.env.MOCK_API_HOST || '127.0.0.1';

const users = new Map(); // id -> profile
const faces = new Map(); // userId -> embedding number[]
const links = new Map(); // userId -> link[]
const events = [];

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_err) {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function auth(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+test-(.+)$/i.exec(header);
  if (!match) return null;
  const id = match[1].trim();
  if (!id) return null;
  return { id, email: `${id}@facetag.test`, fullName: `User ${id}` };
}

function ensureUser(user) {
  if (!users.has(user.id)) {
    users.set(user.id, {
      id: user.id,
      email: user.email,
      username: null,
      full_name: user.fullName,
      bio: '',
      avatar_url: null,
      is_public: true,
      primary_link_platform: null,
    });
  }
  return users.get(user.id);
}

function validateUsername(value) {
  const username = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { ok: false, username, error: 'Username must be 3–20 characters: letters, numbers, underscores.' };
  }
  return { ok: true, username };
}

function embeddingFromImage(imageBase64) {
  const hash = createHash('sha256').update(String(imageBase64 || '')).digest();
  const embedding = [];
  for (let i = 0; i < 32; i += 1) {
    embedding.push((hash[i % hash.length] / 255) * 2 - 1);
  }
  return embedding;
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function cleanLinks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const link of raw) {
    const platform = String(link?.platform || '')
      .trim()
      .toLowerCase()
      .slice(0, 40);
    let url = String(link?.url || '').trim();
    if (!platform || !url) continue;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    out.push({ platform, url, display_order: out.length });
    if (out.length >= 12) break;
  }
  return out;
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    return json(res, 200, {});
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (path === '/api/health' && req.method === 'GET') {
      return json(res, 200, {
        status: 'ok',
        database: 'memory',
        auth: 'mock-bearer',
        faceService: 'hash-embedding',
        runtime: 'robot-mock',
      });
    }

    if (path === '/api/users/me' && req.method === 'GET') {
      const user = auth(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const profile = users.get(user.id) || null;
      const hasFace = faces.has(user.id);
      const hasProfile = Boolean(profile?.username && profile.username.length >= 3);
      return json(res, 200, {
        hasFace,
        hasProfile,
        username: profile?.username ?? null,
        fullName: profile?.full_name ?? null,
        isPublic: profile?.is_public ?? true,
        profile: profile
          ? { ...profile, links: links.get(user.id) || [] }
          : null,
      });
    }

    if (path === '/api/users/check-username' && req.method === 'GET') {
      const user = auth(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const checked = validateUsername(url.searchParams.get('username'));
      if (!checked.ok) {
        return json(res, 200, { available: false, username: checked.username, reason: 'invalid' });
      }
      let takenBy = null;
      for (const row of users.values()) {
        if (row.username === checked.username) {
          takenBy = row.id;
          break;
        }
      }
      const available = !takenBy || takenBy === user.id;
      return json(res, 200, {
        available,
        username: checked.username,
        reason: available ? 'available' : 'taken',
      });
    }

    if (path === '/api/users/profile' && req.method === 'PUT') {
      const user = auth(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const body = await readBody(req);
      const profile = ensureUser(user);
      if (body.fullName !== undefined) profile.full_name = String(body.fullName || '').trim().slice(0, 80);
      if (body.bio !== undefined) profile.bio = String(body.bio || '').slice(0, 160);
      if (body.isPublic !== undefined) profile.is_public = Boolean(body.isPublic);
      if (body.avatarUrl !== undefined) profile.avatar_url = body.avatarUrl || null;
      if (body.username) {
        const checked = validateUsername(body.username);
        if (!checked.ok) return json(res, 400, { error: checked.error });
        for (const row of users.values()) {
          if (row.username === checked.username && row.id !== user.id) {
            return json(res, 409, { error: 'Username taken' });
          }
        }
        profile.username = checked.username;
      }
      if (body.links !== undefined) {
        const cleaned = cleanLinks(body.links);
        links.set(user.id, cleaned);
        if (body.primaryLinkPlatform !== undefined) {
          profile.primary_link_platform = body.primaryLinkPlatform || cleaned[0]?.platform || null;
        } else {
          profile.primary_link_platform = cleaned[0]?.platform || null;
        }
      } else if (body.primaryLinkPlatform !== undefined) {
        profile.primary_link_platform = body.primaryLinkPlatform || null;
      }
      return json(res, 200, {
        success: true,
        username: profile.username,
        profile: { ...profile, links: links.get(user.id) || [] },
      });
    }

    if (path === '/api/users/enroll-face' && req.method === 'POST') {
      const user = auth(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const body = await readBody(req);
      if (!body.imageBase64) return json(res, 400, { error: 'imageBase64 required' });
      ensureUser(user);
      faces.set(user.id, embeddingFromImage(body.imageBase64));
      return json(res, 200, { success: true, model: 'hash-embedding', message: 'Face enrolled successfully' });
    }

    if (path === '/api/users/face' && req.method === 'DELETE') {
      const user = auth(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      faces.delete(user.id);
      return json(res, 200, { success: true });
    }

    if (path === '/api/scan/match' && req.method === 'POST') {
      const user = auth(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const body = await readBody(req);
      if (!body.imageBase64) return json(res, 400, { error: 'imageBase64 required' });
      ensureUser(user);
      const scanned = embeddingFromImage(body.imageBase64);
      let best = null;
      let bestScore = 0;
      for (const [userId, embedding] of faces.entries()) {
        if (userId === user.id) continue;
        const score = cosine(scanned, embedding);
        if (score > bestScore) {
          bestScore = score;
          best = userId;
        }
      }
      const threshold = 0.99;
      if (!best || bestScore < threshold) {
        return json(res, 200, { matched: false, score: bestScore, engine: 'hash-embedding' });
      }
      const matchedUser = users.get(best);
      if (!matchedUser || matchedUser.is_public === false) {
        return json(res, 200, {
          matched: false,
          message: 'Matched user has a private profile',
          score: bestScore,
        });
      }
      events.push({ type: 'scan', scannerId: user.id, scannedId: best, matched: true });
      return json(res, 200, {
        matched: true,
        score: bestScore,
        engine: 'hash-embedding',
        user: matchedUser,
        links: links.get(best) || [],
      });
    }

    const publicMatch = path.match(/^\/api\/users\/([^/]+)$/);
    if (publicMatch && req.method === 'GET') {
      const username = decodeURIComponent(publicMatch[1]);
      if (['me', 'profile', 'check-username', 'enroll-face', 'face', 'account', 'avatar'].includes(username)) {
        return json(res, 404, { error: 'Not found' });
      }
      let found = null;
      for (const row of users.values()) {
        if (row.username === username && row.is_public !== false) {
          found = row;
          break;
        }
      }
      if (!found) return json(res, 404, { error: 'User not found or profile is private' });
      return json(res, 200, { user: found, links: links.get(found.id) || [] });
    }

    if (path === '/api/events/view' && req.method === 'POST') {
      const body = await readBody(req);
      events.push({ type: 'view', ...body });
      return json(res, 200, { ok: true });
    }

    if (path === '/api/events/click' && req.method === 'POST') {
      const body = await readBody(req);
      events.push({ type: 'click', ...body });
      return json(res, 200, { ok: true });
    }

    if (path === '/__robot__/reset' && req.method === 'POST') {
      users.clear();
      faces.clear();
      links.clear();
      events.length = 0;
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: `No route ${req.method} ${path}` });
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || 'Request failed' });
  }
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => json(res, 500, { error: err.message }));
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`mock-api listening on http://${HOST}:${PORT}\n`);
});

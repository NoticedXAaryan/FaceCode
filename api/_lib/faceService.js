import axios from 'axios';
import facePixels from '../../logic/facePixels.js';

const {
  cosineSimilarity,
  LOCAL_EMBEDDING_MODEL,
  LOCAL_MATCH_THRESHOLD,
} = facePixels;

const CLIP_MODEL = process.env.HUGGINGFACE_FACE_MODEL || 'openai/clip-vit-base-patch32';

function huggingFaceConfigured() {
  const key = process.env.HUGGINGFACE_API_KEY || '';
  return Boolean(key) && !key.includes('your_token') && !key.includes('YOUR_');
}

export function engineName() {
  if (process.env.FACE_EMBEDDING_URL) return 'remote';
  if (huggingFaceConfigured()) return `hf:${CLIP_MODEL}`;
  return LOCAL_EMBEDDING_MODEL;
}

export function isReady() {
  return true;
}

export function parseEmbedding(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {
      return [];
    }
  }
  return [];
}

export function thresholdFor(embedding) {
  if (process.env.FACE_MATCH_THRESHOLD) return Number(process.env.FACE_MATCH_THRESHOLD);
  if (embedding?.length === 1024) return LOCAL_MATCH_THRESHOLD;
  return 0.8;
}

async function pixelsFromBase64(imageBase64) {
  const normalized = String(imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const buffer = Buffer.from(normalized, 'base64');
  if (!buffer.length) {
    const error = new Error('imageBase64 required');
    error.status = 400;
    throw error;
  }
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(160, 160, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { rgba: data, width: info.width, height: info.height, buffer, normalized };
}

async function extractLocal(imageBase64) {
  const { rgba, width, height } = await pixelsFromBase64(imageBase64);
  try {
    return {
      embedding: facePixels.embeddingFromRgba(rgba, width, height),
      model: LOCAL_EMBEDDING_MODEL,
    };
  } catch (err) {
    err.status = 400;
    throw err;
  }
}

async function extractRemote(normalizedBase64) {
  const token = process.env.FACE_EMBEDDING_TOKEN || process.env.HUGGINGFACE_API_KEY;
  const response = await axios.post(
    process.env.FACE_EMBEDDING_URL,
    { imageBase64: normalizedBase64 },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 30000,
    },
  );
  const embedding = parseEmbedding(response.data?.embedding || response.data);
  if (!embedding.length) {
    const error = new Error('Remote face service returned an empty embedding');
    error.status = 502;
    throw error;
  }
  return { embedding, model: response.data?.model || 'remote' };
}

async function extractHuggingFace(buffer) {
  const urls = [
    `https://router.huggingface.co/hf-inference/models/${CLIP_MODEL}/pipeline/feature-extraction`,
    `https://api-inference.huggingface.co/models/${CLIP_MODEL}`,
  ];
  let lastError;
  for (const url of urls) {
    try {
      const response = await axios.post(url, buffer, {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/octet-stream',
        },
        timeout: 45000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      let embedding = response.data;
      if (Array.isArray(embedding) && Array.isArray(embedding[0])) embedding = embedding[0];
      if (Array.isArray(embedding) && Array.isArray(embedding[0])) embedding = embedding[0];
      embedding = parseEmbedding(embedding);
      if (!embedding.length) throw new Error('Invalid embedding format from Hugging Face');
      return { embedding, model: `hf:${CLIP_MODEL}` };
    } catch (err) {
      lastError = err;
    }
  }
  const status = lastError?.response?.status;
  const error = new Error(
    status === 503
      ? 'Face service is warming up. Try again in a few seconds.'
      : 'Hugging Face did not return a face embedding.',
  );
  error.status = status === 503 ? 503 : 502;
  throw error;
}

export async function extractFaceEmbedding(imageBase64) {
  if (process.env.FACE_EMBEDDING_URL) {
    const { normalized } = await pixelsFromBase64(imageBase64);
    return extractRemote(normalized);
  }

  if (huggingFaceConfigured()) {
    const { buffer } = await pixelsFromBase64(imageBase64);
    let localCheck = null;
    try {
      localCheck = await extractLocal(imageBase64);
    } catch (err) {
      if (process.env.FACE_ENGINE === 'local') throw err;
    }
    if (process.env.FACE_ENGINE === 'local' && localCheck) return localCheck;
    try {
      return await extractHuggingFace(buffer);
    } catch (err) {
      if (process.env.FACE_ALLOW_LOCAL_FALLBACK === 'true' && localCheck) return localCheck;
      throw err;
    }
  }

  return extractLocal(imageBase64);
}

export { cosineSimilarity };

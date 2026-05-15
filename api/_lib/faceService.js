import axios from 'axios';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const CLIP_URL = 'https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32';

export function isReady() {
  return !!(HF_API_KEY && !HF_API_KEY.includes('your_token'));
}

export async function extractFaceEmbedding(imageBase64) {
  if (!isReady()) throw new Error('Face service not ready');

  const normalizedBase64 = (imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const inputBuffer = Buffer.from(normalizedBase64, 'base64');

  // Dynamically import sharp (Vercel bundles it natively)
  const sharp = (await import('sharp')).default;

  const resizedBuffer = await sharp(inputBuffer)
    .resize(224, 224, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toBuffer();

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await axios.post(CLIP_URL, resizedBuffer, {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/octet-stream',
        },
        timeout: 60000,
      });

      let embedding = response.data;
      if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
        embedding = embedding[0];
      }

      if (!Array.isArray(embedding)) {
        throw new Error('Invalid embedding format from HuggingFace');
      }

      return embedding;
    } catch (err) {
      lastError = err;

      if (err.response?.status === 404) {
        throw new Error('Wrong model URL or API key invalid');
      }

      if (err.response?.status === 503 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 8000));
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error('Failed to extract face embedding');
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Lightweight face signature used when no remote face model is configured.
 * It finds a skin-toned region, aligns on that box, and builds a
 * lighting-tolerant high-pass signature of the face. This is not ArcFace.
 * It separates faces in normal selfie conditions and needs no extra account.
 * For production-grade matching, set FACE_EMBEDDING_URL to an InsightFace
 * compatible endpoint.
 */

function isSkinPixel(r, g, b) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const ycbcr = y > 40 && cb >= 77 && cb <= 130 && cr >= 130 && cr <= 180;
  const rgbRule = r > 90 && g > 40 && b > 20 && r >= g - 5 && r >= b && Math.abs(r - g) > 10;
  return ycbcr || rgbRule;
}

function sampleRgba(rgba, width, height, maxDim = 160) {
  const scale = Math.min(1, maxDim / Math.max(width, height));
  if (scale > 0.99) return { rgba, width, height };
  const w = Math.max(8, Math.round(width * scale));
  const h = Math.max(8, Math.round(height * scale));
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const sy = Math.min(height - 1, Math.floor(((y + 0.5) * height) / h));
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) * width) / w));
      const si = (sy * width + sx) * 4;
      const di = (y * w + x) * 4;
      out[di] = rgba[si];
      out[di + 1] = rgba[si + 1];
      out[di + 2] = rgba[si + 2];
      out[di + 3] = rgba[si + 3] ?? 255;
    }
  }
  return { rgba: out, width: w, height: h };
}

function skinBox(rgba, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let skin = 0;
  const total = width * height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (!isSkinPixel(rgba[i], rgba[i + 1], rgba[i + 2])) continue;
      skin += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (skin < total * 0.06 || maxX < minX) return null;
  const padX = Math.round((maxX - minX) * 0.08);
  const padY = Math.round((maxY - minY) * 0.1);
  const x0 = Math.max(0, minX - padX);
  const y0 = Math.max(0, minY - padY);
  const x1 = Math.min(width - 1, maxX + padX);
  const y1 = Math.min(height - 1, maxY + padY);
  const boxArea = Math.max(1, (x1 - x0) * (y1 - y0));
  if (boxArea < total * 0.05 || boxArea > total * 0.92) return null;
  return { x0, y0, x1, y1, skinRatio: skin / total };
}

function luminance(rgba, width, x, y) {
  const i = (y * width + x) * 4;
  return 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
}

function stddev(rgba, width, height) {
  const values = [];
  const step = Math.max(2, Math.floor(Math.min(width, height) / 40));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      values.push(luminance(rgba, width, x, y));
    }
  }
  if (values.length < 8) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function analyzeFrame(rgba, width, height) {
  if (!rgba?.length || width < 8 || height < 8) {
    return { hasFace: false, skinRatio: 0, stddev: 0 };
  }
  const sampled = sampleRgba(rgba, width, height, 160);
  const flatness = stddev(sampled.rgba, sampled.width, sampled.height);
  const box = skinBox(sampled.rgba, sampled.width, sampled.height);
  return {
    hasFace: Boolean(box) && flatness >= 12,
    skinRatio: box?.skinRatio ?? 0,
    stddev: flatness,
    box,
  };
}

function resampleGray(rgba, width, height, box, size) {
  const gray = new Float32Array(size * size);
  const bw = Math.max(1, box.x1 - box.x0);
  const bh = Math.max(1, box.y1 - box.y0);
  for (let y = 0; y < size; y += 1) {
    const sy = Math.min(height - 1, Math.floor(box.y0 + ((y + 0.5) * bh) / size));
    for (let x = 0; x < size; x += 1) {
      const sx = Math.min(width - 1, Math.floor(box.x0 + ((x + 0.5) * bw) / size));
      gray[y * size + x] = luminance(rgba, width, sx, sy);
    }
  }
  return gray;
}

function highPassSignature(gray, size) {
  const hp = new Float32Array(size * size);
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const c = gray[y * size + x];
      const neighbors =
        (gray[(y - 1) * size + x] +
          gray[(y + 1) * size + x] +
          gray[y * size + (x - 1)] +
          gray[y * size + (x + 1)]) /
        4;
      hp[y * size + x] = c - neighbors;
    }
  }
  let mean = 0;
  for (let i = 0; i < hp.length; i += 1) mean += hp[i];
  mean /= hp.length;
  let variance = 0;
  for (let i = 0; i < hp.length; i += 1) variance += (hp[i] - mean) ** 2;
  const spread = Math.sqrt(variance / hp.length) || 1;
  const vector = new Array(hp.length);
  for (let i = 0; i < hp.length; i += 1) vector[i] = (hp[i] - mean) / spread;
  return l2normalize(vector);
}

function l2normalize(vector) {
  let norm = 0;
  for (let i = 0; i < vector.length; i += 1) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  return vector.map((v) => v / norm);
}

const LOCAL_EMBEDDING_MODEL = 'facetag-signature-v1';
const LOCAL_MATCH_THRESHOLD = 0.88;

function embeddingFromRgba(rgba, width, height) {
  const sampled = sampleRgba(rgba, width, height, 160);
  const analysis = analyzeFrame(sampled.rgba, sampled.width, sampled.height);
  if (!analysis.hasFace || !analysis.box) {
    const error = new Error('No face detected. Center your face in the frame and try again.');
    error.code = 'NO_FACE';
    throw error;
  }
  const gray = resampleGray(sampled.rgba, sampled.width, sampled.height, analysis.box, 32);
  return highPassSignature(gray, 32);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
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

module.exports = {
  isSkinPixel,
  analyzeFrame,
  l2normalize,
  embeddingFromRgba,
  cosineSimilarity,
  LOCAL_EMBEDDING_MODEL,
  LOCAL_MATCH_THRESHOLD,
};

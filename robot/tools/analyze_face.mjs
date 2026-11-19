#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  analyzeFrame,
  embeddingFromRgba,
  cosineSimilarity,
  LOCAL_MATCH_THRESHOLD,
} = require('../../logic/facePixels.js');

const kind = process.argv[2] || 'face';
const width = 160;
const height = 160;

function paintFace(options = {}) {
  const {
    skin = [214, 156, 122],
    bg = [18, 18, 22],
    eyeDx = 18,
    eyeY = 0.42,
    mouthY = 0.68,
    brightness = 0,
    shiftX = 0,
    shiftY = 0,
  } = options;
  const rgba = new Uint8Array(width * height * 4);
  const cx = width / 2 + shiftX;
  const cy = height * 0.48 + shiftY;
  const rx = width * 0.28;
  const ry = height * 0.36;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const inside = nx * nx + ny * ny <= 1;
      let r = bg[0];
      let g = bg[1];
      let b = bg[2];
      if (inside) {
        r = skin[0];
        g = skin[1];
        b = skin[2];
        const eyeYpx = cy + (eyeY - 0.48) * height;
        const mouthYpx = cy + (mouthY - 0.48) * height;
        const leftEye = (x - (cx - eyeDx)) ** 2 + (y - eyeYpx) ** 2 < 36;
        const rightEye = (x - (cx + eyeDx)) ** 2 + (y - eyeYpx) ** 2 < 36;
        const mouth = Math.abs(y - mouthYpx) < 3 && Math.abs(x - cx) < 16;
        if (leftEye || rightEye || mouth) {
          r = 40;
          g = 28;
          b = 24;
        }
      }
      rgba[i] = Math.max(0, Math.min(255, r + brightness));
      rgba[i + 1] = Math.max(0, Math.min(255, g + brightness));
      rgba[i + 2] = Math.max(0, Math.min(255, b + brightness));
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

let analysis;
let embedding = null;
let sameScore = null;
let otherScore = null;

if (kind === 'blank') {
  const rgba = new Uint8Array(width * height * 4);
  rgba.fill(250);
  analysis = analyzeFrame(rgba, width, height);
} else if (kind === 'checker') {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const on = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
      rgba[i] = on ? 20 : 230;
      rgba[i + 1] = on ? 20 : 230;
      rgba[i + 2] = on ? 40 : 230;
      rgba[i + 3] = 255;
    }
  }
  analysis = analyzeFrame(rgba, width, height);
} else {
  const a = paintFace();
  const b = paintFace({ brightness: 18, shiftX: 10, shiftY: -8 });
  const c = paintFace({ skin: [150, 96, 70], eyeDx: 30, eyeY: 0.34, mouthY: 0.76 });
  analysis = analyzeFrame(a, width, height);
  const ea = embeddingFromRgba(a, width, height);
  const eb = embeddingFromRgba(b, width, height);
  const ec = embeddingFromRgba(c, width, height);
  embedding = ea;
  sameScore = cosineSimilarity(ea, eb);
  otherScore = cosineSimilarity(ea, ec);
}

process.stdout.write(
  JSON.stringify({
    hasFace: analysis.hasFace,
    threshold: LOCAL_MATCH_THRESHOLD,
    sameScore,
    otherScore,
    dims: embedding ? embedding.length : 0,
  }),
);

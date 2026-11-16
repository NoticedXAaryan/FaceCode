const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeFrame, cosineSimilarity, embeddingFromRgba, LOCAL_MATCH_THRESHOLD } = require('../logic/facePixels');

function paintFace(width, height, options = {}) {
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

test('blank frames are not faces', () => {
  const rgba = new Uint8Array(80 * 80 * 4);
  rgba.fill(250);
  const analysis = analyzeFrame(rgba, 80, 80);
  assert.equal(analysis.hasFace, false);
  assert.throws(() => embeddingFromRgba(rgba, 80, 80), /No face detected/);
});

test('a textured non-skin image is not a face', () => {
  const width = 120;
  const height = 120;
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
  assert.equal(analyzeFrame(rgba, width, height).hasFace, false);
});

test('the same face matches and a different face does not', () => {
  const width = 160;
  const height = 200;
  const base = embeddingFromRgba(paintFace(width, height), width, height);
  const brighter = embeddingFromRgba(paintFace(width, height, { brightness: 18 }), width, height);
  const shifted = embeddingFromRgba(paintFace(width, height, { shiftX: 10, shiftY: -8 }), width, height);
  const other = embeddingFromRgba(
    paintFace(width, height, { skin: [150, 96, 70], eyeDx: 30, eyeY: 0.34, mouthY: 0.76 }),
    width,
    height,
  );

  const same = cosineSimilarity(base, brighter);
  const moved = cosineSimilarity(base, shifted);
  const different = cosineSimilarity(base, other);
  assert.ok(same > LOCAL_MATCH_THRESHOLD, `same-face score ${same} should clear ${LOCAL_MATCH_THRESHOLD}`);
  assert.ok(moved > LOCAL_MATCH_THRESHOLD, `shifted-face score ${moved} should clear ${LOCAL_MATCH_THRESHOLD}`);
  assert.ok(different < LOCAL_MATCH_THRESHOLD, `different-face score ${different} should miss ${LOCAL_MATCH_THRESHOLD}`);
});

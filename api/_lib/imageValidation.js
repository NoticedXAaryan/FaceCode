import facePixels from '../../logic/facePixels.js';

export async function validateImageHasSubject(imageBase64) {
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

  const analysis = facePixels.analyzeFrame(data, info.width, info.height);
  if (!analysis.hasFace) {
    const error = new Error('No face detected. Center your face in the frame and try again.');
    error.status = 400;
    throw error;
  }
  return true;
}

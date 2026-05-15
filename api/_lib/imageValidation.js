export async function validateImageHasSubject(imageBase64) {
  const normalized = (imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const inputBuffer = Buffer.from(normalized, 'base64');

  const sharp = (await import('sharp')).default;
  const stats = await sharp(inputBuffer).stats();

  const avgStdev =
    stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;

  if (avgStdev < 12) {
    throw new Error('No face detected. Point the camera at your face, not a blank surface.');
  }

  const centerStats = await sharp(inputBuffer)
    .resize(160, 160, { fit: 'cover' })
    .stats();

  const centerStdev =
    centerStats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / centerStats.channels.length;

  if (centerStdev < 14) {
    throw new Error('Center your face in the frame and try again.');
  }

  return true;
}

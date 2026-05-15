import { verifyToken } from '@clerk/backend';

/**
 * Verify a Clerk JWT from the Authorization header.
 * Returns { id, email } on success, or null on failure.
 */
export async function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!payload || !payload.sub) return null;
    return { id: payload.sub, email: payload.email || '' };
  } catch {
    return null;
  }
}

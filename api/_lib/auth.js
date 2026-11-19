import { fromNodeHeaders } from 'better-auth/node';
import { getAuth } from './betterAuth.js';

/**
 * Resolve the signed-in Better Auth user from request cookies / headers.
 */
export async function verifyAuth(req) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user?.id) return null;
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
    };
  } catch {
    return null;
  }
}

export async function deleteAuthUser(headers) {
  try {
    const auth = getAuth();
    await auth.api.deleteUser({
      headers: fromNodeHeaders(headers),
    });
  } catch {
    // FaceTag rows are already removed; auth cleanup can be retried.
  }
}

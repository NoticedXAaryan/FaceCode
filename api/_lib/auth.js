import { createClerkClient, verifyToken } from '@clerk/backend';

let clerk;
const emailCache = new Map();

function clerkClient() {
  if (!process.env.CLERK_SECRET_KEY) return null;
  if (!clerk) clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  return clerk;
}

async function lookupEmail(userId) {
  if (emailCache.has(userId)) return emailCache.get(userId);
  const client = clerkClient();
  if (!client) return '';
  try {
    const user = await client.users.getUser(userId);
    const email =
      user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
    emailCache.set(userId, email);
    return email;
  } catch {
    return '';
  }
}

/**
 * Verify a Clerk session JWT. Email is not always in the token, so we
 * fall back to the Clerk Backend API when CLERK_SECRET_KEY is set.
 */
export async function verifyAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  try {
    const payload = await verifyToken(authHeader.slice(7), {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    if (!payload?.sub) return null;
    let email = payload.email || payload.primary_email_address || '';
    if (!email) email = await lookupEmail(payload.sub);
    return { id: payload.sub, email };
  } catch {
    return null;
  }
}

export async function deleteClerkUser(userId) {
  const client = clerkClient();
  if (!client) return;
  try {
    await client.users.deleteUser(userId);
  } catch {
    // The database row is still removed. Clerk cleanup can be retried.
  }
}

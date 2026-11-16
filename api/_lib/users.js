import sql from './db.js';
import profileLib from '../../logic/profile.js';

const { mergeProfile, hasCompletedProfile } = profileLib;

export async function ensureUser(user) {
  const email = user.email || `${user.id}@users.facetag.local`;
  await sql`
    INSERT INTO users (id, email)
    VALUES (${user.id}, ${email})
    ON CONFLICT (id) DO UPDATE SET
      email = CASE
        WHEN users.email IS NULL OR users.email LIKE '%@users.facetag.local'
        THEN EXCLUDED.email
        ELSE users.email
      END
  `;
}

export async function getProfile(userId) {
  const rows = await sql`
    SELECT id, email, username, full_name, bio, avatar_url, is_public, primary_link_platform
    FROM users WHERE id = ${userId} LIMIT 1
  `;
  return rows[0] || null;
}

export async function getLinks(userId) {
  return sql`
    SELECT platform, url, display_order
    FROM social_links
    WHERE user_id = ${userId}
    ORDER BY display_order
  `;
}

export async function saveProfile(authUser, patch) {
  await ensureUser(authUser);
  const existing = await getProfile(authUser.id);
  let merged;
  try {
    merged = mergeProfile(existing, patch || {}, authUser.email || existing?.email);
  } catch (err) {
    err.status = 400;
    throw err;
  }

  const { profile, links } = merged;
  if (profile.username) {
    const taken = await sql`
      SELECT id FROM users
      WHERE username = ${profile.username} AND id <> ${authUser.id}
      LIMIT 1
    `;
    if (taken.length) {
      const error = new Error('That username is taken');
      error.status = 409;
      throw error;
    }
  }

  await sql`
    UPDATE users SET
      email = ${profile.email},
      full_name = ${profile.full_name},
      username = ${profile.username},
      bio = ${profile.bio},
      is_public = ${profile.is_public},
      primary_link_platform = ${profile.primary_link_platform},
      avatar_url = ${profile.avatar_url}
    WHERE id = ${authUser.id}
  `;

  if (links) {
    await sql`DELETE FROM social_links WHERE user_id = ${authUser.id}`;
    for (let i = 0; i < links.length; i += 1) {
      await sql`
        INSERT INTO social_links (user_id, platform, url, display_order)
        VALUES (${authUser.id}, ${links[i].platform}, ${links[i].url}, ${i})
      `;
    }
  }

  return {
    profile,
    links: links || (await getLinks(authUser.id)),
  };
}

export async function recordEvent({ type, scannerId = null, scannedId, matched = false, platform = null }) {
  try {
    await sql`
      INSERT INTO scan_events (scanner_user_id, scanned_user_id, matched, event_type, platform)
      VALUES (${scannerId}, ${scannedId}, ${Boolean(matched)}, ${type}, ${platform})
    `;
  } catch (err) {
    const message = String(err.message || '');
    if (message.includes('event_type') || message.includes('platform') || message.includes('column')) {
      await sql`
        INSERT INTO scan_events (scanner_user_id, scanned_user_id, matched)
        VALUES (${scannerId}, ${scannedId}, ${Boolean(matched)})
      `;
      return;
    }
    throw err;
  }
}

export { hasCompletedProfile };

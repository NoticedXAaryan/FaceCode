const { validateUsername } = require('./username');

function defined(patch, key) {
  return Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined;
}

function cleanLinks(links) {
  if (!Array.isArray(links)) return null;
  const cleaned = [];
  for (const link of links) {
    const platform = String(link?.platform || '')
      .trim()
      .toLowerCase()
      .slice(0, 40);
    let url = String(link?.url || '').trim();
    if (!platform || !url) continue;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (url.length > 400) continue;
    cleaned.push({ platform, url });
    if (cleaned.length >= 12) break;
  }
  return cleaned;
}

function mergeProfile(existing, patch, email) {
  const next = {
    email: email || existing?.email || null,
    full_name: defined(patch, 'fullName') ? String(patch.fullName || '').trim().slice(0, 80) : existing?.full_name ?? null,
    username: defined(patch, 'username') ? patch.username : existing?.username ?? null,
    bio: defined(patch, 'bio') ? String(patch.bio || '').slice(0, 160) : existing?.bio ?? '',
    is_public: defined(patch, 'isPublic') ? Boolean(patch.isPublic) : existing?.is_public ?? true,
    primary_link_platform: defined(patch, 'primaryLinkPlatform')
      ? patch.primaryLinkPlatform || null
      : existing?.primary_link_platform ?? null,
    avatar_url: defined(patch, 'avatarUrl') ? patch.avatarUrl || null : existing?.avatar_url ?? null,
  };

  if (defined(patch, 'username')) {
    if (!patch.username) {
      next.username = existing?.username ?? null;
    } else {
      const checked = validateUsername(patch.username);
      if (!checked.ok) {
        const error = new Error(checked.error);
        error.code = 'BAD_USERNAME';
        throw error;
      }
      next.username = checked.username;
    }
  }

  const links = defined(patch, 'links') ? cleanLinks(patch.links) : null;
  if (links && !defined(patch, 'primaryLinkPlatform')) {
    const stillThere = links.some((link) => link.platform === next.primary_link_platform);
    if (!stillThere) next.primary_link_platform = links[0]?.platform ?? null;
  }

  return { profile: next, links };
}

function hasCompletedProfile(profile) {
  return Boolean(profile?.username && String(profile.username).trim().length >= 3);
}

module.exports = { mergeProfile, cleanLinks, hasCompletedProfile };

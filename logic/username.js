const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

function validateUsername(value) {
  const username = normalizeUsername(value);
  if (!USERNAME_RE.test(username)) {
    return { ok: false, username, error: 'Username must be 3–20 characters: letters, numbers, underscores.' };
  }
  return { ok: true, username };
}

module.exports = { normalizeUsername, validateUsername };

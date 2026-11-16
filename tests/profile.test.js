const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeProfile, hasCompletedProfile } = require('../logic/profile');
const { routeForStatus } = require('../logic/onboarding');
const { validateUsername, normalizeUsername } = require('../logic/username');

test('partial profile updates keep fields that were not sent', () => {
  const existing = {
    email: 'a@b.co',
    full_name: 'Ava Stone',
    username: 'ava',
    bio: 'hello',
    is_public: true,
    primary_link_platform: 'instagram',
    avatar_url: 'https://cdn.example/a.jpg',
  };
  const { profile, links } = mergeProfile(existing, { isPublic: false }, 'a@b.co');
  assert.equal(profile.is_public, false);
  assert.equal(profile.username, 'ava');
  assert.equal(profile.full_name, 'Ava Stone');
  assert.equal(profile.bio, 'hello');
  assert.equal(profile.avatar_url, 'https://cdn.example/a.jpg');
  assert.equal(links, null);
});

test('username and links are normalized', () => {
  const { profile, links } = mergeProfile(
    null,
    {
      fullName: '  Ava Stone ',
      username: 'Ava Stone!',
      links: [
        { platform: 'Instagram', url: 'instagram.com/ava' },
        { platform: 'website', url: '' },
      ],
    },
    'ava@facetag.app',
  );
  assert.equal(profile.username, 'avastone');
  assert.equal(profile.full_name, 'Ava Stone');
  assert.equal(profile.email, 'ava@facetag.app');
  assert.equal(links.length, 1);
  assert.equal(links[0].url, 'https://instagram.com/ava');
  assert.equal(profile.primary_link_platform, 'instagram');
  assert.equal(hasCompletedProfile(profile), true);
});

test('bad usernames are rejected', () => {
  assert.equal(validateUsername('ab').ok, false);
  assert.equal(validateUsername('good_name').ok, true);
  assert.equal(normalizeUsername('Hi There!'), 'hithere');
  assert.throws(() => mergeProfile(null, { username: 'no' }, 'a@b.co'), /3–20/);
});

test('onboarding route follows face then profile', () => {
  assert.equal(routeForStatus({ hasFace: false, hasProfile: false }), '/enroll');
  assert.equal(routeForStatus({ hasFace: true, hasProfile: false }), '/setup');
  assert.equal(routeForStatus({ hasFace: true, hasProfile: true }), '/(tabs)/scanner');
});

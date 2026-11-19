function routeForStatus(status) {
  if (!status?.hasFace) return '/enroll';
  if (!status?.hasProfile) return '/setup';
  return '/(tabs)/scanner';
}

module.exports = { routeForStatus };

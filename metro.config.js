const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs');

// sharp, Neon, and the Clerk backend SDK ship in this package for Vercel.
// They must not be crawled or bundled into the Expo client.
const serverOnly = [
  /(?:^|[/\\])node_modules[/\\]sharp[/\\]/,
  /(?:^|[/\\])node_modules[/\\]@neondatabase[/\\]serverless[/\\]/,
  /(?:^|[/\\])node_modules[/\\]@clerk[/\\]backend[/\\]/,
];

const currentBlock = config.resolver.blockList;
if (currentBlock instanceof RegExp) {
  config.resolver.blockList = new RegExp(
    `${currentBlock.source}|${serverOnly.map((pattern) => pattern.source).join('|')}`,
  );
} else {
  config.resolver.blockList = serverOnly;
}

function isServerOnly(moduleName) {
  return (
    moduleName === 'sharp' ||
    moduleName === '@neondatabase/serverless' ||
    moduleName === '@clerk/backend' ||
    moduleName.startsWith('@clerk/backend/') ||
    moduleName.startsWith('@neondatabase/serverless/')
  );
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isServerOnly(moduleName)) return { type: 'empty' };
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

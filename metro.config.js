
// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude scripts folder from bundling
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /scripts\/.*/,
];

module.exports = config;


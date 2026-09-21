const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Workaround for Expo SDK 57 tree-shaking bug with NativeWind
// Disables tree-shaking to prevent metro transformer failure
// See: https://github.com/hknakn/expo-treeshake-css-repro
config.experiments = config.experiments || {};
config.experiments.unstableTreeShaking = false;

module.exports = withNativeWind(config, { input: './global.css' });
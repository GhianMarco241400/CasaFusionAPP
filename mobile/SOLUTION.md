# Expo SDK 57 + NativeWind Metro Bundler Error - SOLVED

## Root Cause

The error `TypeError: Cannot read properties of undefined (reading 'transformFile')` in Expo SDK 57 with NativeWind is caused by **two separate issues**:

### Issue 1: Tree-shaking Bug (Upstream - Expo)
Expo SDK 57 has a tree-shaking optimization bug where custom Metro transformers (like NativeWind's CSS transformer) generate unwrapped modules that fail Hermes compilation.

**Affected:** Expo ~57.0.20 with `@expo/metro-config` ~57.0.12 and tree-shaking enabled
**Reference:** https://github.com/hknakn/expo-treeshake-css-repro

### Issue 2: Babel Preset Resolution
NativeWind's Metro wrapper couldn't resolve `babel-preset-expo` from the correct node_modules path, causing Babel configuration failures during transformer initialization.

## Solution

### 1. Update `metro.config.js`

Disable tree-shaking to work around the Expo SDK 57 bug:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Workaround for Expo SDK 57 tree-shaking bug with NativeWind
// Disables tree-shaking to prevent metro transformer failure
// See: https://github.com/hknakn/expo-treeshake-css-repro
config.experiments = config.experiments || {};
config.experiments.unstableTreeShaking = false;

module.exports = withNativeWind(config, { input: './global.css' });
```

### 2. Create `babel.config.js`

Expo requires explicit Babel configuration for transformer initialization:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

### 3. Install `babel-preset-expo` as Dev Dependency

```bash
npm install --save-dev babel-preset-expo@57.0.10
```

This ensures Babel can resolve the preset even when running through the Metro transformer worker.

## What Was Tested

✅ Created a clean Expo SDK 57 project without NativeWind → Metro works  
✅ Confirmed NativeWind is the trigger  
✅ Applied tree-shaking workaround  
✅ Installed missing Babel preset  
✅ Metro bundler now starts successfully  

## Performance Note

Disabling `unstableTreeShaking` reduces bundle optimization but ensures stability. This is a temporary workaround until Expo fixes the tree-shaking serializer plugin in a future release.

## Expected: SDK 57.0.21+

When Expo patches the tree-shaking bug in the reconciliation phase, you can re-enable tree-shaking:

```javascript
config.experiments.unstableTreeShaking = true; // Future: once Expo fixes the bug
```

## Files Modified

- `metro.config.js` — Added tree-shaking workaround
- `babel.config.js` — Created with Babel preset configuration
- `package.json` — Added `babel-preset-expo@57.0.10` as dev dependency

// Expo config plugin: enable CocoaPods modular headers.
//
// GoogleSignin 8.x (pulled in by @react-native-google-signin) brings in AppCheckCore,
// a Swift pod that imports GoogleUtilities + RecaptchaInterop (Obj-C pods). When pods
// build as static libraries (the Expo default), those Obj-C pods must expose module
// maps or the Swift import fails at `pod install`:
//   "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and `RecaptchaInterop`,
//    which do not define modules."
// `use_modular_headers!` generates module maps for all pods while KEEPING the existing
// static-library linkage (no switch to use_frameworks!, which would have a much larger
// blast radius across the React Native / Hermes build).
//
// This runs on every `expo prebuild`, so the fix survives native regeneration (CNG) —
// it is NOT a one-off edit to the generated ios/Podfile.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes('use_modular_headers!')) {
        // Insert at the very start of the app target, before any pods are declared.
        contents = contents.replace(
          '  use_expo_modules!',
          '  use_modular_headers!\n  use_expo_modules!'
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
};

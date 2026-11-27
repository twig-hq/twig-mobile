// Browser build (development only): Skia, which draws the birds, has to load
// its WebAssembly before any app code runs. `require` inside the callback
// bundles the router as usual but only runs it once Skia is ready.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  const { App } = require('expo-router/build/qualified-entry');
  const { renderRootComponent } = require('expo-router/build/renderRootComponent');
  renderRootComponent(App);
});

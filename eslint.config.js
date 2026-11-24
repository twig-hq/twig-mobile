// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Screens and components take colours, fonts and text sizes from the theme
// (src/theme), never as raw values, so light and dark mode and the type scale
// stay in one place.
const useTheTheme = 'Use a token from @/theme instead.';
const noRawStyleValues = [
  {
    selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: `No raw colours. ${useTheTheme}`,
  },
  {
    selector: 'Literal[value=/^(?:rgba?|hsla?)\\(/]',
    message: `No raw colours. ${useTheTheme}`,
  },
  {
    selector: 'Property[key.name=/^(?:fontSize|lineHeight|fontFamily|fontWeight)$/] > Literal',
    message: `No raw font values. Use a text style from @/theme (theme.text).`,
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'scripts/db-test/*', 'docs/design/*', 'src/lib/database.types.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': ['error', ...noRawStyleValues],
    },
  },
]);

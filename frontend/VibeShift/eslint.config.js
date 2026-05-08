// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ...expoConfig,
    rules: {
      ...expoConfig.rules,
      'react-native/no-raw-text': 'off',
      'react-native-text-watcher/no-raw-text': 'off',
    },
  },
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
]);

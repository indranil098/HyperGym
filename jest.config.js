module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-reanimated|react-native-worklets|react-native-gesture-handler|react-native-liquid-glassmorphism)/)',
  ],
};

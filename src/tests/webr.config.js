module.exports = {
  transform: { '^.+\\.ts?$': 'ts-jest' },
  testEnvironment: 'node',
  testRegex: '/tests/(?!packages).*/.*\\.(test|spec)?\\.(ts|tsx)$',
  testTimeout: 15000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
};

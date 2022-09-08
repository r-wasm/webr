module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'google',
    './node_modules/gts',
    'plugin:jest/recommended',
  ],
  parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      tsconfigRootDir: __dirname,
      project: ['./tsconfig.json'],
  },
  ignorePatterns: ['.eslintrc.js', 'pre.js', 'esbuild.js', 'jest.config.js'],
  plugins: ['@typescript-eslint', 'jest'],
  rules: {
     "@typescript-eslint/no-explicit-any": "off",
     "@typescript-eslint/no-unsafe-member-access": "off",
     "@typescript-eslint/no-unsafe-call": "off",
     "@typescript-eslint/no-unsafe-return": "off",
     "@typescript-eslint/require-await": "off",
     "@typescript-eslint/no-floating-promises": "off",
     "@typescript-eslint/no-unused-vars": "off",
     "@typescript-eslint/no-implied-eval": "off",
     "new-cap": ["error", { "capIsNewExceptions": ["UTF8ToString"] }],
     "require-jsdoc": "off",
     'prettier/prettier': [
       'error',
       { singleQuote: true, 'printWidth': 100},
     ]
  }
};

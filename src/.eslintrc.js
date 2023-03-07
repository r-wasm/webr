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
    'plugin:jsdoc/recommended',
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
  plugins: ['@typescript-eslint', 'jest', 'jsdoc'],
  rules: {
     "@typescript-eslint/no-explicit-any": "off",
     "@typescript-eslint/no-unsafe-member-access": "off",
     "@typescript-eslint/no-unsafe-call": "off",
     "@typescript-eslint/no-unsafe-return": "off",
     "@typescript-eslint/require-await": "off",
     "@typescript-eslint/no-floating-promises": "off",
     "@typescript-eslint/no-unused-vars": "off",
     "@typescript-eslint/no-implied-eval": "off",
     "@typescript-eslint/semi": ["error", "always"],
     "new-cap": ["error", { "capIsNewExceptions": ["UTF8ToString"] }],
     "require-jsdoc": "off", // Built-in jsdoc support is deprecated, use jsdoc plugin instead
     "valid-jsdoc": "off",
     "jsdoc/require-jsdoc": "off",
     "jsdoc/newline-after-description": "off",
     "jsdoc/no-multi-asterisks": ["error" | "warn", { "allowWhitespace": true }],
     'prettier/prettier': 0
  },
  settings: {
    jsdoc: {
      ignorePrivate: true,
      ignoreInternal: true,
      tagNamePreference: {
        "typeParam": "typeParam",
      }
    }
  }
};

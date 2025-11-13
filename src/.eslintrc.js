module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:jsdoc/recommended",
    "plugin:jest/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  ignorePatterns: [
    ".eslintrc.js",
    "pre.js",
    "esbuild.js",
    "jest.config.js",
    "tests/webr.config.js",
    "tests/scripts/proxy-worker.worker.js",
    "tests/packages.config.js",
    "tests/module"
  ],
  plugins: ["@typescript-eslint", "jest", "jsdoc", "react"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-implied-eval": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/semi": ["error", "always"],
    "new-cap": ["error", { capIsNewExceptions: ["UTF8ToString"] }],
    "require-jsdoc": "off", // Built-in jsdoc support is deprecated, use jsdoc plugin instead
    "valid-jsdoc": "off",
    "jsdoc/require-jsdoc": "off",
  },
  settings: {
    jsdoc: {
      ignorePrivate: true,
      ignoreInternal: true,
      tagNamePreference: {
        typeParam: "typeParam",
      },
    },
  },
};

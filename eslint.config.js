import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
  // Global ignores
  { ignores: ["dist", "build", "coverage", "node_modules"] },

  // Base JS rules for all files
  js.configs.recommended,

  // 1) .d.ts files
  {
    files: ["**/*.d.ts"],
    languageOptions: { parser: tseslint.parser },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },

  // 2) APP code (TYPED) — uses tsconfig.app.json
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "**/*.d.ts"],
  })),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "**/*.d.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.app.json"],
        tsconfigRootDir: process.cwd(),
      },
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "no-void": ["error", { allowAsStatement: true }],
      "@typescript-eslint/no-floating-promises": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "warn",
      "prettier/prettier": "warn",
    },
  },
  prettierConfig,

  // 3) TESTS (NON-TYPED) — without parserOptions.project
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.test.{ts,tsx}"],
  })),
  {
    files: ["src/**/*.test.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "testing-library": testingLibrary,
      "jest-dom": jestDom,
      prettier,
    },
    rules: {
      ...testingLibrary.configs["flat/react"].rules,
      ...jestDom.configs["flat/recommended"].rules,
      "@typescript-eslint/no-explicit-any": "off",
      "testing-library/no-node-access": "warn",
      "prettier/prettier": "warn",
    },
  },

  // 4) Node/TS config files (TYPED) — uses tsconfig.node.json
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["vite.config.ts", "vitest.config.ts"],
  })),
  {
    files: ["vite.config.ts", "vitest.config.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.node.json"],
        tsconfigRootDir: process.cwd(),
      },
      ecmaVersion: 2020,
      globals: globals.node,
    },
    plugins: { prettier },
    rules: {
      "prettier/prettier": "warn",
    },
  },

  // 5) Pure JS config files - without TS parser
  {
    files: ["*.config.js", "commitlint.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: globals.node,
    },
    plugins: { prettier },
    rules: {
      "prettier/prettier": "warn",
    },
  },
]);

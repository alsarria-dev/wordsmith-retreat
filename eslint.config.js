/**
 * @file ESLint configuration — flat config format (ESLint 9+).
 *
 * This is the modern `eslint.config.js` format, not the legacy `.eslintrc.*`.
 * ESLint 10 removed eslintrc support entirely, so there is no going back.
 *
 * `npm run lint` runs with `--max-warnings 0`, meaning **a warning fails the
 * build**. Anything enabled here is effectively an error.
 *
 * The rule most likely to surprise you is `react-hooks/set-state-in-effect`,
 * part of the React Compiler rule set that ships in eslint-plugin-react-hooks
 * v7. It rejects calling setState synchronously from an effect — including
 * indirectly, through a helper defined in component scope. It cannot see through
 * an `await`. The working pattern is to keep fetch helpers at module scope with
 * no setState inside, and set state in the effect's `.then()`.
 *
 * Note there is no `eslint-plugin-react`: it has no ESLint 10 support, and on
 * React 19's JSX runtime most of its rules were redundant here.
 */

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
]);

import globals from "globals";
import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";

export default [
  {
    // Skip generated / vendored output.
    ignores: ["dist/**", "**/node_modules/**", "**/*.min.js"],
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },

      // This is browser code (client-side rendered React).
      globals: {
        ...globals.browser,
        ...globals.es2025,
      },
    },

    plugins: {
      react: react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      prettier: prettier,
    },

    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,
      // Rules of Hooks + exhaustive-deps
      ...reactHooks.configs.recommended.rules,

      // Mark identifiers used only inside JSX as "used" so no-unused-vars
      // doesn't flag imported components (ESLint 9 isn't JSX-aware on its own).
      "react/jsx-uses-vars": "error",

      // Vite fast-refresh hygiene: components should be the only export.
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      indent: ["error", 2, { SwitchCase: 1 }],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "no-console": 0,

      // Prettier integration - runs Prettier through ESLint.
      "prettier/prettier": [
        "error",
        {
          endOfLine: "auto",
          trailingComma: "es5",
          singleQuote: false,
        },
      ],
    },
  },
  eslintConfigPrettier,
];

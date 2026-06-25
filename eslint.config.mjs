import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "out/**",
      "dist/**",
      "coverage/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: [
      "app/**/*.ts",
      "app/**/*.tsx",
      "hooks/**/*.ts",
      "hooks/**/*.tsx",
      "lib/**/*.ts",
      "components/**/*.tsx",
      "tests/**/*.ts",
    ],
  },
];

export default [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "**/*.ts", "**/*.tsx"] },
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { console: "readonly", module: "readonly", process: "readonly" },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
    },
  },
];

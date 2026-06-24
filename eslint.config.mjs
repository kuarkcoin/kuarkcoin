export default [
  { ignores: [".next/**", "node_modules/**"] },
  { files: ["scripts/lint-placeholder.js"], rules: { "no-unused-vars": "error" } },
];

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated / tooling output (not authored source)
    "android/**",
    "coverage/**",
  ]),
  // Legacy Node scripts and Jest CJS setups use require()
  {
    files: ["scripts/**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Allow require(), unused vars, and any types in test files for module mocking and fixtures
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/jest.setup.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Allow any in API layer files that interact with dynamic external data
  {
    files: [
      "src/app/**/*.tsx",
      "src/app/**/*.ts",
      "src/lib/**/*.ts",
      "src/components/**/*.tsx",
      "src/contexts/**/*.tsx",
      "src/hooks/**/*.ts",
      "src/proxy.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;

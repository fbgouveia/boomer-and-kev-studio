import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // As <img> do Studio exibem data URIs de upload/geração e assets locais de
    // referência: next/image não otimiza data URI e exigiria unoptimized em todas.
    rules: { "@next/next/no-img-element": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "find-model.js",
    "docs/archive/**"
  ]),
]);

export default eslintConfig;

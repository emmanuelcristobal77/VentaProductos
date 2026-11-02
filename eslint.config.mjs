import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      "arranque/**",
      ".claude/**",
      ".specify/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "src/db/migraciones/**",
      "next-env.d.ts",
    ],
  },
];

export default config;

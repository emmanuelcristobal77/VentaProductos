import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/esquema.ts",
  out: "./src/db/migraciones",
});

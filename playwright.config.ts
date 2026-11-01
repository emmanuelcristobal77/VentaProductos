import { defineConfig, devices } from "@playwright/test";
import { crearHash } from "./src/lib/contrasena";

export const USUARIO_E2E = "vendedor";
export const CONTRASENA_E2E = "contrasena-de-prueba";
const PUERTO = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: { baseURL: `http://localhost:${PUERTO}`, trace: "retain-on-failure", locale: "es-MX" },
  projects: [
    { name: "movil", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: "portatil", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: `npm run build && npx tsx scripts/preparar-e2e.ts && npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATOS_DIR: "./datos/e2e",
      ADMIN_USUARIO: USUARIO_E2E,
      ADMIN_HASH_CONTRASENA: crearHash(CONTRASENA_E2E),
      SESION_SECRETO: "secreto-de-prueba-con-al-menos-32-caracteres",
      IP_SAL: "sal-de-prueba",
      TELEFONO_NEGOCIO: "5512345678",
    },
  },
});

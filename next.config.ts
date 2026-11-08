import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // Solo en desarrollo: IP de la laptop para probar desde el celular en la misma red, por ejemplo 192.168.0.16.
  allowedDevOrigins: process.env.ORIGENES_DESARROLLO?.split(",").map((o) => o.trim()).filter(Boolean),
};

export default config;

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const LONGITUD = 64;

export function crearHash(contrasena: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(contrasena, sal, LONGITUD).toString("hex");
  return `scrypt:${sal}:${hash}`;
}

export function verificarContrasena(contrasena: string, guardado: string): boolean {
  const [esquema, sal, hash] = guardado.split(":");
  if (esquema !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(contrasena, sal, LONGITUD);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

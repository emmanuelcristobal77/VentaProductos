import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { obtenerBd } from "@/db/cliente";
import { limiteIntentos } from "@/db/esquema";
import { ErrorNegocio } from "./resultado";

const VENTANA_MS = 15 * 60 * 1000;
const LIMITES = { sesion: 5, consulta: 10 } as const;

export type AccionLimitada = keyof typeof LIMITES;

function clave(accion: AccionLimitada, ip: string) {
  const hash = createHash("sha256").update(`${process.env.IP_SAL}:${ip}`).digest("hex");
  return `${accion}:${hash}`;
}

function intentosVigentes(accion: AccionLimitada, ip: string, ahora: number): number {
  const fila = obtenerBd()
    .select()
    .from(limiteIntentos)
    .where(eq(limiteIntentos.clave, clave(accion, ip)))
    .get();
  if (!fila || ahora - Date.parse(fila.ventanaInicia) >= VENTANA_MS) return 0;
  return fila.intentos;
}

export function exigirIntentoDisponible(accion: AccionLimitada, ip: string, ahora = Date.now()) {
  if (intentosVigentes(accion, ip, ahora) >= LIMITES[accion]) {
    throw new ErrorNegocio("DEMASIADOS_INTENTOS");
  }
}

export function registrarIntento(accion: AccionLimitada, ip: string, ahora = Date.now()) {
  const intentos = intentosVigentes(accion, ip, ahora);
  const valores = {
    clave: clave(accion, ip),
    intentos: intentos + 1,
    ventanaInicia: new Date(ahora).toISOString(),
  };
  obtenerBd()
    .insert(limiteIntentos)
    .values(valores)
    .onConflictDoUpdate({
      target: limiteIntentos.clave,
      set: intentos === 0 ? valores : { intentos: valores.intentos },
    })
    .run();
}

export function limpiarIntentos(accion: AccionLimitada, ip: string) {
  obtenerBd().delete(limiteIntentos).where(eq(limiteIntentos.clave, clave(accion, ip))).run();
}

/** Traefik, el proxy de Easypanel, entrega la IP real; la última entrada es la que él agregó. */
export function ipDesdeEncabezados(encabezados: Headers): string {
  const real = encabezados.get("x-real-ip");
  if (real) return real;
  const reenviadas = encabezados.get("x-forwarded-for")?.split(",");
  return reenviadas?.at(-1)?.trim() || "desconocida";
}

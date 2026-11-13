/**
 * Medición anónima de visitas con el Umami del propietario (spec 006, contracts/interfaz.md).
 * Sin `window` ni React, para probarlo con Vitest. No son secretos: el id del sitio queda en el HTML.
 */

export const UMAMI = {
  script: "https://estadisticas.cristobalia.com/script.js",
  idSitio: "49b620b8-b094-49c2-9ff2-edf6ba9d0c38",
  /** FR-003: el script no envía nada desde otro dominio (laptop, pruebas, IP del servidor). */
  dominios: "app.cristobalia.com",
} as const;

/** FR-006: cada toque a un teléfono de contacto de la sección de cliente. */
export const EVENTO_INTERES = "interes-telefono";

/** Nombre global que el script busca con `data-before-send`. */
export const NOMBRE_FILTRO = "antesDeEnviarUmami";

const RUTA_PANEL = /^(https?:\/\/[^/]+)?\/admin(\/|\?|#|$)/;

/**
 * FR-002, research 4: el script se queda en la página aunque se pase al panel sin recargar,
 * así que se descarta cualquier envío cuya URL sea del panel.
 */
export function antesDeEnviarUmami<T>(_tipo: string, carga: T): T | false {
  const url = (carga as { url?: unknown } | null)?.url;
  if (typeof url === "string" && RUTA_PANEL.test(url)) return false;
  return carga;
}

/** La ruta que se envía con el evento: solo `location.pathname`, sin consulta ni `#`. */
export function paginaActual(ruta: string): string {
  return ruta;
}

declare global {
  interface Window {
    umami?: { track: (nombre: string, datos?: Record<string, string>) => unknown };
    antesDeEnviarUmami?: typeof antesDeEnviarUmami;
  }
}

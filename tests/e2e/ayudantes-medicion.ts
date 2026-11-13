import type { Page } from "@playwright/test";
import { UMAMI } from "../../src/lib/estadisticas";

/**
 * Ayudantes de la spec 006. Ninguna prueba carga el Umami real: el script se sustituye por uno
 * falso que guarda las llamadas a `umami.track`, o se bloquea para probar FR-005.
 */

const SCRIPT_FALSO = `
  window.__llamadasUmami = window.__llamadasUmami || [];
  window.umami = { track: function () { window.__llamadasUmami.push(Array.from(arguments)); } };
`;

export async function simularUmami(pagina: Page) {
  await pagina.route(UMAMI.script, (ruta) =>
    ruta.fulfill({ status: 200, contentType: "application/javascript", body: SCRIPT_FALSO }),
  );
}

export async function bloquearUmami(pagina: Page) {
  await pagina.route(UMAMI.script, (ruta) => ruta.abort());
}

export async function llamadasUmami(pagina: Page): Promise<unknown[][]> {
  return pagina.evaluate(() => (window as unknown as { __llamadasUmami?: unknown[][] }).__llamadasUmami ?? []);
}

export const scriptUmami = (pagina: Page) => pagina.locator(`script[src="${UMAMI.script}"]`);

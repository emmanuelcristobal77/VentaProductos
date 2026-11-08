import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { zipSync } from "fflate";

export const ENCABEZADO = "nombre|descripcion|categoria|subcategoria|existencia|precio_compra|precio_venta|fotos";

const FIXTURES = path.join(process.cwd(), "tests/fixtures/carga-masiva");
export const foto = (nombre: string) => new Uint8Array(readFileSync(path.join(FIXTURES, nombre)));

/** Renglón válido; `cambios` reemplaza columnas por su nombre. */
export function renglon(nombre: string, cambios: Record<string, string> = {}): string {
  const base: Record<string, string> = {
    nombre,
    descripcion: "Descripción de prueba",
    categoria: "Juguetes",
    subcategoria: "",
    existencia: "5",
    precio_compra: "500.00",
    precio_venta: "990.00",
    fotos: "roja.jpg",
    ...cambios,
  };
  return ENCABEZADO.split("|").map((c) => base[c]).join("|");
}

/** Comprimido con el archivo de productos y las fotos de tests/fixtures/carga-masiva/. */
export function comprimido(renglones: string[], fotos: string[] = ["roja.jpg", "azul.png"]) {
  const entradas: Record<string, Uint8Array> = {
    "productos.txt": new TextEncoder().encode([ENCABEZADO, ...renglones].join("\r\n")),
  };
  for (const nombre of fotos) entradas[nombre] = foto(nombre);
  return { name: "carga.zip", mimeType: "application/zip", buffer: Buffer.from(zipSync(entradas)) };
}

/** Sube un comprimido desde la pantalla de carga masiva y espera el resumen. */
export async function subirCarga(pagina: Page, archivo: ReturnType<typeof comprimido>) {
  await pagina.goto("/admin/productos/carga-masiva");
  await pagina.getByLabel("Comprimido .zip con productos y fotos").setInputFiles(archivo);
  await pagina.getByRole("button", { name: "Subir y procesar" }).click();
  await expect(pagina.getByText(/^Carga del /)).toBeVisible({ timeout: 20_000 });
}

/** Número de una tarjeta del resumen, por su texto. */
export function cantidad(pagina: Page, texto: string) {
  return pagina.getByRole("listitem").filter({ has: pagina.getByText(texto, { exact: true }) }).locator("span").first();
}

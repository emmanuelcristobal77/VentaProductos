import { readFileSync } from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { COLUMNAS } from "@/dominio/carga-masiva";

const FIXTURES = path.join(process.cwd(), "tests/fixtures/carga-masiva");

/** Foto de tests/fixtures/carga-masiva/. */
export const foto = (nombre: "roja.jpg" | "azul.png" | "verde.webp" | "no-es-imagen.jpg") =>
  new Uint8Array(readFileSync(path.join(FIXTURES, nombre)));

/** Arma un .zip en memoria; los textos se guardan en UTF-8. */
export function armarComprimido(entradas: Record<string, Uint8Array | string>): Uint8Array {
  const archivos: Record<string, Uint8Array> = {};
  for (const [nombre, contenido] of Object.entries(entradas)) {
    archivos[nombre] = typeof contenido === "string" ? new TextEncoder().encode(contenido) : contenido;
  }
  return zipSync(archivos);
}

/** Texto del archivo de productos con el encabezado de FR-003. */
export function armarTxt(renglones: string[][], { bom = false, crlf = false } = {}): string {
  const fin = crlf ? "\r\n" : "\n";
  return (bom ? "﻿" : "") + [COLUMNAS.join("|"), ...renglones.map((r) => r.join("|"))].join(fin) + fin;
}

/** Renglón con datos válidos; `cambios` reemplaza columnas por nombre. */
export function renglon(
  nombre: string,
  cambios: Partial<Record<(typeof COLUMNAS)[number], string>> = {},
): string[] {
  const base = {
    nombre,
    descripcion: `Descripción de ${nombre}`,
    categoria: "Juguetes",
    subcategoria: "",
    existencia: "5",
    precio_compra: "100.00",
    precio_venta: "250.50",
    fotos: "roja.jpg",
    ...cambios,
  };
  return COLUMNAS.map((c) => base[c]);
}

const CP850: Record<string, number> = { ñ: 0xa4, Ñ: 0xa5, á: 0xa0, é: 0x82, í: 0xa1, ó: 0xa2, ú: 0xa3 };

/**
 * Comprimido con una entrada cuyo nombre va en CP850 y sin la bandera UTF-8, como lo guarda el
 * Explorador de Windows (research 3). Se arma con un nombre ASCII provisional del mismo largo y
 * luego se reemplazan sus bytes en el encabezado local y en el directorio central.
 */
export function comprimidoConNombreCp850(
  nombre: string,
  contenido: Uint8Array,
  otras: Record<string, Uint8Array | string> = {},
): Uint8Array {
  const provisional = [...nombre].map((c) => (c.charCodeAt(0) < 128 ? c : "_")).join("");
  const datos = armarComprimido({ ...otras, [provisional]: contenido });
  const buscado = new TextEncoder().encode(provisional);
  const reemplazo = Uint8Array.from([...nombre].map((c) => CP850[c] ?? c.charCodeAt(0)));

  let reemplazos = 0;
  for (let i = 0; i <= datos.length - buscado.length; i++) {
    if (buscado.every((b, j) => datos[i + j] === b)) {
      datos.set(reemplazo, i);
      reemplazos++;
    }
  }
  if (reemplazos !== 2) throw new Error(`Se esperaban 2 copias del nombre y hubo ${reemplazos}`);
  return datos;
}

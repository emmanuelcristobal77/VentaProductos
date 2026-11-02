import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import type { Bd } from "@/db/cliente";
import { directorioDatos } from "./entorno";

const DIAS_CONSERVADOS = 14;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const COPIA = /^base\/vende-productos-(\d{4}-\d{2}-\d{2})\.sqlite\.gz$/;

/** Rutas completas dentro del bucket: `base/...` y `fotos/...`. */
export interface AlmacenRespaldo {
  listar(prefijo: "base/" | "fotos/"): Promise<string[]>;
  subir(ruta: string, contenido: Buffer): Promise<void>;
  borrar(rutas: string[]): Promise<void>;
}

const dia = (fecha: Date) => fecha.toISOString().slice(0, 10);

/** `VACUUM INTO` da una copia consistente aunque la app esté escribiendo. */
function copiarBase(bd: Bd): Buffer {
  const carpeta = mkdtempSync(path.join(tmpdir(), "respaldo-"));
  try {
    const destino = path.join(carpeta, "copia.sqlite");
    bd.$client.prepare("VACUUM INTO ?").run(destino);
    return gzipSync(readFileSync(destino));
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

async function subirFotosNuevas(almacen: AlmacenRespaldo) {
  const carpeta = path.join(directorioDatos(), "fotos");
  if (!existsSync(carpeta)) return;

  const respaldadas = new Set(await almacen.listar("fotos/"));
  for (const archivo of readdirSync(carpeta)) {
    const ruta = `fotos/${archivo}`;
    if (!respaldadas.has(ruta)) await almacen.subir(ruta, readFileSync(path.join(carpeta, archivo)));
  }
}

async function borrarCopiasVencidas(almacen: AlmacenRespaldo, ahora: Date) {
  const limite = dia(new Date(ahora.getTime() - DIAS_CONSERVADOS * MS_POR_DIA));
  const vencidas = (await almacen.listar("base/")).filter((ruta) => {
    const fecha = COPIA.exec(ruta)?.[1];
    return fecha !== undefined && fecha < limite;
  });
  if (vencidas.length > 0) await almacen.borrar(vencidas);
}

/** Sube primero lo nuevo: si algo falla, las copias anteriores siguen intactas. */
export async function respaldar(bd: Bd, almacen: AlmacenRespaldo, ahora = new Date()) {
  await almacen.subir(`base/vende-productos-${dia(ahora)}.sqlite.gz`, copiarBase(bd));
  await subirFotosNuevas(almacen);
  await borrarCopiasVencidas(almacen, ahora);
}

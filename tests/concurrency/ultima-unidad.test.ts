import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { abrirBase, aplicarMigraciones, establecerBd, obtenerBd, rutaBase } from "@/db/cliente";
import { categorias, operaciones, productos } from "@/db/esquema";
import { sembrar } from "@/db/semilla";

const ejecutar = promisify(execFile);
const TRABAJADOR = path.join(import.meta.dirname, "trabajador.ts");
const MARGEN_ARRANQUE_MS = 4000;

function compitiendo(productoId: string, salida: number) {
  return ejecutar(process.execPath, ["--import", "tsx", TRABAJADOR, productoId, String(salida)], {
    env: process.env,
  }).then(({ stdout }) => stdout.trim());
}

describe("última unidad", () => {
  let carpeta: string;

  beforeEach(() => {
    carpeta = mkdtempSync(path.join(tmpdir(), "vende-concurrencia-"));
    process.env.DATOS_DIR = carpeta;
    const bd = abrirBase(rutaBase());
    aplicarMigraciones(bd);
    sembrar(bd);
    establecerBd(bd);
  });

  afterEach(() => {
    obtenerBd().$client.close();
    establecerBd(undefined);
    rmSync(carpeta, { recursive: true, force: true });
  });

  it("Caso límite: de dos registros simultáneos, solo uno se completa", { timeout: 30_000 }, async () => {
    const bd = obtenerBd();
    const categoria = bd.select().from(categorias).get()!;
    const producto = bd
      .insert(productos)
      .values({
        nombre: "Última",
        descripcion: "Una sola unidad",
        categoriaId: categoria.id,
        existencia: 1,
        precioCompraCentavos: 100,
        precioVentaCentavos: 200,
      })
      .returning()
      .get();

    const salida = Date.now() + MARGEN_ARRANQUE_MS;
    const resultados = await Promise.all([compitiendo(producto.id, salida), compitiendo(producto.id, salida)]);

    expect(resultados.sort()).toEqual(["SIN_DISPONIBILIDAD", "completada"]);
    expect(bd.select().from(operaciones).all()).toHaveLength(1);
    expect(bd.select().from(productos).get()!.existencia).toBe(0);
  });
});

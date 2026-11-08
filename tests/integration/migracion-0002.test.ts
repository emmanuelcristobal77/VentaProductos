import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { abrirBase, aplicarMigraciones, type Bd } from "@/db/cliente";
import { sembrar } from "@/db/semilla";

const MIGRACIONES = path.join(process.cwd(), "src/db/migraciones");

/** Copia las primeras `cuantas` migraciones para reproducir una base de la spec 003. */
function carpetaHasta(destino: string, cuantas: number) {
  mkdirSync(path.join(destino, "meta"), { recursive: true });
  const diario = JSON.parse(readFileSync(path.join(MIGRACIONES, "meta/_journal.json"), "utf8"));
  const entradas = diario.entries.slice(0, cuantas);
  for (const entrada of entradas) {
    copyFileSync(path.join(MIGRACIONES, `${entrada.tag}.sql`), path.join(destino, `${entrada.tag}.sql`));
  }
  writeFileSync(path.join(destino, "meta/_journal.json"), JSON.stringify({ ...diario, entries: entradas }));
}

describe("migración 0002 (spec 004, research 10)", () => {
  let carpeta: string;
  let bd: Bd;

  beforeEach(() => {
    carpeta = mkdtempSync(path.join(tmpdir(), "vende-migracion-"));
    process.env.DATOS_DIR = carpeta;
    const hasta0001 = path.join(carpeta, "hasta-0001");
    carpetaHasta(hasta0001, 2);
    bd = abrirBase(path.join(carpeta, "prueba.sqlite"));
    aplicarMigraciones(bd, hasta0001);
    sembrar(bd);

    const sqlite = bd.$client;
    const categoria = sqlite.prepare("SELECT id FROM categorias LIMIT 1").get() as { id: string };
    sqlite
      .prepare(
        `INSERT INTO productos (id, nombre, descripcion, categoria_id, existencia, precio_compra_centavos,
           precio_venta_centavos, activo, creado_en, actualizado_en)
         VALUES ('p1', 'Muñeca', 'De trapo', ?, 5, 80000, 125000, 1, '2026-11-01T10:00:00.000Z', '2026-11-01T10:00:00.000Z')`,
      )
      .run(categoria.id);
    sqlite
      .prepare(
        `INSERT INTO articulos_encargo (id, nombre, descripcion, precio_centavos, activo, creado_en, actualizado_en)
         VALUES ('a1', 'Pastel', 'De chocolate', 30000, 1, '2026-11-01T10:00:00.000Z', '2026-11-01T10:00:00.000Z')`,
      )
      .run();
    const foto = sqlite.prepare(
      "INSERT INTO fotos (id, producto_id, articulo_encargo_id, archivo, orden, activo) VALUES (?, ?, ?, ?, ?, 1)",
    );
    foto.run("f1", "p1", null, "uno.jpg", 0);
    foto.run("f2", "p1", null, "dos.jpg", 1);
    foto.run("f3", null, "a1", "tres.jpg", 0);
  });

  afterEach(() => {
    bd.$client.close();
    rmSync(carpeta, { recursive: true, force: true });
  });

  const fotos = () =>
    bd.$client.prepare("SELECT * FROM fotos ORDER BY id").all() as Record<string, unknown>[];

  it("conserva todas las fotos y deja nombre_original en NULL", () => {
    const antes = fotos();
    aplicarMigraciones(bd, MIGRACIONES);

    const despues = fotos();
    expect(despues).toHaveLength(3);
    despues.forEach((fila, i) => expect(fila).toEqual({ ...antes[i], nombre_original: null }));
    expect(bd.$client.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  describe("índice fotos_nombre_original", () => {
    beforeEach(() => aplicarMigraciones(bd, MIGRACIONES));

    const insertar = (id: string, nombreOriginal: string | null) =>
      bd.$client
        .prepare(
          "INSERT INTO fotos (id, producto_id, archivo, orden, activo, nombre_original) VALUES (?, 'p1', ?, 9, 1, ?)",
        )
        .run(id, `${id}.jpg`, nombreOriginal);

    it("rechaza dos fotos del mismo producto con el mismo nombre original", () => {
      insertar("x1", "muñeca.jpg");
      expect(() => insertar("x2", "muñeca.jpg")).toThrow(/UNIQUE constraint failed/);
    });

    it("acepta varias fotos del mismo producto con nombre original nulo", () => {
      insertar("x3", null);
      expect(() => insertar("x4", null)).not.toThrow();
    });
  });
});

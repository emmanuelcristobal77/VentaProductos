import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { abrirBase, aplicarMigraciones, type Bd } from "@/db/cliente";
import { sembrar } from "@/db/semilla";

const MIGRACIONES = path.join(process.cwd(), "src/db/migraciones");

/** Copia las primeras `cuantas` migraciones para reproducir una base de la spec 004. */
function carpetaHasta(destino: string, cuantas: number) {
  mkdirSync(path.join(destino, "meta"), { recursive: true });
  const diario = JSON.parse(readFileSync(path.join(MIGRACIONES, "meta/_journal.json"), "utf8"));
  const entradas = diario.entries.slice(0, cuantas);
  for (const entrada of entradas) {
    copyFileSync(path.join(MIGRACIONES, `${entrada.tag}.sql`), path.join(destino, `${entrada.tag}.sql`));
  }
  writeFileSync(path.join(destino, "meta/_journal.json"), JSON.stringify({ ...diario, entries: entradas }));
}

const TABLAS = ["productos", "fotos", "operaciones", "pagos"] as const;

describe("migración 0003 (spec 005, data-model)", () => {
  let carpeta: string;
  let bd: Bd;

  beforeEach(() => {
    carpeta = mkdtempSync(path.join(tmpdir(), "vende-migracion-"));
    process.env.DATOS_DIR = carpeta;
    const hasta0002 = path.join(carpeta, "hasta-0002");
    carpetaHasta(hasta0002, 3);
    bd = abrirBase(path.join(carpeta, "prueba.sqlite"));
    aplicarMigraciones(bd, hasta0002);
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
      .prepare("INSERT INTO fotos (id, producto_id, archivo, orden, activo) VALUES ('f1', 'p1', 'uno.jpg', 0, 1)")
      .run();
    sqlite
      .prepare(
        `INSERT INTO operaciones (id, tipo, estado, producto_id, cantidad, precio_unitario_centavos,
           cliente_nombre, cliente_nombre_norm, cliente_telefono, creado_en, aviso_informado)
         VALUES ('o1', 'apartado', 'pendiente', 'p1', 1, 125000, 'Ana López', 'ana lopez', '5512345678',
           '2026-11-01T10:00:00.000Z', 1)`,
      )
      .run();
    sqlite
      .prepare("INSERT INTO pagos (id, operacion_id, importe_centavos, fecha) VALUES ('g1', 'o1', 20000, '2026-11-01T10:00:00.000Z')")
      .run();
  });

  afterEach(() => {
    bd.$client.close();
    rmSync(carpeta, { recursive: true, force: true });
  });

  const filas = (tabla: string) => bd.$client.prepare(`SELECT * FROM ${tabla} ORDER BY id`).all();

  it("crea la tabla sello_promocional vacía sin cambiar productos, fotos, operaciones ni pagos", () => {
    const antes = Object.fromEntries(TABLAS.map((t) => [t, filas(t)]));
    aplicarMigraciones(bd, MIGRACIONES);

    expect(filas("sello_promocional")).toEqual([]);
    for (const tabla of TABLAS) expect(filas(tabla)).toEqual(antes[tabla]);
    expect(bd.$client.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  describe("restricciones de sello_promocional", () => {
    beforeEach(() => aplicarMigraciones(bd, MIGRACIONES));

    const insertar = (id: number, texto: string, color: string, activo: number) =>
      bd.$client
        .prepare("INSERT INTO sello_promocional (id, texto, color, activo, actualizado_en) VALUES (?, ?, ?, ?, ?)")
        .run(id, texto, color, activo, "2026-11-11T10:00:00.000Z");

    it("acepta la fila id = 1", () => {
      expect(() => insertar(1, "Buen Fin", "rojo", 1)).not.toThrow();
    });

    it("rechaza una fila con id = 2", () => {
      expect(() => insertar(2, "Buen Fin", "rojo", 1)).toThrow(/CHECK constraint failed/);
    });

    it("FR-005: rechaza un color fuera de la lista", () => {
      expect(() => insertar(1, "Buen Fin", "morado", 1)).toThrow(/CHECK constraint failed/);
    });

    it("FR-003: rechaza activar con solo espacios", () => {
      expect(() => insertar(1, "  ", "rojo", 1)).toThrow(/CHECK constraint failed/);
    });

    it("data-model: rechaza más de 400 bytes", () => {
      expect(() => insertar(1, "a".repeat(401), "rojo", 0)).toThrow(/CHECK constraint failed/);
    });
  });
});

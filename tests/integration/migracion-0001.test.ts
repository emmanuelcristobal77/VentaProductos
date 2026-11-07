import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { abrirBase, aplicarMigraciones, type Bd } from "@/db/cliente";
import { sembrar } from "@/db/semilla";

const MIGRACIONES = path.join(process.cwd(), "src/db/migraciones");

/** Copia solo la migración 0000 para reproducir una base de la spec 001 (research 4). */
function carpetaSolo0000(destino: string) {
  mkdirSync(path.join(destino, "meta"), { recursive: true });
  const diario = JSON.parse(readFileSync(path.join(MIGRACIONES, "meta/_journal.json"), "utf8"));
  const primera = diario.entries[0];
  copyFileSync(path.join(MIGRACIONES, `${primera.tag}.sql`), path.join(destino, `${primera.tag}.sql`));
  writeFileSync(path.join(destino, "meta/_journal.json"), JSON.stringify({ ...diario, entries: [primera] }));
}

describe("migración 0001 (spec 003, research 4)", () => {
  let carpeta: string;
  let bd: Bd;

  beforeEach(() => {
    carpeta = mkdtempSync(path.join(tmpdir(), "vende-migracion-"));
    process.env.DATOS_DIR = carpeta;
    const solo0000 = path.join(carpeta, "solo-0000");
    carpetaSolo0000(solo0000);
    bd = abrirBase(path.join(carpeta, "prueba.sqlite"));
    aplicarMigraciones(bd, solo0000);
    sembrar(bd);
  });

  afterEach(() => {
    bd.$client.close();
    rmSync(carpeta, { recursive: true, force: true });
  });

  function sembrarOperacionesDeLa001() {
    const sqlite = bd.$client;
    const categoria = sqlite.prepare("SELECT id FROM categorias LIMIT 1").get() as { id: string };
    sqlite
      .prepare(
        `INSERT INTO productos (id, nombre, descripcion, categoria_id, existencia, precio_compra_centavos,
           precio_venta_centavos, activo, creado_en, actualizado_en)
         VALUES ('p1', 'Muñeca', 'De trapo', ?, 5, 80000, 125000, 1, '2026-11-01T10:00:00.000Z', '2026-11-01T10:00:00.000Z')`,
      )
      .run(categoria.id);
    const operacion = sqlite.prepare(
      `INSERT INTO operaciones (id, tipo, estado, producto_id, cantidad, precio_unitario_centavos,
         cliente_nombre, cliente_nombre_norm, cliente_telefono, creado_en)
       VALUES (?, ?, ?, 'p1', 1, 125000, ?, ?, ?, ?)`,
    );
    operacion.run("a1", "apartado", "pendiente", "Ana López", "ana lopez", "5512345678", "2026-11-02T10:00:00.000Z");
    operacion.run("e1", "encargo", "pendiente", "Luis Pérez", "luis perez", "5587654321", "2026-11-03T10:00:00.000Z");
    operacion.run("v1", "venta", "pagada", null, null, null, "2026-11-04T10:00:00.000Z");
    const pago = sqlite.prepare(
      "INSERT INTO pagos (id, operacion_id, importe_centavos, fecha) VALUES (?, ?, ?, ?)",
    );
    pago.run("g1", "a1", 20000, "2026-11-02T10:00:00.000Z");
    pago.run("g2", "a1", 30000, "2026-11-03T11:00:00.000Z");
    pago.run("g3", "e1", 10000, "2026-11-03T10:00:00.000Z");
    pago.run("g4", "v1", 125000, "2026-11-04T10:00:00.000Z");
  }

  const filas = (tabla: string) =>
    bd.$client.prepare(`SELECT * FROM ${tabla} ORDER BY id`).all() as Record<string, unknown>[];

  it("conserva todas las operaciones y pagos, y deja los datos nuevos en NULL", () => {
    sembrarOperacionesDeLa001();
    const operacionesAntes = filas("operaciones");
    const pagosAntes = filas("pagos");

    aplicarMigraciones(bd, MIGRACIONES);

    const operacionesDespues = filas("operaciones");
    expect(operacionesDespues).toHaveLength(3);
    expect(filas("pagos")).toEqual(pagosAntes);
    operacionesDespues.forEach((fila, i) => {
      expect(fila).toEqual({ ...operacionesAntes[i], aviso_informado: null, datos_borrados_en: null });
    });
    expect(bd.$client.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  describe("restricciones nuevas", () => {
    beforeEach(() => {
      sembrarOperacionesDeLa001();
      aplicarMigraciones(bd, MIGRACIONES);
    });

    const insertar = (valores: string) =>
      bd.$client
        .prepare(
          `INSERT INTO operaciones (id, tipo, estado, producto_id, cantidad, precio_unitario_centavos,
             cliente_nombre, cliente_nombre_norm, cliente_telefono, aviso_informado, datos_borrados_en, creado_en)
           VALUES ${valores}`,
        )
        .run();

    it("operaciones_datos_borrados: rechaza datos borrados que conservan el nombre", () => {
      expect(() =>
        insertar(
          `('x1', 'apartado', 'pendiente', 'p1', 1, 100, 'Ana', 'ana', NULL, 1, '2026-11-06T10:00:00.000Z', '2026-11-06T10:00:00.000Z')`,
        ),
      ).toThrow(/CHECK constraint failed/);
    });

    it("operaciones_aviso: rechaza datos del cliente con la constancia en 0", () => {
      expect(() =>
        insertar(
          `('x2', 'apartado', 'pendiente', 'p1', 1, 100, 'Ana', 'ana', '5512345678', 0, NULL, '2026-11-06T10:00:00.000Z')`,
        ),
      ).toThrow(/CHECK constraint failed/);
    });

    it("operaciones_cliente: acepta un apartado con los datos borrados", () => {
      expect(() =>
        insertar(
          `('x3', 'apartado', 'pendiente', 'p1', 1, 100, NULL, NULL, NULL, 1, '2026-11-06T10:00:00.000Z', '2026-11-06T10:00:00.000Z')`,
        ),
      ).not.toThrow();
    });

    it("operaciones_cliente: sigue rechazando un apartado sin datos ni borrado", () => {
      expect(() =>
        insertar(
          `('x4', 'apartado', 'pendiente', 'p1', 1, 100, NULL, NULL, NULL, 1, NULL, '2026-11-06T10:00:00.000Z')`,
        ),
      ).toThrow(/CHECK constraint failed/);
    });
  });
});

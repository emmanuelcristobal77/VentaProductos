import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach } from "vitest";
import { abrirBase, aplicarMigraciones, establecerBd, obtenerBd } from "@/db/cliente";
import { operaciones, productos, categorias, fotos } from "@/db/esquema";
import { sembrar } from "@/db/semilla";

export function usarBaseTemporal() {
  let carpeta: string;

  beforeEach(() => {
    carpeta = mkdtempSync(path.join(tmpdir(), "vende-productos-"));
    process.env.DATOS_DIR = carpeta;
    process.env.IP_SAL = "sal-de-prueba";
    const bd = abrirBase(path.join(carpeta, "prueba.sqlite"));
    aplicarMigraciones(bd);
    sembrar(bd);
    establecerBd(bd);
  });

  afterEach(() => {
    obtenerBd().$client.close();
    establecerBd(undefined);
    rmSync(carpeta, { recursive: true, force: true });
  });
}

export function categoriaPorNombre(nombre: string) {
  const fila = obtenerBd().select().from(categorias).all().find((c) => c.nombre === nombre);
  if (!fila) throw new Error(`Categoría no encontrada: ${nombre}`);
  return fila;
}

export function crearProductoDirecto(valores: Partial<typeof productos.$inferInsert> = {}) {
  const bd = obtenerBd();
  const producto = bd
    .insert(productos)
    .values({
      nombre: "Muñeca",
      descripcion: "Muñeca de trapo",
      categoriaId: categoriaPorNombre("Juguetes").id,
      existencia: 5,
      precioCompraCentavos: 80000,
      precioVentaCentavos: 125000,
      ...valores,
    })
    .returning()
    .get();
  bd.insert(fotos).values({ productoId: producto.id, archivo: "foto.jpg", orden: 0 }).run();
  return producto;
}

export function crearOperacionDirecta(valores: Partial<typeof operaciones.$inferInsert>) {
  return obtenerBd()
    .insert(operaciones)
    .values({
      tipo: "apartado",
      estado: "pendiente",
      cantidad: 1,
      precioUnitarioCentavos: 125000,
      clienteNombre: "Ana López",
      clienteNombreNorm: "ana lopez",
      clienteTelefono: "5512345678",
      ...valores,
    })
    .returning()
    .get();
}

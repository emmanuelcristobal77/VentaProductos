import { and, desc, eq, type SQL } from "drizzle-orm";
import { obtenerBd } from "@/db/cliente";
import { articulosEncargo, categorias, productos, subcategorias } from "@/db/esquema";
import { unidadesDisponibles } from "./disponibilidad";
import { fotosPorArticulo, fotosPorProducto } from "./fotos";
import type { FiltroProductos } from "./admin";

/*
 * Consultas de la sección de cliente. Las columnas se eligen una por una:
 * el precio de compra nunca debe aparecer aquí (FR-003).
 */
const seleccion = {
  id: productos.id,
  nombre: productos.nombre,
  descripcion: productos.descripcion,
  categoria: categorias.nombre,
  subcategoria: subcategorias.nombre,
  precioVentaCentavos: productos.precioVentaCentavos,
  disponible: unidadesDisponibles,
};

function consultar(condicion: SQL | undefined) {
  const filas = obtenerBd()
    .select(seleccion)
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .leftJoin(subcategorias, eq(productos.subcategoriaId, subcategorias.id))
    .where(condicion)
    .orderBy(desc(productos.creadoEn))
    .all();
  const fotos = fotosPorProducto(filas.map((f) => f.id));
  return filas.map((fila) => ({
    ...fila,
    fotos: fotos.get(fila.id) ?? [],
    agotado: fila.disponible <= 0,
  }));
}

export function listarCatalogo({ categoriaId, subcategoriaId }: FiltroProductos) {
  return consultar(
    and(
      eq(productos.activo, true),
      categoriaId ? eq(productos.categoriaId, categoriaId) : undefined,
      subcategoriaId ? eq(productos.subcategoriaId, subcategoriaId) : undefined,
    ),
  );
}

export function obtenerProducto(id: string) {
  return consultar(and(eq(productos.id, id), eq(productos.activo, true)))[0] ?? null;
}

export function listarArticulosEncargo() {
  const filas = obtenerBd()
    .select({
      id: articulosEncargo.id,
      nombre: articulosEncargo.nombre,
      descripcion: articulosEncargo.descripcion,
      precioCentavos: articulosEncargo.precioCentavos,
    })
    .from(articulosEncargo)
    .where(eq(articulosEncargo.activo, true))
    .orderBy(desc(articulosEncargo.creadoEn))
    .all();
  const fotos = fotosPorArticulo(filas.map((f) => f.id));
  return filas.map((fila) => ({ ...fila, fotos: fotos.get(fila.id) ?? [] }));
}

export type ProductoPublico = ReturnType<typeof listarCatalogo>[number];

import { and, desc, eq, type SQL } from "drizzle-orm";
import { obtenerBd } from "@/db/cliente";
import { categorias, productos, subcategorias } from "@/db/esquema";
import { unidadesDisponibles } from "./disponibilidad";
import { fotosPorProducto } from "./fotos";

export interface FiltroProductos {
  categoriaId?: string;
  subcategoriaId?: string;
}

const seleccion = {
  id: productos.id,
  nombre: productos.nombre,
  descripcion: productos.descripcion,
  categoriaId: productos.categoriaId,
  subcategoriaId: productos.subcategoriaId,
  categoria: categorias.nombre,
  subcategoria: subcategorias.nombre,
  existencia: productos.existencia,
  disponible: unidadesDisponibles,
  precioCompraCentavos: productos.precioCompraCentavos,
  precioVentaCentavos: productos.precioVentaCentavos,
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
  return filas.map((fila) => ({ ...fila, fotos: fotos.get(fila.id) ?? [] }));
}

export function listarProductosAdmin({ categoriaId, subcategoriaId }: FiltroProductos) {
  return consultar(
    and(
      eq(productos.activo, true),
      categoriaId ? eq(productos.categoriaId, categoriaId) : undefined,
      subcategoriaId ? eq(productos.subcategoriaId, subcategoriaId) : undefined,
    ),
  );
}

export function obtenerProductoAdmin(id: string) {
  return consultar(and(eq(productos.id, id), eq(productos.activo, true)))[0] ?? null;
}

export type ProductoAdmin = ReturnType<typeof listarProductosAdmin>[number];

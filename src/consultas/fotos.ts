import { and, asc, eq, inArray } from "drizzle-orm";
import { obtenerBd } from "@/db/cliente";
import { fotos } from "@/db/esquema";

export function fotosPorProducto(ids: string[]): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  if (ids.length === 0) return mapa;

  const filas = obtenerBd()
    .select({ productoId: fotos.productoId, archivo: fotos.archivo })
    .from(fotos)
    .where(and(inArray(fotos.productoId, ids), eq(fotos.activo, true)))
    .orderBy(asc(fotos.orden))
    .all();
  for (const { productoId, archivo } of filas) {
    if (productoId) mapa.set(productoId, [...(mapa.get(productoId) ?? []), archivo]);
  }
  return mapa;
}

export function fotosPorArticulo(ids: string[]): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  if (ids.length === 0) return mapa;

  const filas = obtenerBd()
    .select({ articuloId: fotos.articuloEncargoId, archivo: fotos.archivo })
    .from(fotos)
    .where(and(inArray(fotos.articuloEncargoId, ids), eq(fotos.activo, true)))
    .orderBy(asc(fotos.orden))
    .all();
  for (const { articuloId, archivo } of filas) {
    if (articuloId) mapa.set(articuloId, [...(mapa.get(articuloId) ?? []), archivo]);
  }
  return mapa;
}

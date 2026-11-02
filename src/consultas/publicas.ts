import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { obtenerBd } from "@/db/cliente";
import {
  articulosEncargo,
  categorias,
  operaciones,
  pagos,
  productos,
  subcategorias,
} from "@/db/esquema";
import { calcularTotal } from "@/dominio/dinero";
import { normalizarNombre, normalizarTelefono } from "@/dominio/normalizacion";
import { unidadesDisponibles } from "./disponibilidad";
import { fotosPorArticulo, fotosPorProducto } from "./fotos";
import { pagadoCentavos } from "./saldos";
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

/** Apartados y encargos de quien coincide en nombre y teléfono; nunca ventas (FR-035). */
export function consultarOperacionesCliente(nombre: string, telefono: string) {
  const digitos = normalizarTelefono(telefono);
  if (!digitos) return [];

  const bd = obtenerBd();
  const filas = bd
    .select({
      id: operaciones.id,
      tipo: operaciones.tipo,
      estado: operaciones.estado,
      articulo: sql<string>`coalesce(${productos.nombre}, ${articulosEncargo.nombre})`,
      cantidad: operaciones.cantidad,
      precioUnitarioCentavos: operaciones.precioUnitarioCentavos,
      pagadoCentavos,
    })
    .from(operaciones)
    .leftJoin(productos, eq(operaciones.productoId, productos.id))
    .leftJoin(articulosEncargo, eq(operaciones.articuloEncargoId, articulosEncargo.id))
    .where(
      and(
        inArray(operaciones.tipo, ["apartado", "encargo"]),
        eq(operaciones.clienteTelefono, digitos),
        eq(operaciones.clienteNombreNorm, normalizarNombre(nombre)),
      ),
    )
    .orderBy(desc(operaciones.creadoEn))
    .all();

  return filas.map((fila) => {
    const totalCentavos = calcularTotal(fila.precioUnitarioCentavos, fila.cantidad);
    return {
      ...fila,
      totalCentavos,
      saldoCentavos: fila.estado === "cancelado" ? null : totalCentavos - fila.pagadoCentavos,
      pagos: bd
        .select({ id: pagos.id, importeCentavos: pagos.importeCentavos, fecha: pagos.fecha })
        .from(pagos)
        .where(and(eq(pagos.operacionId, fila.id), isNull(pagos.anuladoEn)))
        .orderBy(asc(pagos.fecha))
        .all(),
    };
  });
}

export type OperacionCliente = ReturnType<typeof consultarOperacionesCliente>[number];

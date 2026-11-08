import { and, eq, inArray } from "drizzle-orm";
import { conTransaccion, type Conexion } from "@/db/cliente";
import { operaciones, productos } from "@/db/esquema";
import { ESTADOS_APARTADO_VIGENTE } from "@/dominio/estados";
import { ErrorNegocio } from "@/lib/resultado";
import { unidadesApartadas } from "@/consultas/disponibilidad";
import { resolverCategoria, resolverSubcategoria, type ReferenciaCategoria } from "./categorias";
import { sincronizarFotos } from "./fotos";

export interface DatosProducto {
  nombre: string;
  descripcion: string;
  categoria: ReferenciaCategoria;
  subcategoria: ReferenciaCategoria | null;
  existencia: number;
  precioCompraCentavos: number;
  precioVentaCentavos: number;
  fotos: string[];
}

function columnas(tx: Conexion, datos: DatosProducto) {
  if (datos.fotos.length === 0) throw new ErrorNegocio("FOTO_REQUERIDA");
  return columnasSinFotos(tx, datos);
}

/** Columnas del producto con su categoría y subcategoría resueltas; la usa también la carga masiva. */
export function columnasSinFotos(tx: Conexion, datos: Omit<DatosProducto, "fotos">) {
  const categoria = resolverCategoria(tx, datos.categoria);
  const subcategoria = resolverSubcategoria(tx, categoria.id, datos.subcategoria);
  return {
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    categoriaId: categoria.id,
    subcategoriaId: subcategoria?.id ?? null,
    existencia: datos.existencia,
    precioCompraCentavos: datos.precioCompraCentavos,
    precioVentaCentavos: datos.precioVentaCentavos,
  };
}

/** `nombresOriginales` (archivo → nombre en el comprimido) solo llega desde la carga masiva (spec 004). */
export function crearProducto(datos: DatosProducto, nombresOriginales?: Map<string, string>) {
  return conTransaccion((tx) => {
    const producto = tx
      .insert(productos)
      .values(columnas(tx, datos))
      .returning({ id: productos.id })
      .get();
    sincronizarFotos(tx, "productoId", producto.id, datos.fotos, nombresOriginales);
    return producto;
  });
}

export function actualizarProducto(id: string, datos: DatosProducto) {
  conTransaccion((tx) => {
    const fila = tx
      .select({ apartadas: unidadesApartadas })
      .from(productos)
      .where(eq(productos.id, id))
      .get();
    if (!fila) throw new ErrorNegocio("DATOS_INVALIDOS");
    if (datos.existencia < fila.apartadas) throw new ErrorNegocio("EXISTENCIA_INSUFICIENTE");

    tx.update(productos)
      .set({ ...columnas(tx, datos), actualizadoEn: new Date().toISOString() })
      .where(eq(productos.id, id))
      .run();
    sincronizarFotos(tx, "productoId", id, datos.fotos);
  });
}

export function darDeBajaProducto(id: string) {
  conTransaccion((tx) => {
    const vigente = tx
      .select({ id: operaciones.id })
      .from(operaciones)
      .where(
        and(
          eq(operaciones.productoId, id),
          inArray(operaciones.tipo, ["apartado", "encargo"]),
          inArray(operaciones.estado, [...ESTADOS_APARTADO_VIGENTE]),
        ),
      )
      .get();
    if (vigente) throw new ErrorNegocio("TIENE_DEPENDENCIAS");

    tx.update(productos)
      .set({ activo: false, actualizadoEn: new Date().toISOString() })
      .where(eq(productos.id, id))
      .run();
  });
}

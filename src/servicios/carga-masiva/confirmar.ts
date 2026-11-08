import { and, eq, sql } from "drizzle-orm";
import { conTransaccion } from "@/db/cliente";
import { productos } from "@/db/esquema";
import { MOTIVO, validarRenglon, type FotoNueva } from "@/dominio/carga-masiva";
import { normalizarNombre } from "@/dominio/normalizacion";
import { unidadesApartadas } from "@/consultas/disponibilidad";
import { existeFoto } from "@/lib/fotos";
import { ErrorNegocio } from "@/lib/resultado";
import { agregarFotosNuevas } from "@/servicios/fotos";
import { columnasSinFotos } from "@/servicios/productos";
import { motivoDeError } from "./procesar";

export interface Marcado {
  productoId: string;
  campos: string[];
  fotosNuevas: FotoNueva[];
}

export type ResultadoConfirmacion = { productoId: string; ok: true } | { productoId: string; ok: false; motivo: string };

const falla = (motivo: string) => new ErrorNegocio("DATOS_INVALIDOS", motivo);

/**
 * Actualiza los productos existentes que marcó el administrador (FR-015 a FR-017, research 7).
 * Vuelve a validar todo lo que llega del navegador; cada producto va en su propia transacción.
 */
export async function confirmarCarga(marcados: Marcado[]): Promise<ResultadoConfirmacion[]> {
  const resultados: ResultadoConfirmacion[] = [];
  for (const marcado of marcados) {
    try {
      await confirmarUno(marcado);
      resultados.push({ productoId: marcado.productoId, ok: true });
    } catch (error) {
      if (!(error instanceof ErrorNegocio)) throw error;
      resultados.push({ productoId: marcado.productoId, ok: false, motivo: motivoDeError(error) });
    }
  }
  return resultados;
}

async function confirmarUno({ productoId, campos, fotosNuevas }: Marcado) {
  const validacion = validarRenglon(campos);
  if (!validacion.ok) throw falla(validacion.motivo);
  const datos = validacion.datos;

  for (const foto of fotosNuevas) {
    if (!datos.fotos.includes(foto.nombreOriginal) || !(await existeFoto(foto.archivo))) {
      throw falla(MOTIVO.fotosNoDisponibles);
    }
  }

  conTransaccion((tx) => {
    const producto = tx
      .select({ id: productos.id, apartadas: unidadesApartadas })
      .from(productos)
      .where(and(eq(productos.id, productoId), eq(productos.activo, true)))
      .get();
    if (!producto) throw falla(MOTIVO.productoInactivo);

    const mismos = tx
      .select({ id: productos.id })
      .from(productos)
      .where(and(eq(productos.activo, true), sql`normalizar(${productos.nombre}) = ${normalizarNombre(datos.nombre)}`))
      .all();
    if (mismos.length !== 1 || mismos[0].id !== productoId) throw falla(MOTIVO.nombreNoUnico);

    if (datos.existencia < producto.apartadas) throw new ErrorNegocio("EXISTENCIA_INSUFICIENTE");

    const columnas = columnasSinFotos(tx, {
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      categoria: { nombre: datos.categoria },
      subcategoria: datos.subcategoria ? { nombre: datos.subcategoria } : null,
      existencia: datos.existencia,
      precioCompraCentavos: datos.precioCompraCentavos,
      precioVentaCentavos: datos.precioVentaCentavos,
    });
    tx.update(productos)
      .set({ ...columnas, actualizadoEn: new Date().toISOString() })
      .where(eq(productos.id, productoId))
      .run();
    agregarFotosNuevas(tx, productoId, fotosNuevas);
  });
}

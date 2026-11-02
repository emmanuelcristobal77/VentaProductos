import { and, eq, inArray } from "drizzle-orm";
import { conTransaccion } from "@/db/cliente";
import { articulosEncargo, operaciones } from "@/db/esquema";
import { ESTADOS_APARTADO_VIGENTE } from "@/dominio/estados";
import { ErrorNegocio } from "@/lib/resultado";
import { sincronizarFotos } from "./fotos";

export interface DatosArticulo {
  nombre: string;
  descripcion: string;
  precioCentavos: number;
  fotos: string[];
}

export function crearArticulo({ fotos, ...datos }: DatosArticulo) {
  return conTransaccion((tx) => {
    const articulo = tx
      .insert(articulosEncargo)
      .values(datos)
      .returning({ id: articulosEncargo.id })
      .get();
    sincronizarFotos(tx, "articuloEncargoId", articulo.id, fotos);
    return articulo;
  });
}

export function actualizarArticulo(id: string, { fotos, ...datos }: DatosArticulo) {
  conTransaccion((tx) => {
    tx.update(articulosEncargo)
      .set({ ...datos, actualizadoEn: new Date().toISOString() })
      .where(eq(articulosEncargo.id, id))
      .run();
    sincronizarFotos(tx, "articuloEncargoId", id, fotos);
  });
}

export function darDeBajaArticulo(id: string) {
  conTransaccion((tx) => {
    const vigente = tx
      .select({ id: operaciones.id })
      .from(operaciones)
      .where(
        and(
          eq(operaciones.articuloEncargoId, id),
          inArray(operaciones.estado, [...ESTADOS_APARTADO_VIGENTE]),
        ),
      )
      .get();
    if (vigente) throw new ErrorNegocio("TIENE_DEPENDENCIAS");

    tx.update(articulosEncargo)
      .set({ activo: false, actualizadoEn: new Date().toISOString() })
      .where(eq(articulosEncargo.id, id))
      .run();
  });
}

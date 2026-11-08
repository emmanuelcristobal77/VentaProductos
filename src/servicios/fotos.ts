import { eq } from "drizzle-orm";
import type { Conexion } from "@/db/cliente";
import { fotos } from "@/db/esquema";

/**
 * Deja activas solo las fotos indicadas; quitar una foto es una baja lógica (FR-038).
 * `nombresOriginales` (archivo → nombre en el comprimido) solo llega desde la carga masiva (spec 004).
 */
export function sincronizarFotos(
  tx: Conexion,
  propietario: "productoId" | "articuloEncargoId",
  propietarioId: string,
  archivos: string[],
  nombresOriginales?: Map<string, string>,
) {
  const actuales = tx.select().from(fotos).where(eq(fotos[propietario], propietarioId)).all();

  for (const foto of actuales) {
    if (foto.activo && !archivos.includes(foto.archivo)) {
      tx.update(fotos).set({ activo: false }).where(eq(fotos.id, foto.id)).run();
    }
  }

  let orden = actuales.reduce((mayor, foto) => Math.max(mayor, foto.orden + 1), 0);
  for (const archivo of archivos) {
    if (!actuales.some((foto) => foto.activo && foto.archivo === archivo)) {
      tx.insert(fotos)
        .values({
          [propietario]: propietarioId,
          archivo,
          orden: orden++,
          nombreOriginal: nombresOriginales?.get(archivo) ?? null,
        })
        .run();
    }
  }
}

/**
 * Agrega al final las fotos cuyo nombre original no se haya cargado antes para el producto, activa o
 * no, y nunca da de baja ninguna (spec 004, FR-016; data-model, «Regla ya se cargó»).
 */
export function agregarFotosNuevas(
  tx: Conexion,
  productoId: string,
  nuevas: { archivo: string; nombreOriginal: string }[],
): number {
  const actuales = tx.select().from(fotos).where(eq(fotos.productoId, productoId)).all();
  const cargadas = new Set(actuales.map((f) => f.nombreOriginal).filter(Boolean));

  let orden = actuales.reduce((mayor, foto) => Math.max(mayor, foto.orden + 1), 0);
  let agregadas = 0;
  for (const { archivo, nombreOriginal } of nuevas) {
    if (cargadas.has(nombreOriginal)) continue;
    cargadas.add(nombreOriginal);
    tx.insert(fotos).values({ productoId, archivo, orden: orden++, nombreOriginal }).run();
    agregadas++;
  }
  return agregadas;
}

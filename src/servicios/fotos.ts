import { eq } from "drizzle-orm";
import type { Conexion } from "@/db/cliente";
import { fotos } from "@/db/esquema";

/** Deja activas solo las fotos indicadas; quitar una foto es una baja lógica (FR-038). */
export function sincronizarFotos(
  tx: Conexion,
  propietario: "productoId" | "articuloEncargoId",
  propietarioId: string,
  archivos: string[],
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
      tx.insert(fotos).values({ [propietario]: propietarioId, archivo, orden: orden++ }).run();
    }
  }
}

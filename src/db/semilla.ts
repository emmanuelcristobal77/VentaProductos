import { normalizarNombre } from "@/dominio/normalizacion";
import type { Conexion } from "./cliente";
import { categorias, subcategorias } from "./esquema";

const INICIALES: Record<string, string[]> = {
  Juguetes: ["Niñas", "Niños", "Bebés"],
  Ropa: ["Adulto mujer", "Adulto hombre", "Niño", "Niña"],
  "Otros artículos": [],
};

/** Solo actúa en una base sin categorías: corre en cada arranque y no debe revertir lo que capture el vendedor. */
export function sembrar(bd: Conexion) {
  if (bd.select({ id: categorias.id }).from(categorias).limit(1).get()) return;

  for (const [nombre, subs] of Object.entries(INICIALES)) {
    const { id: categoriaId } = bd
      .insert(categorias)
      .values({ nombre, nombreNorm: normalizarNombre(nombre) })
      .returning({ id: categorias.id })
      .get();

    for (const sub of subs) {
      bd.insert(subcategorias)
        .values({ categoriaId, nombre: sub, nombreNorm: normalizarNombre(sub) })
        .run();
    }
  }
}

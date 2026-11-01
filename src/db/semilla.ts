import { and, eq } from "drizzle-orm";
import { normalizarNombre } from "@/dominio/normalizacion";
import type { Conexion } from "./cliente";
import { categorias, subcategorias } from "./esquema";

const INICIALES: Record<string, string[]> = {
  Juguetes: ["Niñas", "Niños", "Bebés"],
  Ropa: ["Adulto mujer", "Adulto hombre", "Niño", "Niña"],
  "Otros artículos": [],
};

export function sembrar(bd: Conexion) {
  for (const [nombre, subs] of Object.entries(INICIALES)) {
    const nombreNorm = normalizarNombre(nombre);
    const existente = bd
      .select({ id: categorias.id })
      .from(categorias)
      .where(and(eq(categorias.nombreNorm, nombreNorm), eq(categorias.activo, true)))
      .get();
    const categoriaId =
      existente?.id ??
      bd.insert(categorias).values({ nombre, nombreNorm }).returning({ id: categorias.id }).get().id;

    for (const sub of subs) {
      bd.insert(subcategorias)
        .values({ categoriaId, nombre: sub, nombreNorm: normalizarNombre(sub) })
        .onConflictDoNothing()
        .run();
    }
  }
}

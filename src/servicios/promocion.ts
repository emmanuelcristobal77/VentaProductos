import { eq } from "drizzle-orm";
import { obtenerBd, type Conexion } from "@/db/cliente";
import { selloPromocional } from "@/db/esquema";
import { SELLO_INICIAL, normalizarTexto, validarSello, type ClaveColor, type Sello } from "@/dominio/promocion";
import { ErrorNegocio } from "@/lib/resultado";

/** Lee la fila id = 1; sin fila, el sello está desactivado, sin texto y en Rojo («Primera vez»). */
export function obtenerSello(conexion: Conexion = obtenerBd()): Sello {
  const fila = conexion.select().from(selloPromocional).where(eq(selloPromocional.id, 1)).get();
  if (!fila) return { ...SELLO_INICIAL };
  return { texto: fila.texto, color: fila.color, activo: fila.activo };
}

/** Normaliza, valida y reemplaza el sello. Gana el último que guarda (data-model.md). */
export function guardarSello(
  datos: { texto: string; color: string; activo: boolean },
  conexion: Conexion = obtenerBd(),
): Sello {
  const texto = normalizarTexto(datos.texto);
  const errores = validarSello({ ...datos, texto });
  if (errores) throw new ErrorNegocio("DATOS_INVALIDOS", undefined, errores);

  const valores = {
    texto,
    color: datos.color as ClaveColor,
    activo: datos.activo,
    actualizadoEn: new Date().toISOString(),
  };
  conexion
    .insert(selloPromocional)
    .values({ id: 1, ...valores })
    .onConflictDoUpdate({ target: selloPromocional.id, set: valores })
    .run();
  return { texto, color: valores.color, activo: valores.activo };
}

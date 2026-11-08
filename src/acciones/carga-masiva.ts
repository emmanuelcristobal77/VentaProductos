"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LIMITE_RENGLONES } from "@/dominio/carga-masiva";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";
import { confirmarCarga, type ResultadoConfirmacion } from "@/servicios/carga-masiva/confirmar";

const esquema = z
  .array(
    z.object({
      productoId: z.string().min(1),
      campos: z.array(z.string()),
      fotosNuevas: z.array(
        z.object({
          archivo: z.string().regex(/^[0-9a-f-]{36}\.(jpg|png|webp)$/),
          nombreOriginal: z.string().min(1),
        }),
      ),
    }),
  )
  .max(LIMITE_RENGLONES);

/** Actualiza los productos existentes marcados en el resumen de la carga (contracts/interfaz.md). */
export async function confirmarActualizaciones(
  marcados: unknown,
): Promise<Resultado<{ resultados: ResultadoConfirmacion[] }>> {
  return ejecutar(async () => {
    await exigirSesion();
    const entrada = esquema.safeParse(marcados);
    if (!entrada.success) throw new ErrorNegocio("DATOS_INVALIDOS");
    if (entrada.data.length === 0) return { resultados: [] };

    const resultados = await confirmarCarga(entrada.data);
    if (resultados.some((r) => r.ok)) revalidatePath("/", "layout");
    return { resultados };
  });
}

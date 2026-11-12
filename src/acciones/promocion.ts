"use server";

import { revalidatePath } from "next/cache";
import type { Sello } from "@/dominio/promocion";
import { ejecutar, type Resultado } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";
import { guardarSello } from "@/servicios/promocion";

/** Guarda el sello y devuelve lo que quedó guardado, ya normalizado (contracts/interfaz.md). */
export async function guardarPromocion(
  _anterior: Resultado<Sello> | null,
  formulario: FormData,
): Promise<Resultado<Sello>> {
  return ejecutar(async () => {
    await exigirSesion();
    const guardado = guardarSello({
      texto: String(formulario.get("texto") ?? ""),
      color: String(formulario.get("color") ?? ""),
      activo: formulario.get("activo") === "on",
    });
    revalidatePath("/", "layout");
    return guardado;
  });
}

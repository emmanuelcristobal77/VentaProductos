import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { LIMITE_BYTES, RECHAZO } from "@/dominio/carga-masiva";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";
import { procesarCarga } from "@/servicios/carga-masiva/procesar";

const muyGrande = () => new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.muyGrande);

/** Lee el cuerpo por partes y se detiene al pasar de 50 MB, aunque Content-Length falte o mienta. */
async function leerCuerpo(solicitud: Request): Promise<Uint8Array> {
  if (Number(solicitud.headers.get("content-length") ?? 0) > LIMITE_BYTES) throw muyGrande();
  if (!solicitud.body) return new Uint8Array();

  const lector = solicitud.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > LIMITE_BYTES) {
      await lector.cancel();
      throw muyGrande();
    }
    partes.push(value);
  }

  const cuerpo = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) {
    cuerpo.set(parte, posicion);
    posicion += parte.length;
  }
  return cuerpo;
}

function estado(resultado: Resultado<unknown>): number {
  if (resultado.ok) return 200;
  if (resultado.codigo === "NO_AUTORIZADO") return 401;
  return resultado.mensaje === RECHAZO.muyGrande ? 413 : 400;
}

/** Recibe el comprimido de una carga masiva y devuelve su resumen (spec 004, contracts/interfaz.md). */
export async function POST(solicitud: Request) {
  const resultado = await ejecutar(async () => {
    await exigirSesion();
    const resumen = await procesarCarga(await leerCuerpo(solicitud));
    if (resumen.cantidades.nuevos > 0) revalidatePath("/", "layout");
    return resumen;
  });
  return NextResponse.json(resultado, { status: estado(resultado), headers: { "Cache-Control": "no-store" } });
}

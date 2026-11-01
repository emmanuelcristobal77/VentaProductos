import { NextResponse } from "next/server";
import { guardarFoto } from "@/lib/fotos";
import { ejecutar } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";

export async function POST(solicitud: Request) {
  const resultado = await ejecutar(async () => {
    await exigirSesion();
    const contenido = Buffer.from(await solicitud.arrayBuffer());
    return { archivo: await guardarFoto(contenido) };
  });

  if (resultado.ok) return NextResponse.json(resultado, { status: 201 });
  return NextResponse.json(resultado, { status: resultado.codigo === "NO_AUTORIZADO" ? 401 : 400 });
}

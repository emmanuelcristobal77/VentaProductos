import { NextResponse } from "next/server";
import { listarProductosAdmin } from "@/consultas/admin";
import { leerParametros } from "@/consultas/busqueda";
import { ejecutar } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";

/** Búsquedas y partes siguientes de la lista del panel; exige la sesión (contracts/rutas.md). */
export async function GET(solicitud: Request) {
  const resultado = await ejecutar(async () => {
    await exigirSesion();
    return listarProductosAdmin(leerParametros(new URL(solicitud.url).searchParams));
  });
  const estado = resultado.ok ? 200 : resultado.codigo === "NO_AUTORIZADO" ? 401 : 400;
  return NextResponse.json(resultado, { status: estado, headers: { "Cache-Control": "no-store" } });
}

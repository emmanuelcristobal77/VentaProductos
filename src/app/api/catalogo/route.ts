import { NextResponse } from "next/server";
import { leerParametros } from "@/consultas/busqueda";
import { listarCatalogo } from "@/consultas/publicas";
import { ejecutar } from "@/lib/resultado";

/** Búsquedas y partes siguientes del catálogo público (spec 002, contracts/rutas.md). */
export async function GET(solicitud: Request) {
  const resultado = await ejecutar(() => listarCatalogo(leerParametros(new URL(solicitud.url).searchParams)));
  return NextResponse.json(resultado, {
    status: resultado.ok ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}

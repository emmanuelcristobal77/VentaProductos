import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, tokenValido } from "@/lib/token-sesion";

export async function proxy(solicitud: NextRequest) {
  if (solicitud.nextUrl.pathname === "/admin/entrar") return NextResponse.next();

  if (await tokenValido(solicitud.cookies.get(COOKIE_SESION)?.value)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/admin/entrar", solicitud.url));
}

export const config = { matcher: ["/admin", "/admin/:ruta*"] };

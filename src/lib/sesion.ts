import { cookies } from "next/headers";
import { ErrorNegocio } from "./resultado";
import { COOKIE_SESION, DURACION_SESION_SEGUNDOS, firmarToken, tokenValido } from "./token-sesion";

export async function haySesion(): Promise<boolean> {
  const almacen = await cookies();
  return tokenValido(almacen.get(COOKIE_SESION)?.value);
}

export async function exigirSesion(): Promise<void> {
  if (!(await haySesion())) throw new ErrorNegocio("NO_AUTORIZADO");
}

export async function abrirSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, await firmarToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  });
}

export async function terminarSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE_SESION);
}

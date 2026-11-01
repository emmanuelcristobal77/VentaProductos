import { jwtVerify, SignJWT } from "jose";

export const COOKIE_SESION = "vp_sesion";
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 24 * 30;

const clave = () => new TextEncoder().encode(process.env.SESION_SECRETO ?? "");

export async function firmarToken(): Promise<string> {
  return new SignJWT({ rol: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(clave());
}

export async function tokenValido(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    return payload.rol === "admin";
  } catch {
    return false;
  }
}

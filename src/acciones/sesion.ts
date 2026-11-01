"use server";

import { headers } from "next/headers";
import { verificarContrasena } from "@/lib/contrasena";
import { entorno } from "@/lib/entorno";
import {
  exigirIntentoDisponible,
  ipDesdeEncabezados,
  limpiarIntentos,
  registrarIntento,
} from "@/lib/limite-intentos";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/resultado";
import { abrirSesion, terminarSesion } from "@/lib/sesion";

const CREDENCIALES_INCORRECTAS = "Usuario o contraseña incorrectos.";

export async function iniciarSesion(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  return ejecutar(async () => {
    const ip = ipDesdeEncabezados(await headers());
    exigirIntentoDisponible("sesion", ip);

    const { ADMIN_USUARIO, ADMIN_HASH_CONTRASENA } = entorno();
    const usuario = String(formulario.get("usuario") ?? "");
    const contrasena = String(formulario.get("contrasena") ?? "");
    const correcta = verificarContrasena(contrasena, ADMIN_HASH_CONTRASENA);

    if (usuario !== ADMIN_USUARIO || !correcta) {
      registrarIntento("sesion", ip);
      throw new ErrorNegocio("DATOS_INVALIDOS", CREDENCIALES_INCORRECTAS);
    }

    limpiarIntentos("sesion", ip);
    await abrirSesion();
    return null;
  });
}

export async function cerrarSesion(): Promise<void> {
  await terminarSesion();
}

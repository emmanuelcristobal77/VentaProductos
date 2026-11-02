"use server";

import { headers } from "next/headers";
import { consultarOperacionesCliente, type OperacionCliente } from "@/consultas/publicas";
import { normalizarTelefono } from "@/dominio/normalizacion";
import { exigirIntentoDisponible, ipDesdeEncabezados, registrarIntento } from "@/lib/limite-intentos";
import { CAMPOS } from "@/lib/mensajes";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/resultado";

export async function consultarMisApartados(
  _anterior: Resultado<OperacionCliente[]> | null,
  formulario: FormData,
): Promise<Resultado<OperacionCliente[]>> {
  return ejecutar(async () => {
    const ip = ipDesdeEncabezados(await headers());
    exigirIntentoDisponible("consulta", ip);
    registrarIntento("consulta", ip);

    const nombre = String(formulario.get("nombre") ?? "").trim();
    const telefono = String(formulario.get("telefono") ?? "");

    const errores: Record<string, string> = {};
    if (!nombre) errores.nombre = CAMPOS.clienteNombre;
    if (!normalizarTelefono(telefono)) errores.telefono = CAMPOS.clienteTelefono;
    if (Object.keys(errores).length > 0) throw new ErrorNegocio("DATOS_INVALIDOS", undefined, errores);

    return consultarOperacionesCliente(nombre, telefono);
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { parsearPrecio } from "@/dominio/dinero";
import { CAMPOS } from "@/lib/mensajes";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";
import {
  actualizarArticulo,
  crearArticulo,
  darDeBajaArticulo,
  type DatosArticulo,
} from "@/servicios/articulos-encargo";

function leerDatos(formulario: FormData): DatosArticulo {
  const texto = (campo: string) => String(formulario.get(campo) ?? "").trim();
  const errores: Record<string, string> = {};

  const nombre = texto("nombre");
  const descripcion = texto("descripcion");
  const precioCentavos = parsearPrecio(texto("precio"));

  if (!nombre) errores.nombre = CAMPOS.articuloNombre;
  if (!descripcion) errores.descripcion = CAMPOS.articuloDescripcion;
  if (precioCentavos === null) errores.precio = CAMPOS.precio;
  if (Object.keys(errores).length > 0) throw new ErrorNegocio("DATOS_INVALIDOS", undefined, errores);

  return { nombre, descripcion, precioCentavos: precioCentavos!, fotos: formulario.getAll("fotos").map(String) };
}

export async function guardarArticuloEncargo(formulario: FormData): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    const datos = leerDatos(formulario);
    const id = String(formulario.get("id") ?? "");
    if (id) actualizarArticulo(id, datos);
    else crearArticulo(datos);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function darDeBajaArticuloEncargo(id: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    darDeBajaArticulo(id);
    revalidatePath("/", "layout");
    return null;
  });
}

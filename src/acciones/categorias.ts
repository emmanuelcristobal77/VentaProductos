"use server";

import { revalidatePath } from "next/cache";
import { ejecutar, type Resultado } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";
import {
  crearCategoria,
  crearSubcategoria,
  darDeBajaCategoria as bajaCategoria,
  darDeBajaSubcategoria as bajaSubcategoria,
  renombrarCategoria,
  renombrarSubcategoria,
} from "@/servicios/categorias";

function refrescar() {
  revalidatePath("/", "layout");
}

const texto = (formulario: FormData, campo: string) => String(formulario.get(campo) ?? "");

export async function guardarCategoria(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    const id = texto(formulario, "id");
    if (id) renombrarCategoria(id, texto(formulario, "nombre"));
    else crearCategoria(texto(formulario, "nombre"));
    refrescar();
    return null;
  });
}

export async function guardarSubcategoria(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    const id = texto(formulario, "id");
    if (id) renombrarSubcategoria(id, texto(formulario, "nombre"));
    else crearSubcategoria(texto(formulario, "categoriaId"), texto(formulario, "nombre"));
    refrescar();
    return null;
  });
}

export async function darDeBajaCategoria(id: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    bajaCategoria(id);
    refrescar();
    return null;
  });
}

export async function darDeBajaSubcategoria(id: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    bajaSubcategoria(id);
    refrescar();
    return null;
  });
}

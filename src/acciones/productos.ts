"use server";

import { revalidatePath } from "next/cache";
import { parsearPrecio } from "@/dominio/dinero";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";
import type { ReferenciaCategoria } from "@/servicios/categorias";
import {
  actualizarProducto,
  crearProducto,
  darDeBajaProducto as bajaProducto,
  type DatosProducto,
} from "@/servicios/productos";

const NUEVA = "__nueva__";
const PRECIO_INVALIDO = "Escribe un precio mayor a cero, con hasta dos decimales.";

function referencia(formulario: FormData, campo: string): ReferenciaCategoria | null {
  const valor = String(formulario.get(campo) ?? "");
  if (valor === NUEVA) return { nombre: String(formulario.get(`${campo}Nueva`) ?? "") };
  return valor ? { id: valor } : null;
}

function leerDatos(formulario: FormData): DatosProducto {
  const errores: Record<string, string> = {};
  const texto = (campo: string) => String(formulario.get(campo) ?? "").trim();

  const nombre = texto("nombre");
  const descripcion = texto("descripcion");
  const existencia = Number(texto("existencia"));
  const precioCompraCentavos = parsearPrecio(texto("precioCompra"));
  const precioVentaCentavos = parsearPrecio(texto("precioVenta"));
  const categoria = referencia(formulario, "categoria");

  if (!nombre) errores.nombre = "Escribe el nombre del producto.";
  if (!descripcion) errores.descripcion = "Escribe la descripción.";
  if (!categoria) errores.categoria = "Elige una categoría.";
  if (texto("existencia") === "" || !Number.isInteger(existencia) || existencia < 0) {
    errores.existencia = "Escribe una cantidad entera, de 0 en adelante.";
  }
  if (precioCompraCentavos === null) errores.precioCompra = PRECIO_INVALIDO;
  if (precioVentaCentavos === null) errores.precioVenta = PRECIO_INVALIDO;

  if (Object.keys(errores).length > 0) throw new ErrorNegocio("DATOS_INVALIDOS", undefined, errores);

  return {
    nombre,
    descripcion,
    categoria: categoria!,
    subcategoria: referencia(formulario, "subcategoria"),
    existencia,
    precioCompraCentavos: precioCompraCentavos!,
    precioVentaCentavos: precioVentaCentavos!,
    fotos: formulario.getAll("fotos").map(String),
  };
}

function refrescar() {
  revalidatePath("/", "layout");
}

export async function guardarProducto(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    const datos = leerDatos(formulario);
    const id = String(formulario.get("id") ?? "");
    if (id) actualizarProducto(id, datos);
    else crearProducto(datos);
    refrescar();
    return null;
  });
}

export async function darDeBajaProducto(id: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    bajaProducto(id);
    refrescar();
    return null;
  });
}

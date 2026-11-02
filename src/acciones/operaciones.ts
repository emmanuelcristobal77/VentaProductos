"use server";

import { revalidatePath } from "next/cache";
import { parsearPrecio } from "@/dominio/dinero";
import { CAMPOS } from "@/lib/mensajes";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/resultado";
import { exigirSesion } from "@/lib/sesion";
import {
  anularVenta as anular,
  cancelarOperacion as cancelar,
  corregirOperacion as corregir,
  marcarEntregada as entregar,
  registrarApartado as apartar,
  registrarEncargo as encargar,
  registrarVenta as vender,
  type OrigenEncargo,
} from "@/servicios/operaciones";
import { anularPago as anularPagoRegistrado, registrarPago as pagar } from "@/servicios/pagos";

type Registro = Resultado<{ id: string }>;

const texto = (formulario: FormData, campo: string) => String(formulario.get(campo) ?? "").trim();

/** Convierte a número sin aceptar vacíos: `Number("")` daría cero. */
function leerCantidad(formulario: FormData) {
  const capturada = texto(formulario, "cantidad");
  return capturada === "" ? Number.NaN : Number(capturada);
}

function leerPrecio(formulario: FormData): number {
  const centavos = parsearPrecio(texto(formulario, "precio"));
  if (centavos === null) throw new ErrorNegocio("DATOS_INVALIDOS", undefined, { precio: CAMPOS.precio });
  return centavos;
}

function refrescar() {
  revalidatePath("/", "layout");
}

export async function registrarVenta(_anterior: Registro | null, formulario: FormData): Promise<Registro> {
  return ejecutar(async () => {
    await exigirSesion();
    const venta = vender({
      productoId: texto(formulario, "productoId"),
      cantidad: leerCantidad(formulario),
      precioUnitarioCentavos: leerPrecio(formulario),
      clienteNombre: texto(formulario, "clienteNombre"),
      clienteTelefono: texto(formulario, "clienteTelefono"),
    });
    refrescar();
    return venta;
  });
}

export async function registrarApartado(_anterior: Registro | null, formulario: FormData): Promise<Registro> {
  return ejecutar(async () => {
    await exigirSesion();
    const apartado = apartar({
      productoId: texto(formulario, "productoId"),
      cantidad: leerCantidad(formulario),
      precioUnitarioCentavos: parsearPrecio(texto(formulario, "precio")) ?? 0,
      clienteNombre: texto(formulario, "clienteNombre"),
      clienteTelefono: texto(formulario, "clienteTelefono"),
      pagoInicialCentavos: parsearPrecio(texto(formulario, "pagoInicial")) ?? 0,
    });
    refrescar();
    return apartado;
  });
}

function leerOrigen(formulario: FormData): OrigenEncargo {
  const productoId = texto(formulario, "productoId");
  if (productoId) return { productoId };
  const articuloEncargoId = texto(formulario, "articuloEncargoId");
  if (articuloEncargoId) return { articuloEncargoId };
  return {
    articuloNuevo: {
      nombre: texto(formulario, "articuloNombre"),
      descripcion: texto(formulario, "articuloDescripcion"),
    },
  };
}

export async function registrarEncargo(_anterior: Registro | null, formulario: FormData): Promise<Registro> {
  return ejecutar(async () => {
    await exigirSesion();
    const encargo = encargar({
      origen: leerOrigen(formulario),
      cantidad: leerCantidad(formulario),
      precioUnitarioCentavos: parsearPrecio(texto(formulario, "precio")) ?? 0,
      clienteNombre: texto(formulario, "clienteNombre"),
      clienteTelefono: texto(formulario, "clienteTelefono"),
      pagoInicialCentavos: parsearPrecio(texto(formulario, "pagoInicial")) ?? 0,
    });
    refrescar();
    return encargo;
  });
}

export async function corregirOperacion(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Registro> {
  return ejecutar(async () => {
    await exigirSesion();
    const id = texto(formulario, "id");
    corregir(id, {
      clienteNombre: texto(formulario, "clienteNombre"),
      clienteTelefono: texto(formulario, "clienteTelefono"),
      precioUnitarioCentavos: parsearPrecio(texto(formulario, "precio")) ?? 0,
    });
    refrescar();
    return { id };
  });
}

export async function marcarEntregada(id: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    entregar(id);
    refrescar();
    return null;
  });
}

export async function anularVenta(id: string, motivo: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    anular(id, motivo);
    refrescar();
    return null;
  });
}

export async function cancelarOperacion(id: string, motivo: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    cancelar(id, motivo);
    refrescar();
    return null;
  });
}

export async function registrarPago(operacionId: string, importe: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    pagar(operacionId, parsearPrecio(importe) ?? 0);
    refrescar();
    return null;
  });
}

export async function anularPago(pagoId: string): Promise<Resultado<null>> {
  return ejecutar(async () => {
    await exigirSesion();
    anularPagoRegistrado(pagoId);
    refrescar();
    return null;
  });
}

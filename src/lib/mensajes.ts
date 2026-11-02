import { formatearPrecio } from "@/dominio/dinero";

export type CodigoError =
  | "NO_AUTORIZADO"
  | "DEMASIADOS_INTENTOS"
  | "DATOS_INVALIDOS"
  | "SIN_DISPONIBILIDAD"
  | "HAY_DISPONIBILIDAD"
  | "PAGO_EXCEDE_SALDO"
  | "PRECIO_MENOR_A_PAGADO"
  | "SALDO_PENDIENTE"
  | "ESTADO_NO_PERMITE"
  | "TIENE_DEPENDENCIAS"
  | "EXISTENCIA_INSUFICIENTE"
  | "FOTO_REQUERIDA";

export const MENSAJES: Record<CodigoError, string> = {
  NO_AUTORIZADO: "Tu sesión terminó. Vuelve a iniciar sesión para continuar.",
  DEMASIADOS_INTENTOS: "Demasiados intentos. Espera unos minutos e inténtalo más tarde.",
  DATOS_INVALIDOS: "Revisa los datos marcados e inténtalo de nuevo.",
  SIN_DISPONIBILIDAD: "No hay unidades suficientes disponibles.",
  HAY_DISPONIBILIDAD: "Este producto tiene unidades disponibles; registra una venta o un apartado.",
  PAGO_EXCEDE_SALDO: "El pago es mayor al saldo restante.",
  PRECIO_MENOR_A_PAGADO: "El total no puede quedar por debajo de lo ya pagado.",
  SALDO_PENDIENTE: "No se puede entregar mientras exista saldo restante.",
  ESTADO_NO_PERMITE: "Esta acción no está permitida en el estado actual.",
  TIENE_DEPENDENCIAS: "No se puede dar de baja porque tiene registros vigentes.",
  EXISTENCIA_INSUFICIENTE: "La existencia no puede ser menor a las unidades apartadas.",
  FOTO_REQUERIDA: "Agrega al menos una foto del producto.",
};

export const CAMPOS = {
  cantidad: "Escribe una cantidad entera, de 1 en adelante.",
  precio: "Escribe un precio mayor a cero, con hasta dos decimales.",
  importe: "Escribe un importe mayor a cero, con hasta dos decimales.",
  pagoInicial: "Escribe un pago inicial mayor a cero.",
  anticipo: "Escribe un anticipo mayor a cero.",
  articuloNombre: "Escribe el nombre del artículo.",
  articuloDescripcion: "Escribe la descripción del artículo.",
  clienteNombre: "Escribe el nombre del cliente.",
  clienteTelefono: "Escribe un teléfono de 10 dígitos.",
  motivo: "Escribe el motivo.",
  rangoFechas: "Revisa las fechas: el inicio no puede ser posterior al final.",
};

export const SIN_INFORMACION = "No encontramos información con esos datos.";

export function mensajeSinDisponibilidad(disponible: number): string {
  if (disponible <= 0) return "Ya no hay unidades disponibles.";
  return disponible === 1 ? "Solo hay 1 unidad disponible." : `Solo hay ${disponible} unidades disponibles.`;
}

export function mensajePagoExcedeSaldo(saldoCentavos: number): string {
  return `El pago es mayor al saldo restante de ${formatearPrecio(saldoCentavos)}.`;
}

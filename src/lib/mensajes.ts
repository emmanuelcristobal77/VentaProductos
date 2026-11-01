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

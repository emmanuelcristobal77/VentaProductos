import { MENSAJES, type CodigoError } from "./mensajes";

export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: CodigoError; mensaje: string; campos?: Record<string, string> };

export class ErrorNegocio extends Error {
  constructor(
    readonly codigo: CodigoError,
    mensaje?: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensaje ?? MENSAJES[codigo]);
  }
}

export function resultadoDeError(error: unknown): Resultado<never> {
  if (error instanceof ErrorNegocio) {
    return { ok: false, codigo: error.codigo, mensaje: error.message, campos: error.campos };
  }
  throw error;
}

/** Ejecuta una acción y traduce los errores de negocio al resultado común del contrato. */
export async function ejecutar<T>(accion: () => T | Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await accion() };
  } catch (error) {
    return resultadoDeError(error);
  }
}

/*
 * Estado de las listas de productos en memoria del navegador (spec 002, research 6).
 * Sirve para que al regresar con atrás la lista quede como estaba (FR-008a). Vive solo
 * en este módulo: al recargar la página se pierde, así que la búsqueda no se conserva
 * (FR-008). Nunca se escribe en la URL, sessionStorage, localStorage ni history.state.
 */

export type NombreLista = "catalogo" | "panel";

export interface EstadoLista<P> {
  texto: string;
  /** Categoría y subcategoría de la URL, como texto comparable. */
  filtro: string;
  productos: P[];
  siguiente: string | null;
  total: number;
  desplazamiento: number;
}

const estados = new Map<NombreLista, EstadoLista<unknown>>();

/** URL a la que se llegó con atrás o adelante; la lista que se monte en ella se restaura. */
let regresoA: string | null = null;

/**
 * Lo llama src/instrumentation-client.ts al empezar cada navegación del App Router, antes de
 * dibujar la página nueva. Un "traverse" es atrás o adelante (el popstate del navegador): se
 * avisa por aquí porque el escucha de popstate de Next.js dibuja la página antes de que corra
 * uno propio.
 */
export function registrarNavegacion(url: string, tipo: "push" | "replace" | "traverse") {
  regresoA = tipo === "traverse" ? new URL(url, window.location.href).href : null;
}

export function guardarEstado<P>(lista: NombreLista, estado: EstadoLista<P>) {
  estados.set(lista, estado);
}

export function guardarDesplazamiento(lista: NombreLista, desplazamiento: number) {
  const estado = estados.get(lista);
  if (estado) estado.desplazamiento = desplazamiento;
}

/** El estado guardado, solo si se llegó con atrás o adelante y el filtro coincide. */
export function tomarEstadoAlRegresar<P>(lista: NombreLista, filtro: string): EstadoLista<P> | null {
  if (typeof window === "undefined" || regresoA !== window.location.href) return null;
  const estado = estados.get(lista) as EstadoLista<P> | undefined;
  return estado && estado.filtro === filtro ? estado : null;
}

/**
 * La lista ya se montó: la siguiente que se monte sin pasar por atrás empieza de nuevo.
 * Se llama desde un efecto y no al leer el estado, porque React puede iniciar el estado dos veces.
 */
export function terminarRegreso() {
  regresoA = null;
}

export function olvidar(lista: NombreLista) {
  estados.delete(lista);
}

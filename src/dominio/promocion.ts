/**
 * Reglas puras del sello promocional (spec 005). Las usan el formulario del panel y el servidor,
 * para que el contador y la validación cuenten igual (research 2).
 */

export type ClaveColor = "rojo" | "verde" | "dorado" | "azul";

export type ColorSello = {
  clave: ClaveColor;
  nombre: string;
  fondo: string;
  texto: string;
  /** Color de «Escribe el texto del sello» en la vista previa sin texto (research 3). */
  textoEjemplo: string;
};

/** Los 4 colores, en el orden en que se muestran (FR-005), con contraste ≥ 4.5 : 1 (FR-014). */
export const COLORES: readonly ColorSello[] = [
  { clave: "rojo", nombre: "Rojo", fondo: "#B42318", texto: "#FFFFFF", textoEjemplo: "#FDE2DF" },
  { clave: "verde", nombre: "Verde", fondo: "#1F6F43", texto: "#FFFFFF", textoEjemplo: "#D3F0DF" },
  { clave: "dorado", nombre: "Dorado", fondo: "#F2C14E", texto: "#3B2A12", textoEjemplo: "#5C4318" },
  { clave: "azul", nombre: "Azul", fondo: "#1E4FA3", texto: "#FFFFFF", textoEjemplo: "#DCE6F9" },
];

export const MAXIMO_CARACTERES = 40;
/** Tope de seguridad que también aplica la base (data-model.md). */
export const MAXIMO_BYTES = 400;

export type Sello = { texto: string; color: ClaveColor; activo: boolean };

/** Estado «Primera vez»: sin fila en la base. */
export const SELLO_INICIAL: Sello = { texto: "", color: "rojo", activo: false };

export const MENSAJES_PROMOCION = {
  textoVacio: "Escribe el texto del sello para mostrarlo.",
  textoLargo: "El texto puede tener hasta 40 caracteres.",
  colorInvalido: "Elige uno de los colores de la lista.",
  listoActivo: "Listo. El sello se muestra en la página.",
  listoDesactivado: "Listo. El sello está desactivado.",
} as const;

export const ETIQUETAS_PROMOCION = {
  titulo: "Promoción",
  campoTexto: "Texto del sello",
  campoColor: "Color",
  casilla: "Mostrar el sello en la página",
  vistaPrevia: "Así se verá",
  textoEjemplo: "Escribe el texto del sello",
  guardar: "Guardar",
} as const;

export function buscarColor(clave: string): ColorSello | undefined {
  return COLORES.find((c) => c.clave === clave);
}

export function esClaveColor(clave: string): clave is ClaveColor {
  return buscarColor(clave) !== undefined;
}

export function normalizarTexto(texto: string): string {
  return texto.normalize("NFC").trim();
}

const segmentador = new Intl.Segmenter("es-MX", { granularity: "grapheme" });

/** Cuenta los caracteres que ve una persona: «ñ», «á» o un emoji cuentan como 1. */
export function contarCaracteres(texto: string): number {
  let total = 0;
  for (const _ of segmentador.segment(texto)) total++;
  return total;
}

const bytes = (texto: string) => new TextEncoder().encode(texto).length;

/** Devuelve los errores por campo, o `null` si el sello se puede guardar. */
export function validarSello(datos: { texto: string; color: string; activo: boolean }): Partial<
  Record<"texto" | "color", string>
> | null {
  const errores: Partial<Record<"texto" | "color", string>> = {};
  const texto = normalizarTexto(datos.texto);

  if (datos.activo && texto === "") errores.texto = MENSAJES_PROMOCION.textoVacio;
  else if (contarCaracteres(texto) > MAXIMO_CARACTERES || bytes(texto) > MAXIMO_BYTES) {
    errores.texto = MENSAJES_PROMOCION.textoLargo;
  }
  if (!esClaveColor(datos.color)) errores.color = MENSAJES_PROMOCION.colorInvalido;

  return Object.keys(errores).length > 0 ? errores : null;
}

/** Texto del contador debajo del campo, con singular y plural (contracts/interfaz.md). */
export function textoContador(caracteres: number): string {
  const restantes = MAXIMO_CARACTERES - caracteres;
  if (restantes >= 0) {
    return restantes === 1 ? "Te queda 1 carácter" : `Te quedan ${restantes} caracteres`;
  }
  const sobrantes = -restantes;
  return sobrantes === 1 ? "Te pasaste por 1 carácter" : `Te pasaste por ${sobrantes} caracteres`;
}

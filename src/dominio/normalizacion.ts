export function normalizarNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export const LARGO_MAXIMO_BUSQUEDA = 100;
const PALABRAS_MAXIMAS = 10;

/** Palabras de una búsqueda: de 0 a 10, ya normalizadas (spec 002, data-model, Búsqueda). */
export function palabrasDeBusqueda(texto: string): string[] {
  return normalizarNombre(texto.slice(0, LARGO_MAXIMO_BUSQUEDA))
    .split(" ")
    .filter(Boolean)
    .slice(0, PALABRAS_MAXIMAS);
}

export function normalizarTelefono(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length === 10 ? digitos : null;
}

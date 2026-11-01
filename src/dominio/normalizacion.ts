export function normalizarNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizarTelefono(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length === 10 ? digitos : null;
}

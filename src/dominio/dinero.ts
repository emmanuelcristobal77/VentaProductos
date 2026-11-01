const FORMATO = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/;

/** Convierte texto capturado a centavos enteros, sin pasar por decimales flotantes. */
export function parsearPrecio(texto: string): number | null {
  const limpio = texto.trim().replace(/^\$/, "");
  if (!FORMATO.test(limpio)) return null;

  const [entero, decimales = ""] = limpio.replaceAll(",", "").split(".");
  const centavos = Number(entero) * 100 + Number(decimales.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

export function formatearPrecio(centavos: number): string {
  const resto = centavos % 100;
  const entero = (centavos - resto) / 100;
  const miles = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${miles}.${String(resto).padStart(2, "0")} MXN`;
}

/** Devuelve el precio en texto editable, sin símbolo ni moneda. */
export function precioParaCaptura(centavos: number): string {
  const resto = centavos % 100;
  return `${(centavos - resto) / 100}.${String(resto).padStart(2, "0")}`;
}

export function calcularTotal(precioUnitarioCentavos: number, cantidad: number): number {
  return precioUnitarioCentavos * cantidad;
}

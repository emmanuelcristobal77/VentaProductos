import { describe, expect, it } from "vitest";
import {
  COLORES,
  MAXIMO_BYTES,
  MAXIMO_CARACTERES,
  MENSAJES_PROMOCION,
  contarCaracteres,
  normalizarTexto,
  textoContador,
  validarSello,
} from "@/dominio/promocion";

/** Luminancia relativa de WCAG 2.x para un color `#RRGGBB`. */
function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

describe("colores del sello", () => {
  it("FR-005: son Rojo, Verde, Dorado y Azul, en ese orden", () => {
    expect(COLORES.map((c) => c.clave)).toEqual(["rojo", "verde", "dorado", "azul"]);
    expect(COLORES.map((c) => c.nombre)).toEqual(["Rojo", "Verde", "Dorado", "Azul"]);
  });

  for (const color of COLORES) {
    it(`FR-014: ${color.nombre} tiene contraste de al menos 4.5 : 1 en el texto y en el texto de ejemplo`, () => {
      expect(contraste(color.fondo, color.texto)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(color.fondo, color.textoEjemplo)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("texto del sello", () => {
  it("research 2: normaliza a NFC y quita los espacios del principio y del final", () => {
    const descompuesto = "  Mamá  ";
    expect(normalizarTexto(descompuesto)).toBe("Mamá");
    expect(normalizarTexto(descompuesto)).toHaveLength(4);
  });

  it("research 2: cuenta los caracteres que ve una persona", () => {
    expect(contarCaracteres("Ñandú")).toBe(5);
    expect(contarCaracteres("Venta navideña 🎄")).toBe(16);
    expect(contarCaracteres("á")).toBe(1);
  });
});

describe("validarSello", () => {
  const valido = { texto: "Buen Fin", color: "rojo", activo: true };

  it("acepta un sello correcto", () => {
    expect(validarSello(valido)).toBeNull();
  });

  it("FR-003: no se activa con texto vacío ni con solo espacios", () => {
    expect(validarSello({ ...valido, texto: "" })).toEqual({ texto: MENSAJES_PROMOCION.textoVacio });
    expect(validarSello({ ...valido, texto: "   " })).toEqual({ texto: MENSAJES_PROMOCION.textoVacio });
    expect(MENSAJES_PROMOCION.textoVacio).toBe("Escribe el texto del sello para mostrarlo.");
  });

  it("Desactivar sin texto: se puede guardar desactivado con el texto vacío", () => {
    expect(validarSello({ ...valido, texto: "", activo: false })).toBeNull();
  });

  it("FR-004: acepta exactamente 40 caracteres y rechaza 41", () => {
    expect(MAXIMO_CARACTERES).toBe(40);
    expect(validarSello({ ...valido, texto: "a".repeat(40) })).toBeNull();
    expect(validarSello({ ...valido, texto: "a".repeat(41) })).toEqual({ texto: MENSAJES_PROMOCION.textoLargo });
    expect(MENSAJES_PROMOCION.textoLargo).toBe("El texto puede tener hasta 40 caracteres.");
  });

  it("FR-004: acepta 40 «👍🏽» (320 bytes)", () => {
    const texto = "👍🏽".repeat(40);
    expect(new TextEncoder().encode(texto).length).toBe(320);
    expect(validarSello({ ...valido, texto })).toBeNull();
  });

  it("data-model: rechaza con el mensaje de FR-004 un texto corto que pasa de 400 bytes", () => {
    const texto = "👨‍👩‍👧‍👦".repeat(20);
    expect(contarCaracteres(texto)).toBe(20);
    expect(new TextEncoder().encode(texto).length).toBeGreaterThan(MAXIMO_BYTES);
    expect(validarSello({ ...valido, texto })).toEqual({ texto: MENSAJES_PROMOCION.textoLargo });
  });

  it("FR-005: rechaza un color fuera de la lista", () => {
    expect(validarSello({ ...valido, color: "morado" })).toEqual({ color: MENSAJES_PROMOCION.colorInvalido });
    expect(MENSAJES_PROMOCION.colorInvalido).toBe("Elige uno de los colores de la lista.");
  });
});

describe("textoContador", () => {
  it("contracts/interfaz: usa singular y plural en es-MX", () => {
    expect(textoContador(0)).toBe("Te quedan 40 caracteres");
    expect(textoContador(39)).toBe("Te queda 1 carácter");
    expect(textoContador(40)).toBe("Te quedan 0 caracteres");
    expect(textoContador(41)).toBe("Te pasaste por 1 carácter");
    expect(textoContador(43)).toBe("Te pasaste por 3 caracteres");
  });
});

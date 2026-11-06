import { describe, expect, it } from "vitest";
import { codificarCursor, decodificarCursor } from "@/consultas/busqueda";
import { normalizarNombre, palabrasDeBusqueda } from "@/dominio/normalizacion";

const codigo = (valor: string) => expect.objectContaining({ codigo: valor });

describe("palabrasDeBusqueda (data-model, Búsqueda)", () => {
  it("FR-002: normaliza como normalizarNombre y divide por espacios", () => {
    expect(palabrasDeBusqueda("  Muñeca   ROJA ")).toEqual(["muneca", "roja"]);
  });

  it("recorta el texto a 100 caracteres antes de dividirlo", () => {
    const texto = `${"a".repeat(98)} bcdef`;
    expect(palabrasDeBusqueda(texto)).toEqual(["a".repeat(98), "b"]);
  });

  it("conserva como máximo 10 palabras", () => {
    const texto = Array.from({ length: 14 }, (_, i) => `p${i}`).join(" ");
    expect(palabrasDeBusqueda(texto)).toEqual(Array.from({ length: 10 }, (_, i) => `p${i}`));
  });

  it("Caso límite \"Espacios de más\": un texto de solo espacios no tiene palabras", () => {
    expect(palabrasDeBusqueda("    ")).toEqual([]);
    expect(palabrasDeBusqueda("")).toEqual([]);
  });

  it("Caso límite \"Una sola letra\": una letra ya es una palabra", () => {
    expect(palabrasDeBusqueda("M")).toEqual(["m"]);
  });

  it("cada palabra coincide con la regla de normalizarNombre", () => {
    for (const palabra of palabrasDeBusqueda("Ñandú ÁRBOL")) {
      expect(normalizarNombre(palabra)).toBe(palabra);
    }
  });
});

describe("cursor (data-model, Cursor)", () => {
  it.each([
    { g: 0 as const, c: "2026-11-05T10:00:00.000Z", i: "a1b2" },
    { g: 1 as const, c: "2026-01-01T00:00:00.000Z", i: "ffff-0000" },
  ])("hace un viaje de ida y vuelta de %j", (posicion) => {
    expect(decodificarCursor(codificarCursor(posicion))).toEqual(posicion);
  });

  it("el cursor es base64url", () => {
    expect(codificarCursor({ g: 1, c: "2026-11-05T10:00:00.000Z", i: "x" })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    "no es base64 ni json",
    "",
    Buffer.from("{}").toString("base64url"),
    Buffer.from(JSON.stringify({ g: 2, c: "2026-11-05T10:00:00.000Z", i: "x" })).toString("base64url"),
    Buffer.from(JSON.stringify({ g: -1, c: "2026-11-05T10:00:00.000Z", i: "x" })).toString("base64url"),
    Buffer.from(JSON.stringify({ g: 0, c: 5, i: "x" })).toString("base64url"),
  ])("un cursor ilegible o fuera de su forma da CURSOR_INVALIDO (%j)", (cursor) => {
    expect(() => decodificarCursor(cursor)).toThrow(codigo("CURSOR_INVALIDO"));
  });
});

import { describe, expect, it } from "vitest";
import { normalizarNombre, normalizarTelefono } from "@/dominio/normalizacion";

describe("normalizarNombre (FR-037)", () => {
  it("ignora mayúsculas, acentos y espacios sobrantes", () => {
    expect(normalizarNombre("  María   JOSÉ  Núñez ")).toBe("maria jose nunez");
  });
});

describe("normalizarTelefono (FR-040)", () => {
  it("reduce a dígitos", () => {
    expect(normalizarTelefono("(55) 1234-5678")).toBe("5512345678");
  });

  it.each(["123", "551234567890", "", "teléfono"])("rechaza %j", (texto) => {
    expect(normalizarTelefono(texto)).toBeNull();
  });
});

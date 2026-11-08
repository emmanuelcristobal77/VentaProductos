import { describe, expect, it } from "vitest";
import { calcularTotal, formatearPrecio, parsearPrecio, parsearImporteArchivo } from "@/dominio/dinero";

describe("parsearPrecio (Principio II)", () => {
  it.each([
    ["1250", 125000],
    ["1,250.50", 125050],
    ["0.01", 1],
    ["$1,250.00", 125000],
    ["19.9", 1990],
    ["1,234,567.89", 123456789],
    ["0.07", 7],
    ["1.10", 110],
  ])("convierte %s a %i centavos", (texto, centavos) => {
    expect(parsearPrecio(texto)).toBe(centavos);
  });

  it.each(["0", "0.00", "-5", "1.234", "abc", "", "1,25", "12,34.50", "1.2.3"])("rechaza %j", (texto) => {
    expect(parsearPrecio(texto)).toBeNull();
  });
});

describe("formatearPrecio (FR-039)", () => {
  it.each([
    [125000, "$1,250.00 MXN"],
    [1, "$0.01 MXN"],
    [100, "$1.00 MXN"],
    [123456789, "$1,234,567.89 MXN"],
    [0, "$0.00 MXN"],
  ])("formatea %i como %s", (centavos, texto) => {
    expect(formatearPrecio(centavos)).toBe(texto);
  });
});

describe("calcularTotal (FR-020)", () => {
  it("multiplica precio por cantidad exacto al centavo", () => {
    expect(calcularTotal(1999, 3)).toBe(5997);
    expect(calcularTotal(10, 3)).toBe(30);
  });
});

describe("parsearImporteArchivo (spec 004, caso límite «Importes»)", () => {
  it.each([
    ["1250", 125000],
    ["1250.5", 125050],
    ["1250.00", 125000],
    ["0.01", 1],
    [" 80 ", 8000],
  ])("acepta %j como %i centavos", (texto, centavos) => {
    expect(parsearImporteArchivo(texto)).toBe(centavos);
  });

  it.each(["0", "0.00", "-5", "1,250.00", "$1250", "12.345", "12a", "", " ", "1e3", "12."])(
    "rechaza %j",
    (texto) => {
      expect(parsearImporteArchivo(texto)).toBeNull();
    },
  );
});

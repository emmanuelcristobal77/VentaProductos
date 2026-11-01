import { describe, expect, it } from "vitest";
import { calcularEstado, puedeTransicionar } from "@/dominio/estados";

describe("transiciones de venta", () => {
  it.each([
    ["pagada", "entregada"],
    ["pagada", "anulada"],
    ["entregada", "anulada"],
  ])("permite %s a %s", (de, a) => {
    expect(puedeTransicionar("venta", de, a)).toBe(true);
  });

  it.each([
    ["anulada", "pagada"],
    ["anulada", "entregada"],
    ["entregada", "pagada"],
  ])("rechaza %s a %s", (de, a) => {
    expect(puedeTransicionar("venta", de, a)).toBe(false);
  });
});

describe.each(["apartado", "encargo"] as const)("transiciones de %s", (tipo) => {
  it.each([
    ["pendiente", "pagado"],
    ["pagado", "pendiente"],
    ["pagado", "entregado"],
    ["pendiente", "cancelado"],
    ["pagado", "cancelado"],
  ])("permite %s a %s", (de, a) => {
    expect(puedeTransicionar(tipo, de, a)).toBe(true);
  });

  it.each([
    ["pendiente", "entregado"],
    ["entregado", "cancelado"],
    ["entregado", "pagado"],
    ["cancelado", "pendiente"],
    ["cancelado", "pagado"],
  ])("rechaza %s a %s", (de, a) => {
    expect(puedeTransicionar(tipo, de, a)).toBe(false);
  });
});

describe("calcularEstado (FR-031)", () => {
  it("queda Pendiente mientras hay saldo", () => {
    expect(calcularEstado(10000, 9999)).toBe("pendiente");
  });

  it("pasa a Pagado cuando el saldo llega a cero", () => {
    expect(calcularEstado(10000, 10000)).toBe("pagado");
  });
});

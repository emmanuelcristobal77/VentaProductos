import { describe, expect, it } from "vitest";
import { formatearFecha, formatearHora } from "@/dominio/fechas";

describe("fechas y horas (FR-039)", () => {
  it("muestra el mes escrito y el año completo", () => {
    expect(formatearFecha("2026-10-31T21:05:00Z")).toBe("31 de octubre de 2026");
  });

  it("usa la fecha del centro de México, no la de UTC", () => {
    expect(formatearFecha("2026-11-01T03:00:00Z")).toBe("31 de octubre de 2026");
  });

  it("indica a. m. o p. m. y la zona horaria", () => {
    expect(formatearHora("2026-10-31T21:05:00Z")).toBe("3:05 p. m., hora del centro de México");
    expect(formatearHora("2026-10-31T15:30:00Z")).toBe("9:30 a. m., hora del centro de México");
  });

  it("muestra las 12 del mediodía y de la medianoche", () => {
    expect(formatearHora("2026-10-31T18:00:00Z")).toBe("12:00 p. m., hora del centro de México");
    expect(formatearHora("2026-11-01T06:00:00Z")).toBe("12:00 a. m., hora del centro de México");
  });
});

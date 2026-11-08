import { describe, expect, it } from "vitest";
import {
  armarReporte,
  COLUMNAS,
  COLUMNAS_REPORTE,
  hayQueRevisar,
  leerArchivoProductos,
  MOTIVO,
  nombreReporte,
  textoEjemplo,
  validarRenglon,
  type ResumenCarga,
} from "@/dominio/carga-masiva";

const campos = (nombre: string, fotos = "a.jpg") =>
  [nombre, "Descripción con ñ", "Juguetes", "", "5", "100.00", "250.00", fotos];

const datos = {
  nombre: "x",
  descripcion: "x",
  categoria: "x",
  subcategoria: null,
  existencia: 1,
  precioCompraCentavos: 1,
  precioVentaCentavos: 1,
};

function resumen(): ResumenCarga {
  return {
    fecha: "2026-11-08T00:30:00.000Z",
    cantidades: { nuevos: 1, sinFoto: 1, existentes: 1, sinCambios: 1, rechazados: 2, fotosNoUsadas: 0 },
    sinFoto: [{ numero: 4, campos: campos("Muñeca sin foto", "falta.jpg"), motivo: MOTIVO.fotoNoViene("falta.jpg") }],
    rechazados: [
      { numero: 2, campos: ["Corto", "a", "b", "c", "1", "2"], motivo: MOTIVO.columnas(6) },
      { numero: 6, campos: [...campos("Largo"), "extra"], motivo: MOTIVO.columnas(9) },
    ],
    existentes: [
      {
        numero: 5,
        campos: campos("Pelota"),
        productoId: "p1",
        actual: { ...datos, apartadas: 0, fotos: [] },
        archivo: datos,
        cambios: ["precioVenta", "existencia"],
        fotosNuevas: [],
        fotosFaltantes: [],
      },
    ],
    avisosFotos: [],
  };
}

const renglonesDe = (texto: string) => texto.slice(1).split("\r\n").filter(Boolean);

describe("armarReporte (FR-018 a FR-020, US4)", () => {
  it("US4-1 y FR-020: lleva BOM, renglones \\r\\n y el encabezado del contrato", () => {
    const texto = armarReporte(resumen());
    expect(texto.startsWith("﻿")).toBe(true);
    expect(texto.endsWith("\r\n")).toBe(true);
    expect(texto.replaceAll("\r\n", "")).not.toContain("\n");
    expect(renglonesDe(texto)[0]).toBe(COLUMNAS_REPORTE.join("|"));
  });

  it("US4-2 y FR-019: un renglón por revisar, en orden, con sus columnas, lista y motivo", () => {
    const [, ...filas] = renglonesDe(armarReporte(resumen()));
    expect(filas.map((f) => f.split("|").at(-4))).toEqual(["2", "4", "5", "6"]);
    expect(filas[1]).toBe(
      [...campos("Muñeca sin foto", "falta.jpg"), "4", "Nuevo sin foto", "", "La foto no viene en el comprimido: falta.jpg"].join("|"),
    );
  });

  it("US4-3: antes de confirmar, los existentes dicen «Pendiente de decidir»", () => {
    const [, , , existente] = renglonesDe(armarReporte(resumen()));
    expect(existente.split("|").slice(9)).toEqual(["Ya existe", "Pendiente de decidir", "Cambia: precio de venta, existencia"]);
  });

  it.each([
    [{ tipo: "actualizado" as const }, "Actualizado", "Cambia: precio de venta, existencia"],
    [{ tipo: "noActualizado" as const }, "No actualizado", "Cambia: precio de venta, existencia"],
    [{ tipo: "error" as const, motivo: "La existencia no puede ser menor a las unidades apartadas." }, "No se pudo actualizar", "La existencia no puede ser menor a las unidades apartadas."],
  ])("US4-3: después de confirmar dice el resultado (%j)", (decision, resultado, motivo) => {
    const [, , , existente] = renglonesDe(armarReporte(resumen(), { p1: decision }));
    expect(existente.split("|").slice(10)).toEqual([resultado, motivo]);
  });

  it("completa con vacíos un rechazado de pocas columnas y conserva las de más", () => {
    const [, corto, , , largo] = renglonesDe(armarReporte(resumen()));
    expect(corto.split("|")).toHaveLength(COLUMNAS_REPORTE.length);
    expect(largo.split("|")).toHaveLength(COLUMNAS_REPORTE.length + 1);
  });

  it("US4-4: sin las cuatro últimas columnas, los renglones sirven para una carga nueva", () => {
    const [encabezado, , sinFoto, existente] = renglonesDe(armarReporte(resumen()));
    const recortar = (r: string) => r.split("|").slice(0, COLUMNAS.length).join("|");
    const leidos = leerArchivoProductos(new TextEncoder().encode([encabezado, sinFoto, existente].map(recortar).join("\n")));
    expect(leidos.every((r) => validarRenglon(r.campos).ok)).toBe(true);
  });

  it("SC-006: el número de renglones es sin foto + existentes + rechazados", () => {
    const { cantidades } = resumen();
    expect(renglonesDe(armarReporte(resumen())).length - 1).toBe(cantidades.sinFoto + cantidades.existentes + cantidades.rechazados);
  });

  it("US4-5: no hay nada que revisar sin sin foto, existentes ni rechazados", () => {
    expect(hayQueRevisar(resumen())).toBe(true);
    expect(hayQueRevisar({ ...resumen(), sinFoto: [], existentes: [], rechazados: [] })).toBe(false);
  });
});

describe("nombreReporte y ejemplo", () => {
  it("usa la fecha y hora de México", () => {
    expect(nombreReporte("2026-11-08T00:30:00.000Z")).toBe("reporte-carga-2026-11-07-1830.txt");
  });

  it("FR-004: el ejemplo es un archivo válido con BOM", () => {
    const texto = textoEjemplo();
    expect(texto.startsWith("﻿")).toBe(true);
    const leidos = leerArchivoProductos(new TextEncoder().encode(texto));
    expect(leidos).toHaveLength(2);
    expect(leidos.every((r) => validarRenglon(r.campos).ok)).toBe(true);
  });
});

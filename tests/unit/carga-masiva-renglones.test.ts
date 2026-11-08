import { describe, expect, it } from "vitest";
import {
  COLUMNAS,
  compararConActual,
  leerArchivoProductos,
  MOTIVO,
  RECHAZO,
  revisarEncabezado,
  validarRenglon,
  type DatosComparables,
} from "@/dominio/carga-masiva";

const ENCABEZADO = COLUMNAS.join("|");
const bytes = (texto: string) => new TextEncoder().encode(texto);
const renglon = (cambios: Partial<Record<(typeof COLUMNAS)[number], string>> = {}) => {
  const base = {
    nombre: "Muñeca de trapo",
    descripcion: "Hecha a mano",
    categoria: "Juguetes",
    subcategoria: "Muñecas",
    existencia: "5",
    precio_compra: "120.00",
    precio_venta: "250",
    fotos: "muneca1.jpg,muneca2.jpg",
    ...cambios,
  };
  return COLUMNAS.map((c) => base[c]);
};

const mensajeDe = (accion: () => unknown) => {
  try {
    accion();
  } catch (error) {
    return (error as Error).message;
  }
  return null;
};

describe("leerArchivoProductos (FR-002, FR-003, research 4)", () => {
  it("quita el BOM y acepta \\r\\n y \\n", () => {
    const leidos = leerArchivoProductos(bytes(`﻿${ENCABEZADO}\r\n${renglon().join("|")}\n${renglon({ nombre: "Otro" }).join("|")}`));
    expect(leidos).toHaveLength(2);
    expect(leidos[0].campos[0]).toBe("Muñeca de trapo");
  });

  it("caso límite «Renglones vacíos»: los ignora y conserva el número de renglón del Bloc de notas", () => {
    const leidos = leerArchivoProductos(bytes(`${ENCABEZADO}\n\n${renglon().join("|")}\n   \n${renglon({ nombre: "Otro" }).join("|")}`));
    expect(leidos.map((r) => r.numero)).toEqual([3, 5]);
  });

  it("rechaza un archivo que no está en UTF-8", () => {
    const latin1 = Uint8Array.from([...bytes(`${ENCABEZADO}\nMu`), 0xf1, ...bytes("eca|a|b||1|1|1|x.jpg")]);
    expect(mensajeDe(() => leerArchivoProductos(latin1))).toBe(RECHAZO.noUtf8);
  });

  it("rechaza un archivo sin productos", () => {
    expect(mensajeDe(() => leerArchivoProductos(bytes(`${ENCABEZADO}\n\n`)))).toBe(RECHAZO.sinProductos);
    expect(mensajeDe(() => leerArchivoProductos(bytes("")))).toBe(RECHAZO.sinProductos);
  });

  it("FR-002: rechaza más de 200 renglones de producto", () => {
    const renglones = Array.from({ length: 201 }, (_, i) => renglon({ nombre: `P${i}` }).join("|"));
    expect(mensajeDe(() => leerArchivoProductos(bytes([ENCABEZADO, ...renglones].join("\n"))))).toBe(
      "El archivo trae 201 productos; el máximo por carga es 200.",
    );
  });

  it("acepta exactamente 200 renglones", () => {
    const renglones = Array.from({ length: 200 }, (_, i) => renglon({ nombre: `P${i}` }).join("|"));
    expect(leerArchivoProductos(bytes([ENCABEZADO, ...renglones].join("\n")))).toHaveLength(200);
  });
});

describe("revisarEncabezado (caso límite «Encabezado»)", () => {
  it("acepta mayúsculas, acentos y espacios", () => {
    expect(
      revisarEncabezado([" Nombre", "Descripción", "Categoría", "Subcategoría", "Existencia", "Precio_Compra", "precio_venta", "FOTOS "]),
    ).toBeNull();
  });

  it("dice qué columna falta", () => {
    expect(revisarEncabezado(COLUMNAS.slice(0, 7))).toBe(`${RECHAZO.encabezado}\nFalta la columna «fotos».`);
  });

  it("dice qué columna sobra", () => {
    expect(revisarEncabezado([...COLUMNAS, "color"])).toBe(`${RECHAZO.encabezado}\nSobra la columna «color».`);
  });

  it("dice si el orden es distinto", () => {
    const desordenadas = [COLUMNAS[1], COLUMNAS[0], ...COLUMNAS.slice(2)];
    expect(revisarEncabezado(desordenadas)).toBe(`${RECHAZO.encabezado}\n${RECHAZO.otroOrden}`);
  });
});

describe("validarRenglon (FR-003, FR-006)", () => {
  it("devuelve los datos con importes en centavos y fotos normalizadas", () => {
    const resultado = validarRenglon(renglon({ fotos: " Muñeca.JPG , ,muñeca.jpg, carpeta/Dos.png" }));
    expect(resultado).toEqual({
      ok: true,
      datos: {
        nombre: "Muñeca de trapo",
        descripcion: "Hecha a mano",
        categoria: "Juguetes",
        subcategoria: "Muñecas",
        existencia: 5,
        precioCompraCentavos: 12000,
        precioVentaCentavos: 25000,
        fotos: ["muñeca.jpg", "dos.png"],
      },
    });
  });

  it("acepta existencia 0 y subcategoría vacía, y reduce los espacios repetidos", () => {
    const resultado = validarRenglon(renglon({ nombre: "  Muñeca   de  trapo ", existencia: "0", subcategoria: "" }));
    expect(resultado).toMatchObject({ ok: true, datos: { nombre: "Muñeca de trapo", existencia: 0, subcategoria: null } });
  });

  it.each([
    ["casos límite «Número de columnas» y «Carácter |»: columnas de menos", renglon().slice(0, 7), MOTIVO.columnas(7)],
    ["columnas de más", [...renglon(), "extra"], MOTIVO.columnas(9)],
    ["sin nombre", renglon({ nombre: " " }), MOTIVO.sinNombre],
    ["sin descripción", renglon({ descripcion: "" }), MOTIVO.sinDescripcion],
    ["sin categoría", renglon({ categoria: "" }), MOTIVO.sinCategoria],
    ["categoría «Todos»", renglon({ categoria: "todos" }), MOTIVO.todos],
    ["subcategoría «Todos»", renglon({ subcategoria: "TODOS" }), MOTIVO.todos],
    ["existencia negativa", renglon({ existencia: "-1" }), MOTIVO.existencia],
    ["existencia con decimales", renglon({ existencia: "2.5" }), MOTIVO.existencia],
    ["existencia con letras", renglon({ existencia: "a" }), MOTIVO.existencia],
    ["existencia vacía", renglon({ existencia: "" }), MOTIVO.existencia],
    ["precio de compra en cero", renglon({ precio_compra: "0" }), MOTIVO.precioCompra],
    ["precio de venta con comas", renglon({ precio_venta: "1,250.00" }), MOTIVO.precioVenta],
  ])("FR-006: rechaza %s", (_, campos, motivo) => {
    expect(validarRenglon(campos)).toEqual({ ok: false, motivo });
  });

  it("informa el primer motivo en el orden del contrato", () => {
    expect(validarRenglon(renglon({ descripcion: "", precio_venta: "0" }))).toEqual({ ok: false, motivo: MOTIVO.sinDescripcion });
  });
});

describe("compararConActual (FR-012)", () => {
  const actual: DatosComparables = {
    nombre: "Muñeca de trapo",
    descripcion: "Hecha a mano",
    categoria: "Juguetes",
    subcategoria: null,
    existencia: 5,
    precioCompraCentavos: 12000,
    precioVentaCentavos: 25000,
  };

  it("sin diferencias no hay cambios, aunque cambien mayúsculas y acentos", () => {
    expect(compararConActual(actual, { ...actual, nombre: "Muneca de Trapo", categoria: "juguetes" }, false)).toEqual([]);
  });

  it("detecta cada campo distinto y las fotos nuevas", () => {
    const archivo = { ...actual, descripcion: "Otra", subcategoria: "Muñecas", existencia: 8, precioVentaCentavos: 25001 };
    expect(compararConActual(actual, archivo, true)).toEqual([
      "descripcion",
      "subcategoria",
      "existencia",
      "precioVenta",
      "fotos",
    ]);
  });
});

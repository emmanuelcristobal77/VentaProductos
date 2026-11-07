import { describe, expect, it } from "vitest";
import { AVISO_PRIVACIDAD } from "@/lib/aviso-privacidad";
import { DIAS_CONSERVADOS } from "@/lib/respaldo";

const texto = (id: string) =>
  AVISO_PRIVACIDAD.secciones.find((s) => s.id === id)?.parrafos.join(" ") ?? "";

describe("FR-004 y SC-005: elementos mínimos del aviso de privacidad", () => {
  it("FR-004: nombra al responsable, su domicilio y el correo para los derechos", () => {
    expect(AVISO_PRIVACIDAD.responsable).toBe("Emmanuel Cristóbal Trejo");
    expect(AVISO_PRIVACIDAD.domicilio).toBe(
      "Andador Poleo No. 20, Col. La Magdalena Chichicaspa, Huixquilucan, Estado de México",
    );
    expect(AVISO_PRIVACIDAD.correo).toBe("emmanuelcristobal@yahoo.com.mx");
  });

  it("FR-004: tiene una fecha de última actualización válida", () => {
    expect(AVISO_PRIVACIDAD.actualizado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(AVISO_PRIVACIDAD.actualizado))).toBe(false);
  });

  it("FR-006: tiene las 8 secciones del contrato, en orden, con título y texto", () => {
    expect(AVISO_PRIVACIDAD.secciones.map((s) => s.titulo)).toEqual([
      "Responsable",
      "Datos que recabamos",
      "Para qué los usamos",
      "Con quién los compartimos",
      "Cuánto tiempo los guardamos",
      "Tus derechos y cómo ejercerlos",
      "Dudas",
      "Cambios a este aviso",
    ]);
    for (const seccion of AVISO_PRIVACIDAD.secciones) {
      expect(seccion.parrafos.length).toBeGreaterThan(0);
      for (const parrafo of seccion.parrafos) expect(parrafo.trim()).not.toBe("");
    }
  });

  it("FR-004: dice qué datos se recaban y para qué se usan", () => {
    expect(texto("datos")).toMatch(/nombre/);
    expect(texto("datos")).toMatch(/teléfono/);
    expect(texto("datos")).toMatch(/apartados/);
    expect(texto("datos")).toMatch(/pagos/);
    expect(texto("finalidades")).toMatch(/consultar/);
  });

  it("FR-004: no usa los datos para publicidad y menciona a los proveedores de tecnología", () => {
    expect(texto("terceros")).toMatch(/publicidad/);
    expect(texto("terceros")).toMatch(/proveedores de tecnología/);
  });

  it("FR-004 y research 8: conserva hasta que el cliente pida borrar, sin borrado automático, y da el plazo de los respaldos", () => {
    const conservacion = texto("conservacion");
    expect(conservacion).toMatch(/hasta que (nos )?pidas borrarlos/);
    expect(conservacion).toMatch(/no se borran de forma automática/i);
    expect(conservacion).toContain(`${DIAS_CONSERVADOS} días`);
  });

  it("FR-004: explica los derechos de acceso, rectificación, cancelación y oposición, y la revocación", () => {
    const derechos = texto("derechos");
    for (const palabra of ["acceso", "rectificación", "cancelación", "oposición", "revocar", "identificación"]) {
      expect(derechos).toContain(palabra);
    }
  });

  it("FR-004: dice que los cambios se publican en la misma página", () => {
    expect(texto("cambios")).toMatch(/esta (misma )?página/);
  });
});

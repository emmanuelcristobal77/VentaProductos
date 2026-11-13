import { describe, expect, it } from "vitest";
import { antesDeEnviarUmami, EVENTO_INTERES, NOMBRE_FILTRO, paginaActual, UMAMI } from "@/lib/estadisticas";

describe("Spec 006: constantes del servicio de estadísticas", () => {
  it("FR-003: apunta al Umami del propietario y solo cuenta el dominio de producción", () => {
    expect(UMAMI.script).toBe("https://estadisticas.cristobalia.com/script.js");
    expect(UMAMI.idSitio).toBe("49b620b8-b094-49c2-9ff2-edf6ba9d0c38");
    expect(UMAMI.dominios).toBe("app.cristobalia.com");
  });

  it("FR-006: el evento de interés se llama interes-telefono", () => {
    expect(EVENTO_INTERES).toBe("interes-telefono");
  });

  it("FR-002: el filtro se publica con el nombre del contrato", () => {
    expect(NOMBRE_FILTRO).toBe("antesDeEnviarUmami");
  });
});

describe("FR-002: antesDeEnviarUmami descarta el panel", () => {
  it.each(["/admin", "/admin/", "/admin/operaciones/3", "https://app.cristobalia.com/admin/promocion", "/admin?x=1"])(
    "descarta %s",
    (url) => {
      expect(antesDeEnviarUmami("event", { url })).toBe(false);
    },
  );

  it.each(["/", "/producto/12?utm_source=whatsapp", "/administrador-falso", "https://app.cristobalia.com/encargos"])(
    "deja pasar %s sin cambios",
    (url) => {
      const carga = { url, website: "x" };
      expect(antesDeEnviarUmami("event", carga)).toBe(carga);
    },
  );

  it("deja pasar una carga sin url", () => {
    const carga = { name: "interes-telefono" };
    expect(antesDeEnviarUmami("event", carga)).toBe(carga);
  });
});

describe("FR-006: paginaActual", () => {
  it("devuelve la ruta tal cual, sin agregar consulta ni #", () => {
    expect(paginaActual("/producto/12")).toBe("/producto/12");
    expect(paginaActual("/")).toBe("/");
  });
});

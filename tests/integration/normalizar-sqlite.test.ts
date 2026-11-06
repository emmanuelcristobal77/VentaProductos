import { describe, expect, it } from "vitest";
import { usarBaseTemporal } from "./arnes";
import { obtenerBd } from "@/db/cliente";
import { normalizarNombre } from "@/dominio/normalizacion";

describe("función normalizar() de SQLite (research 1)", () => {
  usarBaseTemporal();

  const enSqlite = (valor: string | null) =>
    (obtenerBd().$client.prepare("SELECT normalizar(?) AS v").get(valor) as { v: string | null }).v;

  it.each(["Ñandú", "  Muñeca  ", "ÁRBOL"])("da lo mismo que normalizarNombre para %j", (texto) => {
    expect(enSqlite(texto)).toBe(normalizarNombre(texto));
  });

  it("devuelve null para null", () => {
    expect(enSqlite(null)).toBeNull();
  });
});

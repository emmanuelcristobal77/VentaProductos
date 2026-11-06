import { expect, test } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

const COMPRA_UNICA = "3141.59";

test.describe("Contrato: rutas de búsqueda y paginación", () => {
  test("FR-009: /api/catalogo no devuelve precioCompraCentavos ni existencia", async ({ page, request }) => {
    await entrar(page);
    const nombre = nombreUnico("Contrato");
    await altaProducto(page, { nombre, precioCompra: COMPRA_UNICA });

    const respuesta = await request.get(`/api/catalogo?texto=${encodeURIComponent(nombre)}`);
    expect(respuesta.status()).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.ok).toBe(true);
    expect(cuerpo.datos.productos.map((p: { nombre: string }) => p.nombre)).toEqual([nombre]);
    for (const producto of cuerpo.datos.productos) {
      expect(producto).not.toHaveProperty("precioCompraCentavos");
      expect(producto).not.toHaveProperty("existencia");
    }
    const texto = JSON.stringify(cuerpo);
    expect(texto).not.toContain("314159");
    expect(texto.toLowerCase()).not.toContain("compra");
  });

  test("/api/admin/productos sin sesión da 401 con NO_AUTORIZADO", async ({ playwright, baseURL }) => {
    const anonimo = await playwright.request.newContext({ baseURL });
    const respuesta = await anonimo.get("/api/admin/productos");
    expect(respuesta.status()).toBe(401);
    expect(await respuesta.json()).toMatchObject({ ok: false, codigo: "NO_AUTORIZADO" });
    await anonimo.dispose();
  });

  test("un cursor alterado da 400 con CURSOR_INVALIDO", async ({ page, request }) => {
    const alterado = Buffer.from(JSON.stringify({ g: 7, c: "x", i: "y" })).toString("base64url");
    const publico = await request.get(`/api/catalogo?cursor=${alterado}`);
    expect(publico.status()).toBe(400);
    expect(await publico.json()).toMatchObject({ ok: false, codigo: "CURSOR_INVALIDO" });

    await entrar(page);
    const admin = await page.request.get("/api/admin/productos?cursor=no-es-un-cursor");
    expect(admin.status()).toBe(400);
    expect(await admin.json()).toMatchObject({ ok: false, codigo: "CURSOR_INVALIDO" });
  });

  test("las dos rutas responden con Cache-Control: no-store", async ({ page, request }) => {
    expect((await request.get("/api/catalogo")).headers()["cache-control"]).toContain("no-store");
    expect((await request.get("/api/catalogo?limite=5")).headers()["cache-control"]).toContain("no-store");
    expect((await request.get("/api/admin/productos")).headers()["cache-control"]).toContain("no-store");

    await entrar(page);
    expect((await page.request.get("/api/admin/productos")).headers()["cache-control"]).toContain("no-store");
  });
});

import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { zipSync } from "fflate";
import { entrar, nombreUnico } from "./ayudantes";
import { cantidad, comprimido, renglon, subirCarga } from "./ayudantes-carga";

const axeSinViolaciones = async (page: import("@playwright/test").Page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
};

test.describe("US13: carga masiva (spec 004, historias 1 y 2)", () => {
  test("US1-1 y FR-004: la opción, las instrucciones y el ejemplo", async ({ page }) => {
    await entrar(page);
    await page.getByRole("link", { name: "Carga masiva" }).click();
    await expect(page.getByRole("heading", { name: "Carga masiva de productos" })).toBeVisible();
    await expect(page.getByText("Hasta 200 productos y un comprimido de hasta 50 MB.")).toBeVisible();
    await expect(page.getByText("precio_compra", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/^Playera infantil rayada\|/)).toBeVisible();

    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar archivo de ejemplo" }).click(),
    ]);
    expect(descarga.suggestedFilename()).toBe("ejemplo-carga-masiva.txt");
    const contenido = await (await descarga.createReadStream()).toArray();
    const texto = Buffer.concat(contenido).toString("utf8");
    expect(texto.startsWith("﻿nombre|descripcion|")).toBe(true);
    expect(texto).toContain("Muñeca de trapo");

    await axeSinViolaciones(page);
  });

  test("US1-2, US1-5 y SC-002: da de alta los nuevos y muestra los rechazados", async ({ page }) => {
    await entrar(page);
    const base = nombreUnico("Carga");
    const nombres = [1, 2, 3].map((i) => `${base} ${i}`);
    await subirCarga(
      page,
      comprimido([...nombres.map((n) => renglon(n, { fotos: "Roja.JPG" })), renglon(`${base} malo`, { precio_venta: "0" })]),
    );

    await expect(page.getByText(/^Carga del \d+ de [a-z]+ de \d{4}, \d+:\d{2} (a|p)\. m\., hora del centro de México$/)).toBeVisible();
    await expect(cantidad(page, "Productos nuevos")).toHaveText("3");
    const rechazados = page.getByRole("region", { name: "Renglones rechazados" });
    await expect(rechazados).toContainText("Renglón 5");
    await expect(rechazados).toContainText("El precio de venta debe ser mayor a cero");
    await axeSinViolaciones(page);

    await page.getByRole("link", { name: "Ir a productos" }).click();
    for (const nombre of nombres) await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
    await page.goto("/");
    await page.getByRole("searchbox").fill(base);
    await expect(page.getByRole("status")).toHaveText("3 productos encontrados");
    await expect(page.getByRole("article").filter({ hasText: base })).toHaveCount(3);
  });

  test("US1-6: un comprimido sin archivo de productos no registra nada y lo explica", async ({ page }) => {
    await entrar(page);
    await page.goto("/admin/productos/carga-masiva");
    const campo = page.getByLabel("Comprimido .zip con productos y fotos");
    const sinTxt = comprimido([]);
    sinTxt.buffer = Buffer.from(zipSync({ "roja.jpg": new Uint8Array([1, 2, 3]) }));
    await campo.setInputFiles(sinTxt);
    await page.getByRole("button", { name: "Subir y procesar" }).click();
    const error = page.getByText("El comprimido no trae el archivo de productos (.txt).");
    await expect(error).toBeVisible();
    await expect(campo).toHaveAttribute("aria-describedby", (await error.getAttribute("id"))!);

    // Playwright no acepta búferes de más de 50 MB en setInputFiles; se usa un archivo temporal.
    mkdirSync("test-results", { recursive: true });
    writeFileSync("test-results/grande.zip", Buffer.alloc(52_428_801));
    await campo.setInputFiles("test-results/grande.zip");
    await page.getByRole("button", { name: "Subir y procesar" }).click();
    await expect(page.getByText("El comprimido pasa de 50 MB. Divide los productos en varias cargas.")).toBeVisible();
  });

  test("US1-7: sin sesión no hay carga masiva", async ({ page, request }) => {
    await page.goto("/admin/productos/carga-masiva");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    const respuesta = await request.post("/api/admin/cargas", { data: Buffer.from("x") });
    expect(respuesta.status()).toBe(401);
  });

  test("US2: los nuevos sin foto no se registran y se avisan las fotos faltantes", async ({ page }) => {
    await entrar(page);
    const base = nombreUnico("Foto");
    await subirCarga(
      page,
      comprimido([
        renglon(`${base} con foto`),
        renglon(`${base} media`, { fotos: "falta.jpg,azul.png" }),
        renglon(`${base} sin foto`, { fotos: "no-viene.jpg" }),
      ]),
    );

    await expect(cantidad(page, "Productos nuevos")).toHaveText("2");
    const sinFoto = page.getByRole("region", { name: "Productos nuevos sin foto" });
    await expect(sinFoto).toContainText("Renglón 4");
    await expect(sinFoto).toContainText(`${base} sin foto`);
    await expect(sinFoto).toContainText("La foto no viene en el comprimido: no-viene.jpg");
    await expect(page.getByRole("region", { name: "Avisos de fotos" })).toContainText("No viene en el comprimido: falta.jpg");

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: `${base} media` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${base} sin foto` })).toHaveCount(0);
  });
});

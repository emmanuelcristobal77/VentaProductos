import { expect, test, type Page } from "@playwright/test";
import { entrar, insertarProductosDePrueba, nombreUnico } from "./ayudantes";
import { comprimido, renglon, subirCarga } from "./ayudantes-carga";

async function descargarReporte(page: Page) {
  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar reporte" }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^reporte-carga-\d{4}-\d{2}-\d{2}-\d{4}\.txt$/);
  return Buffer.concat(await (await descarga.createReadStream()).toArray()).toString("utf8");
}

test.describe("US15: reporte de la carga (spec 004, historia 4)", () => {
  test("US4-1 a US4-3 y SC-006: trae los renglones por revisar, antes y después de confirmar", async ({ page }) => {
    await entrar(page);
    const base = nombreUnico("Reporte");
    const [existente] = await insertarProductosDePrueba([{ nombre: `${base} existente` }]);
    await subirCarga(
      page,
      comprimido([
        renglon(`${base} sin foto`, { fotos: "" }),
        renglon(existente, { precio_venta: "1000.00" }),
        renglon(`${base} rechazado`, { existencia: "x" }),
      ]),
    );

    const antes = await descargarReporte(page);
    expect(antes.startsWith("﻿")).toBe(true);
    const renglones = antes.slice(1).split("\r\n").filter(Boolean);
    expect(renglones).toHaveLength(4);
    expect(antes).toContain("|2|Nuevo sin foto||El renglón no indica foto");
    expect(antes).toContain("|3|Ya existe|Pendiente de decidir|Cambia: precio de venta");
    expect(antes).toContain("|4|Rechazado||La existencia debe ser un número entero de 0 en adelante.");

    await page.getByRole("checkbox", { name: `Actualizar «${existente}»` }).check();
    await page.getByRole("button", { name: "Actualizar marcados (1)" }).click();
    await expect(page.getByText("Se actualizó 1 producto.")).toBeVisible();
    expect(await descargarReporte(page)).toContain("|3|Ya existe|Actualizado|Cambia: precio de venta");
  });

  test("US4-5: sin nada que revisar no ofrece el reporte", async ({ page }) => {
    await entrar(page);
    await subirCarga(page, comprimido([renglon(nombreUnico("Limpio"))]));
    await expect(page.getByText("No hay nada que revisar.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Descargar reporte" })).toHaveCount(0);
  });
});

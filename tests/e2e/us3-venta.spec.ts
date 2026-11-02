import { expect, test } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

test.describe("US3: registrar una venta", () => {
  test("US3-1: con disponibilidad ofrece venta y apartado, no encargo", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Dado");
    await altaProducto(page, { nombre });
    const fila = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(fila.getByRole("button", { name: /^Vender/ })).toBeVisible();
    await expect(fila.getByRole("button", { name: /^Apartar/ })).toBeVisible();
    await expect(fila.getByRole("button", { name: /^Encargar/ })).toHaveCount(0);
  });

  test("US3-2 a US3-6: vende con otro precio, entrega y anula", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Trompo");
    await altaProducto(page, { nombre, existencia: "5", precioVenta: "1,250.00" });
    const fila = page.getByRole("listitem").filter({ hasText: nombre });

    // US3-2 y US3-3: precio propuesto editable, sin comprador.
    await fila.getByRole("button", { name: /^Vender/ }).click();
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByLabel("Precio acordado")).toHaveValue("1250.00");
    await hoja.getByLabel("Cantidad").fill("2");
    await hoja.getByLabel("Precio acordado").fill("1,100.00");
    await hoja.getByRole("button", { name: "Registrar venta" }).click();

    await expect(page.getByRole("heading", { name: /Venta/ })).toBeVisible();
    await expect(page.getByText("$2,200.00 MXN").first()).toBeVisible();
    await expect(page.getByText("Pagada", { exact: true })).toBeVisible();
    const detalle = page.url();

    // US3-4: la disponibilidad baja y el catálogo conserva su precio.
    await page.goto("/");
    const tarjeta = page.getByRole("article").filter({ hasText: nombre });
    await expect(tarjeta).toContainText("$1,250.00 MXN");
    await expect(tarjeta).toContainText("3 disponibles");

    // US3-5: entrega.
    await page.goto(detalle);
    await page.getByRole("button", { name: "Marcar entregada" }).click();
    await expect(page.getByText("Entregada", { exact: true })).toBeVisible();

    // US3-6: anulación con motivo.
    await page.getByRole("button", { name: "Anular venta" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("motivo");
    await page.getByRole("dialog").getByLabel("Motivo").fill("Se capturó por error");
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Anulada", { exact: true })).toBeVisible();
    await expect(page.getByText("Se capturó por error")).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText("Disponible: 5");
  });

  test("Caso límite: una cantidad mayor a la disponible indica cuántas hay", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Yoyo");
    await altaProducto(page, { nombre, existencia: "2" });
    const fila = page.getByRole("listitem").filter({ hasText: nombre });
    await fila.getByRole("button", { name: /^Vender/ }).click();
    const hoja = page.getByRole("dialog");
    await hoja.getByLabel("Cantidad").fill("3");
    await hoja.getByRole("button", { name: "Registrar venta" }).click();
    await expect(hoja.getByRole("alert")).toContainText("2");
  });
});

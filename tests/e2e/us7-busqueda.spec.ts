import { expect, test, type Page } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

async function apartar(pagina: Page, nombre: string, cliente: string, telefono: string) {
  await pagina.goto("/admin");
  await pagina.getByRole("listitem").filter({ hasText: nombre }).getByRole("button", { name: /^Apartar/ }).click();
  const hoja = pagina.getByRole("dialog");
  await hoja.getByLabel("Nombre del cliente").fill(cliente);
  await hoja.getByLabel("Teléfono").fill(telefono);
  // Spec 003, FR-008: la casilla del aviso de privacidad es obligatoria.
  await hoja.getByRole("checkbox", { name: "Se informó al cliente del aviso de privacidad" }).check();
  await hoja.getByLabel("Pago inicial").fill("100.00");
  await hoja.getByRole("button", { name: "Registrar apartado" }).click();
  await expect(pagina.getByRole("heading", { name: /Apartado/ })).toBeVisible();
}

function hoyEnMexico() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

test.describe("US7: buscar operaciones", () => {
  test("US7-2 y US7-3: busca por nombre y teléfono y abre el desglose", async ({ page }) => {
    await entrar(page);
    const producto = nombreUnico("Reloj");
    const cliente = nombreUnico("Marta");
    const otro = nombreUnico("Pedro");
    await altaProducto(page, { nombre: producto });
    await apartar(page, producto, cliente, "5533334444");
    await apartar(page, producto, otro, "5555556666");

    await page.goto("/admin/operaciones");
    await page.getByLabel("Nombre").fill(cliente.toUpperCase());
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: cliente })).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ hasText: otro })).toHaveCount(0);

    await page.getByLabel("Nombre").fill("");
    await page.getByLabel("Teléfono").fill("55 5555 6666");
    await page.getByRole("button", { name: "Buscar" }).click();
    const fila = page.getByRole("listitem").filter({ hasText: otro });
    await expect(fila).toHaveCount(1);

    await fila.getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1, name: /Apartado/ })).toBeVisible();
    await expect(page.getByTestId("saldo")).toBeVisible();
    await expect(page.getByText("Pendiente", { exact: true })).toBeVisible();
  });

  test("US7-1 y US7-4: encuentra por fecha una venta sin comprador", async ({ page }) => {
    await entrar(page);
    const producto = nombreUnico("Lámpara");
    await altaProducto(page, { nombre: producto });
    await page.getByRole("listitem").filter({ hasText: producto }).getByRole("button", { name: /^Vender/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Registrar venta" }).click();
    await expect(page.getByRole("heading", { name: /Venta/ })).toBeVisible();

    await page.goto("/admin/operaciones");
    await page.getByLabel("Desde").fill(hoyEnMexico());
    await page.getByLabel("Hasta").fill(hoyEnMexico());
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: producto })).toContainText("Venta");

    await page.getByLabel("Desde").fill("2020-01-01");
    await page.getByLabel("Hasta").fill("2020-01-02");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText("No se encontraron operaciones.")).toBeVisible();
  });

  test("Sin datos válidos indica el problema", async ({ page }) => {
    await entrar(page);
    await page.goto("/admin/operaciones");
    await page.getByLabel("Teléfono").fill("123");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "10 dígitos" })).toBeVisible();
  });
});

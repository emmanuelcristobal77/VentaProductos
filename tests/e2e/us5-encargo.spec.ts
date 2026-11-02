import { expect, test, type Page } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

async function llenarCliente(pagina: Page) {
  const hoja = pagina.getByRole("dialog");
  await hoja.getByLabel("Nombre del cliente").fill("Ana López");
  await hoja.getByLabel("Teléfono").fill("5512345678");
}

/** Crea un producto y lo agota con una venta. */
async function productoAgotado(pagina: Page, nombre: string) {
  await altaProducto(pagina, { nombre, existencia: "1" });
  await pagina.getByRole("listitem").filter({ hasText: nombre }).getByRole("button", { name: /^Vender/ }).click();
  await pagina.getByRole("dialog").getByRole("button", { name: "Registrar venta" }).click();
  await expect(pagina.getByRole("heading", { name: /Venta/ })).toBeVisible();
  await pagina.goto("/admin");
}

test.describe("US5: encargos", () => {
  test("US5-1, US5-4 a US5-6: encarga un producto agotado, paga y entrega", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Pelota");
    await productoAgotado(page, nombre);

    // US5-1: sin disponibilidad solo se ofrece encargo.
    const fila = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(fila.getByRole("button", { name: /^Vender/ })).toHaveCount(0);
    await expect(fila.getByRole("button", { name: /^Apartar/ })).toHaveCount(0);
    await fila.getByRole("button", { name: /^Encargar/ }).click();

    await llenarCliente(page);
    const hoja = page.getByRole("dialog");
    await hoja.getByLabel("Cantidad").fill("2");
    await hoja.getByLabel("Precio acordado").fill("100.00");
    await hoja.getByLabel("Anticipo").fill("50.00");
    await hoja.getByRole("button", { name: "Registrar encargo" }).click();
    await expect(page.getByRole("heading", { name: /Encargo/ })).toBeVisible();
    const detalle = page.url();

    // US5-4: aparece en pendientes con su saldo.
    await page.goto("/admin/encargos");
    const pendiente = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(pendiente).toContainText("Ana López");
    await expect(pendiente).toContainText("Cantidad: 2");
    await expect(pendiente).toContainText("Pagado: $50.00 MXN");
    await expect(pendiente).toContainText("Saldo: $150.00 MXN");

    // US5-6: al entregar sale de pendientes.
    await page.goto(detalle);
    await page.getByLabel("Importe del pago").fill("150.00");
    await page.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByText("Pagado", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Marcar entregado" }).click();
    await expect(page.getByText("Entregado", { exact: true })).toBeVisible();

    await page.goto("/admin/encargos");
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toHaveCount(0);

    // US5-5: la existencia no cambió.
    await page.goto("/admin");
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText("Disponible: 0");
  });

  test("US5-2: encarga un artículo que no está en el catálogo", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Triciclo");
    await page.goto("/admin/encargos");
    await page.getByRole("button", { name: "Nuevo encargo" }).click();
    const hoja = page.getByRole("dialog");
    await hoja.getByLabel("Artículo", { exact: true }).fill(nombre);
    await hoja.getByLabel("Descripción").fill("Rojo con canasta");
    await hoja.getByLabel("Precio acordado").fill("800.00");
    await llenarCliente(page);
    await hoja.getByLabel("Anticipo").fill("100.00");
    await hoja.getByRole("button", { name: "Registrar encargo" }).click();
    await expect(page.getByRole("heading", { name: new RegExp(nombre) })).toBeVisible();

    await page.goto("/encargos");
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText("$800.00 MXN");
  });

  test("US5-3: sin datos obligatorios no se guarda e indica qué falta", async ({ page }) => {
    await entrar(page);
    await page.goto("/admin/encargos");
    await page.getByRole("button", { name: "Nuevo encargo" }).click();
    const hoja = page.getByRole("dialog");
    await hoja.getByRole("button", { name: "Registrar encargo" }).click();
    await expect(hoja.getByText("Escribe el nombre del cliente.")).toBeVisible();
    await expect(hoja.getByText("Escribe un anticipo mayor a cero.")).toBeVisible();
  });

  test("US5-7: cancelar lo saca de pendientes y conserva los pagos", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Muñeco");
    await productoAgotado(page, nombre);
    await page.getByRole("listitem").filter({ hasText: nombre }).getByRole("button", { name: /^Encargar/ }).click();
    await llenarCliente(page);
    await page.getByRole("dialog").getByLabel("Anticipo").fill("10.00");
    await page.getByRole("dialog").getByRole("button", { name: "Registrar encargo" }).click();
    await expect(page.getByRole("heading", { name: /Encargo/ })).toBeVisible();

    await page.getByRole("button", { name: "Cancelar encargo" }).click();
    await page.getByRole("dialog").getByLabel("Motivo").fill("Ya no lo quiere");
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "$10.00 MXN" })).toContainText("No devuelto");

    await page.goto("/admin/encargos");
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toHaveCount(0);
  });

  test("FR-025: administra artículos por encargo", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Columpio");
    await page.goto("/admin/articulos-encargo");
    await page.getByLabel("Nombre").fill(nombre);
    await page.getByLabel("Descripción").fill("De madera");
    await page.getByLabel("Precio").fill("1,500.00");
    await page.getByRole("button", { name: "Guardar artículo" }).click();

    const fila = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(fila).toContainText("$1,500.00 MXN");
    await fila.getByRole("button", { name: /^Dar de baja/ }).click();
    await page.getByRole("button", { name: "Confirmar baja" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toHaveCount(0);
  });
});

import { expect, test, type Page } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

async function apartar(pagina: Page, nombre: string, cantidad: string, precio: string, inicial: string) {
  const fila = pagina.getByRole("listitem").filter({ hasText: nombre });
  await fila.getByRole("button", { name: /^Apartar/ }).click();
  const hoja = pagina.getByRole("dialog");
  await hoja.getByLabel("Cantidad").fill(cantidad);
  await hoja.getByLabel("Precio acordado").fill(precio);
  await hoja.getByLabel("Nombre del cliente").fill("Ana López");
  await hoja.getByLabel("Teléfono").fill("55 1234 5678");
  // Spec 003, FR-008: la casilla del aviso de privacidad es obligatoria.
  await hoja.getByRole("checkbox", { name: "Se informó al cliente del aviso de privacidad" }).check();
  await hoja.getByLabel("Pago inicial").fill(inicial);
  await hoja.getByRole("button", { name: "Registrar apartado" }).click();
  await expect(pagina.getByRole("heading", { name: /Apartado/ })).toBeVisible();
}

async function pagar(pagina: Page, importe: string) {
  await pagina.getByLabel("Importe del pago").fill(importe);
  await pagina.getByRole("button", { name: "Registrar pago" }).click();
}

test.describe("US4: apartar y registrar pagos", () => {
  test("US4-1: sin datos obligatorios no se guarda e indica qué falta", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Globo");
    await altaProducto(page, { nombre });
    await page.getByRole("listitem").filter({ hasText: nombre }).getByRole("button", { name: /^Apartar/ }).click();
    const hoja = page.getByRole("dialog");
    await hoja.getByRole("button", { name: "Registrar apartado" }).click();
    await expect(hoja.getByText("Escribe el nombre del cliente.")).toBeVisible();
    await expect(hoja.getByText("Escribe un teléfono de 10 dígitos.")).toBeVisible();
    await expect(hoja.getByText("Escribe un pago inicial mayor a cero.")).toBeVisible();
  });

  test("US4-2 a US4-7: aparta, abona, rechaza excedentes y entrega", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Bici");
    await altaProducto(page, { nombre, existencia: "5" });

    await apartar(page, nombre, "2", "250.00", "100.00");
    await expect(page.getByText("Pendiente", { exact: true })).toBeVisible();
    const detalle = page.url();

    // US4-2: la disponibilidad baja en el catálogo.
    await page.goto("/");
    await expect(page.getByRole("article").filter({ hasText: nombre })).toContainText("3 disponibles");
    await page.goto(detalle);

    // US4-6: no se entrega con saldo.
    await page.getByRole("button", { name: "Marcar entregado" }).click();
    await expect(page.getByText("No se puede entregar mientras exista saldo restante.")).toBeVisible();

    // US4-3: el desglose muestra el pago y el saldo.
    await pagar(page, "300.00");
    await expect(page.getByTestId("saldo")).toHaveText("$100.00 MXN");
    await expect(page.getByRole("listitem").filter({ hasText: "$300.00 MXN" })).toContainText("hora del centro de México");

    // US4-4: se rechaza un pago mayor al saldo.
    await pagar(page, "150.00");
    await expect(page.getByRole("alert").filter({ hasText: "$100.00 MXN" })).toBeVisible();

    // US4-5: el pago exacto cambia a Pagado.
    await pagar(page, "100.00");
    await expect(page.getByText("Pagado", { exact: true })).toBeVisible();

    // US4-7: la entrega baja la existencia, no la disponibilidad.
    await page.getByRole("button", { name: "Marcar entregado" }).click();
    await expect(page.getByText("Entregado", { exact: true })).toBeVisible();
    await page.goto("/admin");
    const fila = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(fila).toContainText("Existencia: 3");
    await expect(fila).toContainText("Disponible: 3");
  });

  test("US4-8: cancelar regresa las unidades y conserva los pagos", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Patín");
    await altaProducto(page, { nombre, existencia: "5" });
    await apartar(page, nombre, "2", "100.00", "50.00");

    await page.getByRole("button", { name: "Cancelar apartado" }).click();
    await page.getByRole("dialog").getByLabel("Motivo").fill("Ya no lo quiere");
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();

    await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
    await expect(page.getByText("Ya no lo quiere")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "$50.00 MXN" })).toContainText("No devuelto");

    await page.goto("/admin");
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText("Disponible: 5");
  });

  test("US4-9: corrige el precio, sin bajar el total de lo pagado", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Casita");
    await altaProducto(page, { nombre });
    await apartar(page, nombre, "1", "500.00", "300.00");

    await page.getByRole("button", { name: "Corregir datos" }).click();
    const hoja = page.getByRole("dialog");
    await hoja.getByLabel("Precio acordado").fill("200.00");
    await hoja.getByRole("button", { name: "Guardar corrección" }).click();
    await expect(hoja.getByRole("alert")).toContainText("por debajo de lo ya pagado");

    await hoja.getByLabel("Precio acordado").fill("400.00");
    await hoja.getByRole("button", { name: "Guardar corrección" }).click();
    await expect(page.getByTestId("saldo")).toHaveText("$100.00 MXN");
  });
});

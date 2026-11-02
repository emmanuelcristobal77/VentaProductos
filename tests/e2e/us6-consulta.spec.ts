import { expect, test } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

// Cada escenario usa su propia IP: el límite de FR-044 cuenta por IP.
const ipDePrueba = (ultimo: number) => ({ "x-real-ip": `198.51.100.${ultimo}` });

async function apartadoConDosPagos(page: import("@playwright/test").Page, nombre: string, cliente: string, telefono: string) {
  await entrar(page);
  await altaProducto(page, { nombre, precioCompra: "777.77" });
  await page.getByRole("listitem").filter({ hasText: nombre }).getByRole("button", { name: /^Apartar/ }).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByLabel("Precio acordado").fill("500.00");
  await hoja.getByLabel("Nombre del cliente").fill(cliente);
  await hoja.getByLabel("Teléfono").fill(telefono);
  await hoja.getByLabel("Pago inicial").fill("100.00");
  await hoja.getByRole("button", { name: "Registrar apartado" }).click();
  await expect(page.getByRole("heading", { name: /Apartado/ })).toBeVisible();
  await page.getByLabel("Importe del pago").fill("150.00");
  await page.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByTestId("saldo")).toHaveText("$250.00 MXN");
}

test.describe("US6: consulta del cliente", () => {
  test("US6-1 y US6-3: ve su desglose, sin precio de compra", async ({ browser, page }) => {
    const nombre = nombreUnico("Consola");
    const cliente = nombreUnico("Clara Ruiz");
    await apartadoConDosPagos(page, nombre, cliente, "5511112222");

    const contexto = await browser.newContext({ extraHTTPHeaders: ipDePrueba(1) });
    const publica = await contexto.newPage();
    await publica.goto("/mis-apartados");
    await publica.getByLabel("Nombre").fill(cliente.toUpperCase());
    await publica.getByLabel("Teléfono").fill("55 1111 2222");
    await publica.getByRole("button", { name: "Consultar" }).click();

    const tarjeta = publica.getByRole("article").filter({ hasText: nombre });
    await expect(tarjeta).toContainText("Pendiente");
    await expect(tarjeta).toContainText("Total pagado: $250.00 MXN");
    await expect(tarjeta).toContainText("Saldo restante: $250.00 MXN");
    await expect(tarjeta).toContainText("$100.00 MXN");
    await expect(tarjeta).toContainText("$150.00 MXN");
    await expect(tarjeta).toContainText("hora del centro de México");
    expect(await publica.content()).not.toContain("777.77");
    await contexto.close();
  });

  test("US6-2: sin coincidencia no revela qué dato falló", async ({ browser }) => {
    const contexto = await browser.newContext({ extraHTTPHeaders: ipDePrueba(2) });
    const publica = await contexto.newPage();
    await publica.goto("/mis-apartados");
    await publica.getByLabel("Nombre").fill("Nadie Registrado");
    await publica.getByLabel("Teléfono").fill("5500000000");
    await publica.getByRole("button", { name: "Consultar" }).click();
    await expect(publica.getByText("No encontramos información con esos datos.")).toBeVisible();
    await contexto.close();
  });
});

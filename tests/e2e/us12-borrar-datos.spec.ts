import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

const CASILLA = "Se informó al cliente del aviso de privacidad";
const BORRADOS = "Datos borrados a petición del cliente";

async function registrar(pagina: Page, producto: string, tipo: "Apartar" | "Vender", cliente?: { nombre: string; telefono: string }) {
  await pagina.goto("/admin");
  await pagina.getByRole("listitem").filter({ hasText: producto }).getByRole("button", { name: new RegExp(`^${tipo}`) }).click();
  const hoja = pagina.getByRole("dialog");
  if (tipo === "Apartar") {
    await hoja.getByLabel("Nombre del cliente").fill(cliente!.nombre);
    await hoja.getByLabel("Teléfono").fill(cliente!.telefono);
    await hoja.getByLabel("Pago inicial").fill("100.00");
  } else if (cliente) {
    await hoja.getByLabel("Nombre del comprador (opcional)").fill(cliente.nombre);
    await hoja.getByLabel("Teléfono (opcional)").fill(cliente.telefono);
  }
  if (cliente) await hoja.getByRole("checkbox", { name: CASILLA }).check();
  await hoja.getByRole("button", { name: tipo === "Apartar" ? "Registrar apartado" : "Registrar venta" }).click();
  await expect(pagina.getByRole("heading", { name: tipo === "Apartar" ? /Apartado/ : /Venta/ })).toBeVisible();
  return pagina.url();
}

test.describe("US12: borrar los datos de un cliente (spec 003, historia 3)", () => {
  test("US3-1 a US3-6 y SC-006: borra los datos de 3 operaciones sin tocar importes", async ({ browser, page }) => {
    await entrar(page);
    const producto = nombreUnico("Borrable");
    await altaProducto(page, { nombre: producto, existencia: "5", precioVenta: "500.00" });
    const cliente = { nombre: nombreUnico("Rita Mora"), telefono: "5566667777" };

    const primero = await registrar(page, producto, "Apartar", cliente);
    await registrar(page, producto, "Apartar", cliente);
    await registrar(page, producto, "Vender", cliente);

    await page.goto(primero);
    const saldo = await page.getByTestId("saldo").textContent();

    // US3-1 y US3-3: la confirmación dice cuántas y que no se puede deshacer; «Volver» no cambia nada.
    await page.getByRole("button", { name: "Borrar datos del cliente" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toContainText("Se borrarán el nombre y el teléfono de 3 operaciones.");
    await expect(dialogo).toContainText("Esta acción no se puede deshacer.");
    await dialogo.getByRole("button", { name: "Volver" }).click();
    await expect(page.getByText(cliente.nombre)).toBeVisible();

    // US3-2 y US3-4: al confirmar, se borran y el saldo sigue igual.
    await page.getByRole("button", { name: "Borrar datos del cliente" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Datos del cliente borrados en 3 operaciones.")).toBeVisible();
    await expect(page.getByText(BORRADOS)).toBeVisible();
    await expect(page.getByText(/de \d{4}, \d{1,2}:\d{2} [ap]\. m\., hora del centro de México/).first()).toBeVisible();
    await expect(page.getByTestId("saldo")).toHaveText(saldo!);

    // US3-6: sigue aceptando pagos y ya no ofrece borrar ni corregir.
    await page.getByLabel("Importe del pago").fill("50.00");
    await page.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByText("Pago registrado.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Borrar datos del cliente" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Corregir/ })).toHaveCount(0);

    // US3-5: ni el panel ni «Mis apartados» las encuentran con los datos anteriores.
    await page.goto("/admin/operaciones");
    await page.getByLabel("Teléfono").fill(cliente.telefono);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText(producto)).toHaveCount(0);

    const contexto = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": "198.51.100.120" } });
    const publica = await contexto.newPage();
    await publica.goto("/mis-apartados");
    await publica.getByLabel("Nombre").fill(cliente.nombre);
    await publica.getByLabel("Teléfono").fill(cliente.telefono);
    await publica.getByRole("button", { name: "Consultar" }).click();
    await expect(publica.getByText("No encontramos información con esos datos.")).toBeVisible();
    await contexto.close();
  });

  test("US3-7: una venta sin datos no ofrece borrar", async ({ page }) => {
    await entrar(page);
    const producto = nombreUnico("SinDatos");
    await altaProducto(page, { nombre: producto });
    await registrar(page, producto, "Vender");
    await expect(page.getByRole("button", { name: "Borrar datos del cliente" })).toHaveCount(0);
  });

  test("FR-019: la confirmación no tiene faltas de axe", async ({ page }) => {
    await entrar(page);
    const producto = nombreUnico("AxeBorrar");
    await altaProducto(page, { nombre: producto });
    await registrar(page, producto, "Apartar", { nombre: nombreUnico("Axel"), telefono: "5577776666" });
    await page.getByRole("button", { name: "Borrar datos del cliente" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });
});

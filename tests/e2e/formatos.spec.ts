import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

const preciosMalFormados = (texto: string) =>
  (texto.match(/\$\S+(?: MXN)?/g) ?? []).filter((precio) => !/^\$\d{1,3}(,\d{3})*\.\d{2} MXN$/.test(precio));
const FECHA =
  /\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}/;
const HORA = /\d{1,2}:\d{2} [ap]\. m\., hora del centro de México/;

test("FR-039: las pantallas públicas usan los formatos de precio, fecha y hora", async ({ browser, page }) => {
  await entrar(page);
  const nombre = nombreUnico("Formato");
  const cliente = nombreUnico("Elena Ortiz");
  await altaProducto(page, { nombre, precioVenta: "1,250.5" });
  await page.getByRole("listitem").filter({ hasText: nombre }).getByRole("button", { name: /^Apartar/ }).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByLabel("Nombre del cliente").fill(cliente);
  await hoja.getByLabel("Teléfono").fill("5577778888");
  // Spec 003, FR-008: la casilla del aviso de privacidad es obligatoria.
  await hoja.getByRole("checkbox", { name: "Se informó al cliente del aviso de privacidad" }).check();
  await hoja.getByLabel("Pago inicial").fill("100");
  await hoja.getByRole("button", { name: "Registrar apartado" }).click();
  await expect(page.getByRole("heading", { name: /Apartado/ })).toBeVisible();

  const contexto = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": "198.51.100.20" } });
  const publica = await contexto.newPage();
  const textoPrincipal = () => publica.locator("main").innerText();

  await publica.goto("/");
  await expect(publica.getByRole("article").filter({ hasText: nombre })).toContainText("$1,250.50 MXN");
  expect(preciosMalFormados(await textoPrincipal())).toEqual([]);

  await publica.getByRole("article").filter({ hasText: nombre }).getByRole("link").click();
  await expect(publica.getByRole("heading", { name: nombre })).toBeVisible();
  await expect(publica.locator("main")).toContainText("$1,250.50 MXN");

  await publica.goto("/encargos");
  expect(preciosMalFormados(await textoPrincipal())).toEqual([]);

  await publica.goto("/mis-apartados");
  await publica.getByLabel("Nombre").fill(cliente);
  await publica.getByLabel("Teléfono").fill("5577778888");
  await publica.getByRole("button", { name: "Consultar" }).click();
  const tarjeta = publica.getByRole("article").filter({ hasText: nombre });
  await expect(tarjeta).toContainText("Saldo restante: $1,150.50 MXN");
  const texto = await tarjeta.innerText();
  expect(texto).toMatch(FECHA);
  expect(texto).toMatch(HORA);
  expect(preciosMalFormados(texto)).toEqual([]);

  // /mis-apartados no existía cuando se hizo la revisión de pantallas públicas de US2.
  const { violations } = await new AxeBuilder({ page: publica }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
  await contexto.close();
});

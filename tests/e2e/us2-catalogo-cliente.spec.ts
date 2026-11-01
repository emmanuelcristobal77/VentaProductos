import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { altaProducto, entrar, nombreUnico, sqlDePrueba } from "./ayudantes";

const LEYENDA = "Favor de revisar el producto antes de comprarlo, ya que no hay devoluciones.";
const COMPRA_UNICA = "4321.87";

test.describe("US2: consultar el catálogo", () => {
  test("US2-1, US2-3: muestra datos, leyenda y contacto sin iniciar sesión", async ({ page, browser }) => {
    await entrar(page);
    const nombre = nombreUnico("Muñeca");
    await altaProducto(page, { nombre, precioVenta: "1,250.00", existencia: "3" });

    const cliente = await (await browser.newContext()).newPage();
    await cliente.goto("/");
    const tarjeta = cliente.getByRole("article").filter({ hasText: nombre });
    await expect(tarjeta).toContainText("$1,250.00 MXN");
    await expect(tarjeta).toContainText("3 disponibles");
    await expect(tarjeta).toContainText(LEYENDA);
    await expect(tarjeta.getByRole("img", { name: nombre })).toBeVisible();

    await tarjeta.getByRole("link").click();
    await expect(cliente.getByRole("heading", { name: nombre })).toBeVisible();
    await expect(cliente.getByRole("main")).toContainText(LEYENDA);
    await expect(cliente.getByRole("main").getByRole("link", { name: /Contacto: 55 1234 5678/ })).toBeVisible();
  });

  test("US2-2: filtra por categoría y subcategoría", async ({ page }) => {
    await entrar(page);
    const juguete = nombreUnico("Juguete");
    const prenda = nombreUnico("Prenda");
    await altaProducto(page, { nombre: juguete, categoria: "Juguetes" });
    await altaProducto(page, { nombre: prenda, categoria: "Ropa" });

    await page.goto("/");
    await page.getByRole("link", { name: "Ropa", exact: true }).click();
    await expect(page.getByRole("article").filter({ hasText: prenda })).toBeVisible();
    await expect(page.getByText(juguete)).toHaveCount(0);

    await expect(page.getByRole("link", { name: "Todos", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Niña", exact: true }).click();
    await expect(page.getByText("No hay productos en esta categoría por ahora.")).toBeVisible();
    await page.getByRole("link", { name: "Todos", exact: true }).click();
    await expect(page.getByRole("article").filter({ hasText: prenda })).toBeVisible();
  });

  test("US2-4, SC-008: el precio de compra no aparece en ninguna pantalla pública", async ({ page, browser }) => {
    await entrar(page);
    const nombre = nombreUnico("Secreto");
    await altaProducto(page, { nombre, precioCompra: COMPRA_UNICA });

    const cliente = await (await browser.newContext()).newPage();
    await cliente.goto("/");
    expect(await cliente.content()).not.toContain("4,321.87");
    expect(await cliente.content()).not.toContain("432187");

    await cliente.getByRole("article").filter({ hasText: nombre }).getByRole("link").click();
    await expect(cliente.getByRole("heading", { name: nombre })).toBeVisible();
    expect(await cliente.content()).not.toContain("432187");
    await expect(cliente.getByText(/compra:/i)).toHaveCount(0);
  });

  test("US2-5: un producto sin unidades se marca como agotado", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Agotado");
    await altaProducto(page, { nombre, existencia: "0" });

    await page.goto("/");
    await expect(page.getByRole("article").filter({ hasText: nombre })).toContainText(
      "Agotado, disponible por encargo",
    );
  });

  test("US2-6: los artículos por encargo van separados y sin cantidad", async ({ page }) => {
    const nombre = nombreUnico("Bicicleta");
    const ahora = new Date().toISOString();
    sqlDePrueba(
      `INSERT INTO articulos_encargo (id, nombre, descripcion, precio_centavos, activo, creado_en, actualizado_en)
       VALUES ('${randomUUID()}', '${nombre}', 'Rodado 20', 300000, 1, '${ahora}', '${ahora}')`,
    );

    await page.goto("/encargos");
    const articulo = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(articulo).toContainText("$3,000.00 MXN");
    await expect(articulo).toContainText(LEYENDA);
    await expect(articulo).toContainText("Contacto: 55 1234 5678");
    await expect(articulo).not.toContainText("disponibles");

    await page.goto("/");
    await expect(page.getByText(nombre)).toHaveCount(0);
  });

  test("Principio VII: las pantallas públicas pasan axe", async ({ page, browser }) => {
    await entrar(page);
    const nombre = nombreUnico("Accesible");
    await altaProducto(page, { nombre });

    const cliente = await (await browser.newContext()).newPage();
    await cliente.goto("/");
    expect((await new AxeBuilder({ page: cliente }).analyze()).violations).toEqual([]);
    await cliente.goto("/encargos");
    expect((await new AxeBuilder({ page: cliente }).analyze()).violations).toEqual([]);
    await cliente.goto("/");
    await cliente.getByRole("article").filter({ hasText: nombre }).getByRole("link").click();
    await expect(cliente.getByRole("heading", { name: nombre })).toBeVisible();
    expect((await new AxeBuilder({ page: cliente }).analyze()).violations).toEqual([]);
  });
});

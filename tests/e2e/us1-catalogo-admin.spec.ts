import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { altaProducto, entrar, llenarAlta, nombreUnico } from "./ayudantes";

test.describe("US1: administrar el catálogo", () => {
  test("US1-5: sin sesión se niega el acceso a la administración", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    await page.goto("/admin/categorias");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
  });

  test("US1-1: registra un producto y aparece con sus datos", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Pelota");
    await altaProducto(page, { nombre, precioCompra: "80.50", precioVenta: "1,250.00", existencia: "7" });

    const fila = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(fila).toContainText("Compra: $80.50 MXN");
    await expect(fila).toContainText("Venta: $1,250.00 MXN");
    await expect(fila).toContainText("Existencia: 7");
    await expect(fila.getByRole("img", { name: nombre })).toBeVisible();
  });

  test("US1-2: una categoría y subcategoría nuevas quedan disponibles", async ({ page }) => {
    await entrar(page);
    const categoria = nombreUnico("Papelería");
    const nombre = nombreUnico("Cuaderno");
    await llenarAlta(page, { nombre });
    await page.getByLabel("Categoría", { exact: true }).selectOption({ label: "Nueva categoría…" });
    await page.getByLabel("Nombre de la categoría nueva").fill(categoria);
    await page.getByLabel("Subcategoría (opcional)").selectOption({ label: "Nueva subcategoría…" });
    await page.getByLabel("Nombre de la subcategoría nueva").fill("Rayados");
    await page.getByRole("button", { name: "Guardar producto" }).click();

    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText(`${categoria} · Rayados`);
    await page.goto("/admin/productos/nuevo");
    await expect(page.getByLabel("Categoría", { exact: true }).getByRole("option", { name: categoria })).toHaveCount(1);
  });

  test("US1-3: editar se refleja de inmediato en ambas secciones", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Carrito");
    await altaProducto(page, { nombre, precioVenta: "100.00" });

    await page.getByRole("link", { name: `Editar ${nombre}` }).click();
    await page.getByLabel("Precio de venta").fill("150.00");
    await page.getByRole("button", { name: "Guardar producto" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText("Venta: $150.00 MXN");

    await page.goto("/");
    await expect(page.getByRole("article").filter({ hasText: nombre })).toContainText("$150.00 MXN");
  });

  test("US1-4: la baja lo quita del catálogo", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Yoyo");
    await altaProducto(page, { nombre });

    await page.getByRole("button", { name: `Dar de baja ${nombre}` }).click();
    await page.getByRole("button", { name: "Confirmar baja" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toHaveCount(0);

    await page.goto("/");
    await expect(page.getByText(nombre)).toHaveCount(0);
  });

  test("US1-6: un alta sin foto no se guarda e indica que falta", async ({ page }) => {
    await entrar(page);
    await llenarAlta(page, { nombre: nombreUnico("Sin foto"), conFoto: false });
    await page.getByRole("button", { name: "Guardar producto" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Agrega al menos una foto" })).toBeVisible();
    await expect(page).toHaveURL(/productos\/nuevo$/);
  });

  test("FR-045: rechaza un archivo que no es imagen permitida", async ({ page }) => {
    await entrar(page);
    await page.goto("/admin/productos/nuevo");
    await page.getByLabel("Agregar fotos", { exact: true }).setInputFiles({
      name: "documento.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF"),
    });
    await expect(page.getByText("La foto debe ser JPEG, PNG o WebP de hasta 10 MB.")).toBeVisible();
  });

  test("FR-006: gestiona categorías", async ({ page }) => {
    await entrar(page);
    const categoria = nombreUnico("Zapatos");
    await page.goto("/admin/categorias");
    await page.getByLabel("Nombre de la categoría", { exact: true }).fill(categoria);
    await page.getByRole("button", { name: "Agregar" }).first().click();
    await expect(page.getByRole("region", { name: categoria })).toBeVisible();

    await page.getByRole("button", { name: `Dar de baja ${categoria}` }).click();
    await page.getByRole("button", { name: "Confirmar baja" }).click();
    await expect(page.getByRole("region", { name: categoria })).toHaveCount(0);
  });

  test("Principio VII: las pantallas de administración pasan axe", async ({ page }) => {
    await page.goto("/admin/entrar");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await entrar(page);
    for (const ruta of ["/admin", "/admin/productos/nuevo", "/admin/categorias"]) {
      await page.goto(ruta);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  });
});

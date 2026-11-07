import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

async function revisar(pagina: Page) {
  const { violations } = await new AxeBuilder({ page: pagina }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
}

test.describe("Principio VII: accesibilidad de la administración", () => {
  test("las pantallas de administración no tienen faltas de axe", async ({ page }) => {
    await page.goto("/admin/entrar");
    await revisar(page);

    await entrar(page);
    const nombre = nombreUnico("Accesible");
    await altaProducto(page, { nombre });
    await revisar(page);

    for (const ruta of [
      "/admin/productos/nuevo",
      "/admin/categorias",
      "/admin/operaciones",
      "/admin/encargos",
      "/admin/articulos-encargo",
    ]) {
      await page.goto(ruta);
      await revisar(page);
    }

    await page.goto("/admin");
    await page.getByRole("listitem").filter({ hasText: nombre }).getByRole("button", { name: /^Apartar/ }).click();
    const hoja = page.getByRole("dialog");
    await expect(hoja).toBeVisible();
    await revisar(page);

    await hoja.getByRole("button", { name: "Registrar apartado" }).click();
    await expect(hoja.getByText("Escribe el nombre del cliente.")).toBeVisible();
    await revisar(page);

    await hoja.getByLabel("Nombre del cliente").fill("Ana López");
    await hoja.getByLabel("Teléfono").fill("5512345678");
    // Spec 003, FR-008: la casilla del aviso de privacidad es obligatoria.
    await hoja.getByRole("checkbox", { name: "Se informó al cliente del aviso de privacidad" }).check();
    await hoja.getByLabel("Pago inicial").fill("100.00");
    await hoja.getByRole("button", { name: "Registrar apartado" }).click();
    await expect(page.getByRole("heading", { name: /Apartado/ })).toBeVisible();
    await revisar(page);
  });

  test("todos los campos de los formularios tienen etiqueta", async ({ page }) => {
    await entrar(page);
    for (const ruta of ["/admin/productos/nuevo", "/admin/operaciones", "/admin/articulos-encargo"]) {
      await page.goto(ruta);
      const sinEtiqueta = await page
        .locator("input:not([type=hidden]):not([type=file]), textarea, select")
        .evaluateAll((campos) =>
          campos.filter((c) => (c as HTMLInputElement).labels?.length === 0).map((c) => c.outerHTML),
        );
      expect(sinEtiqueta).toEqual([]);
    }
  });
});

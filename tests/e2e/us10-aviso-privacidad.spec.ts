import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { altaProducto, entrar, nombreUnico } from "./ayudantes";

const AVISO = "/aviso-de-privacidad";

test.describe("US10: aviso de privacidad (spec 003, historia 1)", () => {
  test("US1-1, SC-001 y FR-002: el pie de cada página de cliente lleva al aviso; la navegación no", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Avisito");
    await altaProducto(page, { nombre });
    await page.context().clearCookies();

    await page.goto("/");
    await page.getByRole("link", { name: nombre }).first().click();
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
    const paginaProducto = page.url();

    for (const ruta of ["/", paginaProducto, "/encargos", "/mis-apartados"]) {
      await page.goto(ruta);
      for (const navegacion of await page.getByRole("navigation").all()) {
        await expect(navegacion.getByRole("link", { name: "Aviso de privacidad" })).toHaveCount(0);
      }
      await page.getByRole("contentinfo").getByRole("link", { name: "Aviso de privacidad" }).click();
      await expect(page).toHaveURL(AVISO);
      await expect(page.getByRole("heading", { level: 1, name: "Aviso de privacidad" })).toBeVisible();
    }
  });

  test("US1-2 y FR-003: «Mis apartados» enlaza al aviso junto al formulario", async ({ page }) => {
    await page.goto("/mis-apartados");
    await page.getByRole("main").getByRole("link", { name: "aviso de privacidad" }).click();
    await expect(page).toHaveURL(AVISO);
  });

  test("US1-3, US1-5, FR-001 y FR-004: sin sesión, muestra cada sección y la fecha con el mes escrito", async ({ page }) => {
    await page.goto(AVISO);
    await expect(page).toHaveTitle("Aviso de privacidad | Productos Eli's");
    await expect(page.getByText(/^Última actualización: \d{1,2} de [a-z]+ de \d{4}$/)).toBeVisible();
    for (const titulo of [
      "Responsable",
      "Datos que recabamos",
      "Para qué los usamos",
      "Con quién los compartimos",
      "Cuánto tiempo los guardamos",
      "Tus derechos y cómo ejercerlos",
      "Dudas",
      "Cambios a este aviso",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
    }
    await expect(page.getByText("Emmanuel Cristóbal Trejo").first()).toBeVisible();
  });

  test("US1-4 y FR-006: se lee sin desplazarse hacia los lados", async ({ page }) => {
    await page.goto(AVISO);
    const { ancho, ventana } = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      ventana: window.innerWidth,
    }));
    expect(ancho).toBeLessThanOrEqual(ventana);
  });

  test("US1-6 y FR-005: el correo y el teléfono son enlaces", async ({ page }) => {
    await page.goto(AVISO);
    const principal = page.getByRole("main");
    await expect(principal.getByRole("link", { name: "emmanuelcristobal@yahoo.com.mx" })).toHaveAttribute(
      "href",
      "mailto:emmanuelcristobal@yahoo.com.mx",
    );
    await expect(principal.locator('a[href^="tel:+52"]')).toHaveCount(1);
  });

  test("FR-019: la página no tiene faltas de axe", async ({ page }) => {
    await page.goto(AVISO);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });
});

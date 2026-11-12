import { expect, test, type Page } from "@playwright/test";
import { ETIQUETAS_PROMOCION, MENSAJES_PROMOCION } from "../../src/dominio/promocion";
import { desactivarSello, entrar, fijarSello } from "./ayudantes";

const BUEN_FIN = "Buen Fin · Pregunta por tu descuento";
const NAVIDAD = "Venta navideña 🎄";

const franja = (pagina: Page) => pagina.locator("[data-sello-promocional]");
const campoTexto = (pagina: Page) => pagina.getByLabel(ETIQUETAS_PROMOCION.campoTexto, { exact: true });
const casilla = (pagina: Page) => pagina.getByRole("checkbox", { name: ETIQUETAS_PROMOCION.casilla });
const guardar = (pagina: Page) => pagina.getByRole("button", { name: ETIQUETAS_PROMOCION.guardar, exact: true });
const vistaPrevia = (pagina: Page) =>
  pagina.getByRole("region", { name: ETIQUETAS_PROMOCION.vistaPrevia }).locator("[data-sello-promocional]");

async function abrirPromocion(pagina: Page) {
  await pagina.goto("/admin/promocion");
  await expect(pagina.getByRole("heading", { name: ETIQUETAS_PROMOCION.titulo, level: 1 })).toBeVisible();
}

test.describe("US2: cambiar el sello para otra temporada", () => {
  test.afterAll(() => desactivarSello());

  test("US2-1, FR-010: el cambio de texto y color se ve al recargar el catálogo", async ({ page }) => {
    fijarSello(BUEN_FIN, "rojo", true);
    await page.goto("/");
    await expect(franja(page)).toHaveAttribute("data-color", "rojo");

    await entrar(page);
    await abrirPromocion(page);
    await campoTexto(page).fill(NAVIDAD);
    await page.getByRole("radio", { name: "Verde" }).check();
    await guardar(page).click();
    await expect(page.getByText(MENSAJES_PROMOCION.listoActivo)).toBeVisible();

    await page.goto("/");
    await expect(franja(page)).toHaveAttribute("data-color", "verde");
    await expect(franja(page)).toHaveText(NAVIDAD);
    await expect(page.getByText(BUEN_FIN)).toHaveCount(0);
  });

  test("US2-2, FR-006: la vista previa cambia antes de guardar, aunque la casilla esté desmarcada", async ({
    page,
  }) => {
    fijarSello("", "rojo", false);
    await entrar(page);
    await abrirPromocion(page);
    await expect(casilla(page)).not.toBeChecked();
    await expect(vistaPrevia(page)).toHaveText(ETIQUETAS_PROMOCION.textoEjemplo);

    await campoTexto(page).fill(NAVIDAD);
    await expect(vistaPrevia(page)).toHaveText(NAVIDAD);
    await page.getByRole("radio", { name: "Azul" }).check();
    await expect(vistaPrevia(page)).toHaveAttribute("data-color", "azul");

    await campoTexto(page).fill("");
    await expect(vistaPrevia(page)).toHaveText(ETIQUETAS_PROMOCION.textoEjemplo);

    // Nada se guardó: la página sigue sin franja.
    await page.goto("/");
    await expect(franja(page)).toHaveCount(0);
  });

  test("Dos vendedores editando a la vez: el panel muestra lo último guardado", async ({ page, context }) => {
    fijarSello("", "rojo", false);
    await entrar(page);
    await abrirPromocion(page);
    await campoTexto(page).fill("  Hola  ");
    await casilla(page).check();
    await guardar(page).click();
    await expect(page.getByText(MENSAJES_PROMOCION.listoActivo)).toBeVisible();
    await expect(campoTexto(page)).toHaveValue("Hola");

    const otra = await context.newPage();
    await abrirPromocion(otra);
    await campoTexto(otra).fill(NAVIDAD);
    await guardar(otra).click();
    await expect(otra.getByText(MENSAJES_PROMOCION.listoActivo)).toBeVisible();
    await otra.close();

    await page.reload();
    await expect(campoTexto(page)).toHaveValue(NAVIDAD);
  });

  test("US2-4, FR-004: el contador avisa y «Guardar» se deshabilita al pasar de 40", async ({ page }) => {
    fijarSello("", "rojo", false);
    await entrar(page);
    await abrirPromocion(page);

    await expect(page.getByText("Te quedan 40 caracteres")).toBeVisible();
    await campoTexto(page).fill("a".repeat(10));
    await expect(page.getByText("Te quedan 30 caracteres")).toBeVisible();
    await campoTexto(page).fill("a".repeat(39));
    await expect(page.getByText("Te queda 1 carácter")).toBeVisible();

    await campoTexto(page).fill("a".repeat(41));
    await expect(page.getByText("Te pasaste por 1 carácter")).toBeVisible();
    await expect(guardar(page)).toBeDisabled();

    await campoTexto(page).fill("a".repeat(40));
    await expect(page.getByText("Te quedan 0 caracteres")).toBeVisible();
    await expect(guardar(page)).toBeEnabled();
    await casilla(page).check();
    await guardar(page).click();
    await expect(page.getByText(MENSAJES_PROMOCION.listoActivo)).toBeVisible();
  });

  test("US2-5, FR-005: el grupo «Color» tiene Rojo, Verde, Dorado y Azul, en ese orden", async ({ page }) => {
    await entrar(page);
    await abrirPromocion(page);
    const radios = page.getByRole("group", { name: ETIQUETAS_PROMOCION.campoColor }).getByRole("radio");
    await expect(radios).toHaveCount(4);
    for (const [i, nombre] of ["Rojo", "Verde", "Dorado", "Azul"].entries()) {
      await expect(radios.nth(i)).toHaveAccessibleName(nombre);
    }
  });
});

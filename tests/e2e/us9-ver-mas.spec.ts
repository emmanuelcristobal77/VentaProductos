import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { crearCategoriaDePrueba, crearProductosDePrueba, entrar } from "./ayudantes";

const ERROR_CARGA = "No se pudieron cargar más productos. Revisa tu conexión e inténtalo de nuevo.";

const marca = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const buscador = (pagina: Page) => pagina.getByRole("searchbox", { name: "Buscar productos" });
const anuncio = (pagina: Page) => pagina.getByRole("status");
const verMas = (pagina: Page) => pagina.getByRole("button", { name: "Ver más" });
const tarjetas = (pagina: Page) => pagina.getByRole("article");
const filasPanel = (pagina: Page) => pagina.getByRole("main").getByRole("listitem");
const desplazamiento = (pagina: Page) => pagina.evaluate(() => window.scrollY);

/** Nombres de producto mostrados, en orden: el título de cada tarjeta o fila. */
const nombresMostrados = (lista: Locator) => lista.getByRole("heading", { level: 2 }).allInnerTexts();

test.describe("US2 (spec 002): ver los productos por partes con «Ver más»", () => {
  test("US2-1 a US2-3, FR-011, FR-012, SC-004, FR-016: recorre todo sin repetidos ni faltantes", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Lote ${m}`);
    const nombres = await crearProductosDePrueba(45, `Lote ${m}`, { categoriaId: categoria });

    await page.goto(`/?categoria=${categoria}`);
    await expect(tarjetas(page)).toHaveCount(20);
    await expect(verMas(page)).toBeVisible();

    await verMas(page).click();
    await expect(tarjetas(page)).toHaveCount(40);
    await expect(anuncio(page)).toHaveText("Se agregaron 20 productos");

    await verMas(page).click();
    await expect(tarjetas(page)).toHaveCount(45);
    await expect(anuncio(page)).toHaveText("Se agregaron 5 productos");
    await expect(verMas(page)).toHaveCount(0);

    expect(await nombresMostrados(tarjetas(page))).toEqual(nombres);
  });

  test("US2-4: con 20 productos o menos no aparece «Ver más»", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Veinte ${m}`);
    await crearProductosDePrueba(20, `Veinte ${m}`, { categoriaId: categoria });

    await page.goto(`/?categoria=${categoria}`);
    await expect(tarjetas(page)).toHaveCount(20);
    await expect(verMas(page)).toHaveCount(0);
  });

  test("US2-6, US2-7, US2-8: la búsqueda abarca todo y vuelve a empezar al cambiar", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Pila ${m}`);
    const nombres = await crearProductosDePrueba(45, `Pila ${m}`, { categoriaId: categoria });

    // US2-6: un producto más allá de los primeros 20, sin filtro y sin «Ver más».
    await page.goto("/");
    await buscador(page).fill(`pila ${m} 040`);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(tarjetas(page)).toContainText([nombres[39]]);

    // US2-8: una búsqueda con más de 20 resultados también va por partes.
    await buscador(page).fill(`pila ${m}`);
    await expect(anuncio(page)).toHaveText("45 productos encontrados");
    await expect(tarjetas(page)).toHaveCount(20);
    await verMas(page).click();
    await expect(tarjetas(page)).toHaveCount(40);

    // US2-7: al cambiar lo que se busca, vuelve a los primeros resultados.
    await buscador(page).fill(`pila ${m} 0`);
    await expect(anuncio(page)).toHaveText("45 productos encontrados");
    await expect(tarjetas(page)).toHaveCount(20);
    expect(await nombresMostrados(tarjetas(page))).toEqual(nombres.slice(0, 20));

    // US2-7: al cambiar el filtro, también.
    await buscador(page).fill("");
    await page.goto(`/?categoria=${categoria}`);
    await verMas(page).click();
    await expect(tarjetas(page)).toHaveCount(40);
    await page.getByRole("link", { name: "Todos los productos" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(tarjetas(page)).toHaveCount(20);
  });

  test("US2-5: en el panel, partes de 50", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Caja ${m}`);
    const nombres = await crearProductosDePrueba(55, `Caja ${m}`, { categoriaId: categoria });
    await entrar(page);

    await page.goto(`/admin?categoria=${categoria}`);
    await expect(filasPanel(page)).toHaveCount(50);
    await verMas(page).click();
    await expect(filasPanel(page)).toHaveCount(55);
    await expect(anuncio(page)).toHaveText("Se agregaron 5 productos");
    await expect(verMas(page)).toHaveCount(0);
    expect(await nombresMostrados(filasPanel(page))).toEqual(nombres);
  });

  test("US2-9, FR-008a: tras «Ver más» dos veces, regresar con atrás conserva productos y lugar", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Tapa ${m}`);
    const nombres = await crearProductosDePrueba(45, `Tapa ${m}`, { categoriaId: categoria });

    await page.goto(`/?categoria=${categoria}`);
    await verMas(page).click();
    await expect(tarjetas(page)).toHaveCount(40);
    await verMas(page).click();
    await expect(tarjetas(page)).toHaveCount(45);

    const elegida = tarjetas(page).nth(41);
    await elegida.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 50);
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(0);
    const antes = await desplazamiento(page);

    await elegida.getByRole("link").click();
    await expect(page.getByRole("heading", { name: nombres[41] })).toBeVisible();
    await page.goBack();

    await expect(tarjetas(page)).toHaveCount(45);
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(antes - 5);
    expect(await desplazamiento(page)).toBeLessThan(antes + 5);
  });

  test("FR-008a en el panel: tras «Ver más», regresar de Editar conserva productos y lugar", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Bolsa ${m}`);
    const nombres = await crearProductosDePrueba(55, `Bolsa ${m}`, { categoriaId: categoria });
    await entrar(page);

    await page.goto(`/admin?categoria=${categoria}`);
    await verMas(page).click();
    await expect(filasPanel(page)).toHaveCount(55);

    const elegida = filasPanel(page).nth(52);
    await elegida.scrollIntoViewIfNeeded();
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(0);
    const antes = await desplazamiento(page);

    await elegida.getByRole("link", { name: `Editar ${nombres[52]}` }).click();
    await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible();
    await page.goBack();

    await expect(filasPanel(page)).toHaveCount(55);
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(antes - 5);
    expect(await desplazamiento(page)).toBeLessThan(antes + 5);
  });

  test("Refresco con partes extra (research 7): una baja en la segunda parte no pierde el lugar", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Sobre ${m}`);
    const nombres = await crearProductosDePrueba(55, `Sobre ${m}`, { categoriaId: categoria });
    await entrar(page);

    await page.goto(`/admin?categoria=${categoria}`);
    await verMas(page).click();
    await expect(filasPanel(page)).toHaveCount(55);

    const baja = nombres[52];
    await page.getByRole("button", { name: `Dar de baja ${baja}` }).click();
    await page.getByRole("button", { name: "Confirmar baja" }).click();

    await expect(filasPanel(page).filter({ hasText: baja })).toHaveCount(0);
    await expect(filasPanel(page)).toHaveCount(54);
    expect(await nombresMostrados(filasPanel(page))).toEqual(nombres.filter((n) => n !== baja));
    expect(await desplazamiento(page)).toBeGreaterThan(1000);
  });

  test("FR-015: si falla «Ver más», se avisa, se conservan los productos y se puede reintentar", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Falla ${m}`);
    await crearProductosDePrueba(25, `Falla ${m}`, { categoriaId: categoria });

    await page.goto(`/?categoria=${categoria}`);
    await expect(tarjetas(page)).toHaveCount(20);
    await page.route("**/api/catalogo**", (ruta) => ruta.abort());
    await verMas(page).click();
    await expect(page.getByRole("alert").filter({ hasText: ERROR_CARGA })).toBeVisible();
    await expect(tarjetas(page)).toHaveCount(20);

    await page.unroute("**/api/catalogo**");
    await verMas(page).click();
    await expect(tarjetas(page)).toHaveCount(25);
    await expect(page.getByText(ERROR_CARGA)).toHaveCount(0);
  });

  test("FR-015 en el panel: si falla «Ver más», se avisa y se puede reintentar", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Error ${m}`);
    await crearProductosDePrueba(55, `Error ${m}`, { categoriaId: categoria });
    await entrar(page);

    await page.goto(`/admin?categoria=${categoria}`);
    await expect(filasPanel(page)).toHaveCount(50);
    await page.route("**/api/admin/productos**", (ruta) => ruta.abort());
    await verMas(page).click();
    await expect(page.getByRole("alert").filter({ hasText: ERROR_CARGA })).toBeVisible();
    await expect(filasPanel(page)).toHaveCount(50);

    await page.unroute("**/api/admin/productos**");
    await verMas(page).click();
    await expect(filasPanel(page)).toHaveCount(55);
  });

  test("Principio VII: axe pasa con el botón visible", async ({ page }) => {
    const m = marca();
    const categoria = crearCategoriaDePrueba(`Axe ${m}`);
    await crearProductosDePrueba(21, `Axe ${m}`, { categoriaId: categoria });

    await page.goto(`/?categoria=${categoria}`);
    await expect(verMas(page)).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await entrar(page);
    await page.goto(`/admin?categoria=${categoria}`);
    await expect(filasPanel(page)).toHaveCount(21);
    await expect(verMas(page)).toHaveCount(0);
  });
});

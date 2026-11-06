import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  crearCategoriaDePrueba,
  crearProductosDePrueba,
  entrar,
  insertarProductosDePrueba,
} from "./ayudantes";

/** Una marca única por prueba, para buscar solo los productos que esa prueba crea. */
const marca = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const buscador = (pagina: Page) => pagina.getByRole("searchbox", { name: "Buscar productos" });
const anuncio = (pagina: Page) => pagina.getByRole("status");
const tarjetas = (pagina: Page) => pagina.getByRole("article");
const filasPanel = (pagina: Page) => pagina.getByRole("main").getByRole("listitem");
const desplazamiento = (pagina: Page) => pagina.evaluate(() => window.scrollY);

test.describe("US1 (spec 002): buscar un producto escribiendo", () => {
  test("US1-1 a US1-4, FR-016: busca por nombre y descripción, sin acentos, primero el nombre", async ({ page }) => {
    const m = marca();
    await insertarProductosDePrueba([
      { nombre: `Cojín ${m}`, descripcion: "Funda lavable con muñeca bordada" },
      { nombre: `Muñeca de trapo ${m}`, descripcion: "Hecha a mano" },
      { nombre: `Pelota ${m}`, descripcion: "De goma" },
    ]);
    await page.goto("/");

    // US1-1: parte del nombre, sin pulsar ningún botón (FR-003).
    await buscador(page).fill(`pelo ${m}`);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(tarjetas(page)).toContainText([`Pelota ${m}`]);
    await expect(anuncio(page)).toHaveText("1 producto encontrado");

    // US1-2 y US1-4: sin acentos ni mayúsculas; primero la coincidencia en el nombre.
    for (const texto of [`muneca ${m}`, `MUÑECA ${m.toUpperCase()}`]) {
      await buscador(page).fill(texto);
      await expect(tarjetas(page)).toHaveCount(2);
      await expect(tarjetas(page)).toContainText([`Muñeca de trapo ${m}`, `Cojín ${m}`]);
      await expect(anuncio(page)).toHaveText("2 productos encontrados");
    }

    // US1-3: una palabra que solo está en la descripción.
    await buscador(page).fill(`lavable ${m}`);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(tarjetas(page)).toContainText([`Cojín ${m}`]);
  });

  test("US1-5: la búsqueda se combina con el filtro de categoría", async ({ page }) => {
    const m = marca();
    const categoriaA = crearCategoriaDePrueba(`Trenes ${m}`);
    const categoriaB = crearCategoriaDePrueba(`Vías ${m}`);
    await insertarProductosDePrueba([
      { nombre: `Tren de madera ${m}`, categoriaId: categoriaA },
      { nombre: `Tren eléctrico ${m}`, categoriaId: categoriaB },
    ]);

    await page.goto(`/?categoria=${categoriaA}`);
    await buscador(page).fill(`tren ${m}`);
    await expect(anuncio(page)).toHaveText("1 producto encontrado");
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(tarjetas(page)).toContainText([`Tren de madera ${m}`]);
  });

  test("US1-6, FR-005: sin resultados, invita a ver los artículos por encargo o a llamar", async ({ page }) => {
    const m = marca();
    await page.goto("/");
    await buscador(page).fill(`inexistente ${m}`);

    const mensaje = page.getByText(`No encontramos productos con «inexistente ${m}».`);
    await expect(mensaje).toBeVisible();
    await expect(mensaje).toContainText("Revisa los artículos por encargo o llámanos al 55 1234 5678.");
    await expect(tarjetas(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);
    await expect(mensaje.getByRole("link", { name: "artículos por encargo" })).toHaveAttribute("href", "/encargos");
    await expect(mensaje.getByRole("link", { name: "55 1234 5678" })).toHaveAttribute("href", "tel:+525512345678");
    await expect(anuncio(page)).toHaveText("0 productos encontrados");
  });

  test("US1-7: al borrar el texto vuelve la lista completa", async ({ page }) => {
    const m = marca();
    await insertarProductosDePrueba([{ nombre: `Yoyo ${m}` }]);
    await page.goto("/");
    await expect(tarjetas(page).filter({ hasText: `Yoyo ${m}` })).toBeVisible();
    const antes = await tarjetas(page).count();
    const primera = await tarjetas(page).first().getByRole("heading").innerText();

    await buscador(page).fill(`yoyo ${m}`);
    await expect(tarjetas(page)).toHaveCount(1);
    await buscador(page).fill("");
    await expect(tarjetas(page)).toHaveCount(antes);
    await expect(tarjetas(page).first().getByRole("heading")).toHaveText(primera);
  });

  test("US1-8, FR-008: la búsqueda no va en la URL y no sobrevive a la recarga", async ({ page }) => {
    const m = marca();
    await insertarProductosDePrueba([{ nombre: `Trompo ${m}` }]);
    await page.goto("/");
    const url = page.url();

    await buscador(page).fill(`trompo ${m}`);
    await expect(tarjetas(page)).toHaveCount(1);
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => JSON.stringify([sessionStorage, localStorage, history.state]))).not.toContain(m);

    await page.reload();
    await expect(buscador(page)).toHaveValue("");
    await expect.poll(() => tarjetas(page).count()).toBeGreaterThan(1);
  });

  test("US1-9: el panel busca igual que el catálogo", async ({ page }) => {
    const m = marca();
    await insertarProductosDePrueba([
      { nombre: `Cojín ${m}`, descripcion: "Funda con muñeca bordada" },
      { nombre: `Muñeca de trapo ${m}`, descripcion: "Hecha a mano" },
    ]);
    await entrar(page);

    await buscador(page).fill(`MUNECA ${m}`);
    await expect(filasPanel(page)).toHaveCount(2);
    await expect(filasPanel(page)).toContainText([`Muñeca de trapo ${m}`, `Cojín ${m}`]);
    await expect(anuncio(page)).toHaveText("2 productos encontrados");

    await buscador(page).fill(`inexistente ${m}`);
    await expect(page.getByText(`No hay productos que coincidan con «inexistente ${m}».`)).toBeVisible();
  });

  test("US1-10, FR-008a: al regresar con atrás conserva el texto, los resultados y el lugar", async ({ page }) => {
    const m = marca();
    const nombres = await crearProductosDePrueba(12, `Globo ${m}`);
    await page.goto("/");
    await buscador(page).fill(`globo ${m}`);
    await expect(anuncio(page)).toHaveText("12 productos encontrados");

    const elegida = tarjetas(page).nth(9);
    await elegida.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 50);
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(0);
    const antes = await desplazamiento(page);

    await elegida.getByRole("link").click();
    await expect(page.getByRole("heading", { name: nombres[9] })).toBeVisible();
    await page.goBack();

    await expect(buscador(page)).toHaveValue(`globo ${m}`);
    await expect(tarjetas(page)).toHaveCount(12);
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(antes - 5);
    expect(await desplazamiento(page)).toBeLessThan(antes + 5);
  });

  test("FR-008a en el panel: al regresar de Editar conserva el texto, los resultados y el lugar", async ({ page }) => {
    const m = marca();
    const nombres = await crearProductosDePrueba(12, `Bici ${m}`);
    await entrar(page);
    await buscador(page).fill(`bici ${m}`);
    await expect(anuncio(page)).toHaveText("12 productos encontrados");

    const elegida = filasPanel(page).nth(9);
    await elegida.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 50);
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(0);
    const antes = await desplazamiento(page);

    await elegida.getByRole("link", { name: `Editar ${nombres[9]}` }).click();
    await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible();
    await page.goBack();

    await expect(buscador(page)).toHaveValue(`bici ${m}`);
    await expect(filasPanel(page)).toHaveCount(12);
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(antes - 5);
    expect(await desplazamiento(page)).toBeLessThan(antes + 5);
  });

  test('Caso límite "Escritura rápida": solo quedan los resultados del texto final', async ({ page }) => {
    const m = marca();
    await insertarProductosDePrueba([
      { nombre: `Pelota roja ${m}` },
      { nombre: `Pelota azul ${m}` },
      { nombre: `Peluche ${m}` },
    ]);
    await page.goto("/");

    await buscador(page).pressSequentially(`pelota roja ${m}`);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(tarjetas(page)).toContainText([`Pelota roja ${m}`]);
    // Ninguna respuesta tardía de un texto anterior reemplaza los resultados.
    await page.waitForTimeout(800);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(anuncio(page)).toHaveText("1 producto encontrado");
  });

  test('Caso límite "Producto agotado": aparece con su marca', async ({ page }) => {
    const m = marca();
    await insertarProductosDePrueba([{ nombre: `Carrito agotado ${m}`, existencia: 0 }]);
    await page.goto("/");
    await buscador(page).fill(`carrito agotado ${m}`);
    await expect(tarjetas(page)).toHaveCount(1);
    await expect(tarjetas(page).first()).toContainText("Agotado, disponible por encargo");
  });

  test("FR-014: escribir no mueve la página", async ({ page }) => {
    const m = marca();
    await crearProductosDePrueba(16, `Dado ${m}`);
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 120));
    await buscador(page).focus();
    const antes = await desplazamiento(page);

    await buscador(page).pressSequentially(`dado ${m}`, { delay: 30 });
    await expect(anuncio(page)).toHaveText("16 productos encontrados");
    expect(await desplazamiento(page)).toBe(antes);
  });

  test("FR-014: al cambiar de categoría, el buscador queda a la vista y la lista desde el principio", async ({ page }) => {
    const m = marca();
    const larga = crearCategoriaDePrueba(`Cubos ${m}`);
    const corta = crearCategoriaDePrueba(`Conos ${m}`);
    await crearProductosDePrueba(16, `Cubo ${m}`, { categoriaId: larga });
    const conos = await crearProductosDePrueba(3, `Cono ${m}`, { categoriaId: corta });

    await page.goto(`/?categoria=${larga}`);
    await expect(tarjetas(page)).toHaveCount(16);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => desplazamiento(page)).toBeGreaterThan(300);

    await page.getByRole("link", { name: `Conos ${m}`, exact: true }).click();
    await expect(tarjetas(page)).toHaveCount(3);
    await expect(tarjetas(page)).toContainText(conos);
    await expect(buscador(page)).toBeInViewport();
  });

  test("Principio VII: axe pasa con resultados y sin resultados", async ({ page }) => {
    const m = marca();
    await insertarProductosDePrueba([{ nombre: `Accesible ${m}` }]);
    await page.goto("/");

    await buscador(page).fill(`accesible ${m}`);
    await expect(anuncio(page)).toHaveText("1 producto encontrado");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await buscador(page).fill(`inexistente ${m}`);
    await expect(anuncio(page)).toHaveText("0 productos encontrados");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});

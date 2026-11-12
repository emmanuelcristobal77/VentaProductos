import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { COLORES, ETIQUETAS_PROMOCION, MENSAJES_PROMOCION } from "../../src/dominio/promocion";
import {
  altaProducto,
  desactivarSello,
  entrar,
  fijarSello,
  insertarProductosDePrueba,
  nombreUnico,
  sqlDePrueba,
} from "./ayudantes";

const BUEN_FIN = "Buen Fin · Pregunta por tu descuento";

const franja = (pagina: Page) => pagina.locator("[data-sello-promocional]");
const campoTexto = (pagina: Page) => pagina.getByLabel(ETIQUETAS_PROMOCION.campoTexto, { exact: true });
const casilla = (pagina: Page) => pagina.getByRole("checkbox", { name: ETIQUETAS_PROMOCION.casilla });
const guardar = (pagina: Page) => pagina.getByRole("button", { name: ETIQUETAS_PROMOCION.guardar, exact: true });

async function abrirPromocion(pagina: Page) {
  await entrar(pagina);
  await pagina.goto("/admin/promocion");
  await expect(pagina.getByRole("heading", { name: ETIQUETAS_PROMOCION.titulo, level: 1 })).toBeVisible();
}

const seEncima = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe("US1: anunciar una temporada de promociones", () => {
  test.afterAll(() => desactivarSello());

  test("US1-1, Primera vez: sin guardar nada, el catálogo no muestra la franja", async ({ page }) => {
    sqlDePrueba("DELETE FROM sello_promocional");
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(franja(page)).toHaveCount(0);
  });

  test("FR-001: «Promoción» está en la navegación del panel sin encimarse", async ({ page }, info) => {
    await entrar(page);
    const enlace = page.getByRole("link", { name: "Promoción", exact: true });

    if (info.project.name === "movil") {
      const encabezado = page.getByRole("banner");
      await expect(enlace).toBeVisible();
      const marca = await encabezado.getByRole("link", { name: /^Productos Eli/ }).boundingBox();
      const salir = await encabezado.getByRole("button", { name: "Salir" }).boundingBox();
      const caja = await enlace.boundingBox();
      expect(seEncima(caja!, marca!)).toBe(false);
      expect(seEncima(caja!, salir!)).toBe(false);
      // La barra inferior sigue con sus 5 enlaces.
      await expect(page.getByRole("navigation", { name: "Administración móvil" }).getByRole("link")).toHaveCount(5);
    } else {
      const navegacion = page.getByRole("navigation", { name: "Administración", exact: true });
      await expect(navegacion.getByRole("link", { name: "Promoción" })).toBeVisible();
    }

    await enlace.click();
    await expect(page).toHaveURL(/\/admin\/promocion$/);
    if (info.project.name === "portatil") {
      await expect(
        page.getByRole("navigation", { name: "Administración", exact: true }).getByRole("link", { name: "Promoción" }),
      ).toHaveAttribute("aria-current", "page");
    }
  });

  test("FR-001, Sin sesión: /admin/promocion manda a la entrada", async ({ page }) => {
    await page.goto("/admin/promocion");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
  });

  test("US2-3, FR-003: no se activa con el texto vacío ni con solo espacios", async ({ page }) => {
    fijarSello("", "rojo", false);
    await abrirPromocion(page);
    for (const texto of ["", "    "]) {
      await campoTexto(page).fill(texto);
      await casilla(page).check();
      await guardar(page).click();
      await expect(campoTexto(page)).toHaveAccessibleDescription(new RegExp(MENSAJES_PROMOCION.textoVacio));
    }
    await page.goto("/");
    await expect(franja(page)).toHaveCount(0);
  });

  test("US1-2 a US1-5, FR-007 a FR-011: activa la franja, se ve en todas las páginas y se desactiva", async ({
    page,
  }) => {
    fijarSello("", "rojo", false);
    const [agotado] = await insertarProductosDePrueba([
      { nombre: nombreUnico("Sello agotado"), existencia: 0 },
    ]);
    const [disponible] = await insertarProductosDePrueba([{ nombre: nombreUnico("Sello producto") }]);

    // US1-2, FR-008: se activa a mano.
    await abrirPromocion(page);
    await campoTexto(page).fill(BUEN_FIN);
    await page.getByRole("radio", { name: "Rojo" }).check();
    await casilla(page).check();
    await guardar(page).click();
    await expect(page.getByText(MENSAJES_PROMOCION.listoActivo)).toBeVisible();

    // US1-3, FR-009: debajo del encabezado en todas las páginas de cliente.
    await page.goto("/");
    await expect(page.locator("header + [data-sello-promocional]")).toHaveText(BUEN_FIN);

    // SC-002: completa en la ventana, sin desplazarse.
    const caja = (await franja(page).boundingBox())!;
    const ventana = page.viewportSize()!;
    expect(caja.y).toBeGreaterThanOrEqual(0);
    expect(caja.y + caja.height).toBeLessThanOrEqual(ventana.height);

    // US1-4, FR-011: sin desplazamiento lateral y sin taparse con la primera tarjeta.
    const { ancho, anchoVentana } = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      anchoVentana: window.innerWidth,
    }));
    expect(ancho).toBeLessThanOrEqual(anchoVentana);
    const tarjeta = (await page.getByRole("article").first().boundingBox())!;
    expect(caja.y + caja.height).toBeLessThanOrEqual(tarjeta.y);

    // FR-009: no es enlace ni botón, y no hay forma de cerrarla.
    await expect(franja(page).locator("a, button, input, [tabindex]")).toHaveCount(0);

    // Productos agotados: la leyenda sigue completa.
    await expect(page.getByRole("article").filter({ hasText: agotado })).toContainText(
      "Agotado, disponible por encargo",
    );

    await page.getByRole("article").filter({ hasText: disponible }).getByRole("link").first().click();
    await expect(page.getByRole("heading", { name: disponible })).toBeVisible();
    await expect(page.locator("header + [data-sello-promocional]")).toHaveText(BUEN_FIN);

    for (const ruta of ["/mis-apartados", "/encargos", "/aviso-de-privacidad"]) {
      await page.goto(ruta);
      await expect(page.locator("header + [data-sello-promocional]")).toHaveText(BUEN_FIN);
    }

    // US1-5, FR-007: al desactivar, la franja desaparece y el panel conserva texto y color.
    await page.goto("/admin/promocion");
    await page.getByRole("radio", { name: "Verde" }).check();
    await casilla(page).uncheck();
    await guardar(page).click();
    await expect(page.getByText(MENSAJES_PROMOCION.listoDesactivado)).toBeVisible();
    await page.goto("/");
    await expect(franja(page)).toHaveCount(0);
    await page.goto("/admin/promocion");
    await expect(campoTexto(page)).toHaveValue(BUEN_FIN);
    await expect(page.getByRole("radio", { name: "Verde" })).toBeChecked();
    await expect(casilla(page)).not.toBeChecked();
  });

  test("Desactivar sin texto: guardar desactivado con el texto vacío no da error", async ({ page }) => {
    fijarSello(BUEN_FIN, "rojo", false);
    await abrirPromocion(page);
    await campoTexto(page).fill("");
    await casilla(page).uncheck();
    await guardar(page).click();
    await expect(page.getByText(MENSAJES_PROMOCION.listoDesactivado)).toBeVisible();
    await expect(page.getByText(MENSAJES_PROMOCION.textoVacio)).toHaveCount(0);
  });

  test("FR-012: el texto se muestra tal cual, sin interpretarse como HTML", async ({ page }) => {
    fijarSello("", "rojo", false);
    await abrirPromocion(page);
    await campoTexto(page).fill("<b>Hola</b>");
    await casilla(page).check();
    await guardar(page).click();
    await expect(page.getByText(MENSAJES_PROMOCION.listoActivo)).toBeVisible();

    await page.goto("/");
    await expect(franja(page)).toHaveText("<b>Hola</b>");
    await expect(franja(page).locator("b")).toHaveCount(0);
  });

  test("US1-6, FR-013, SC-003: los precios no cambian con el sello activo", async ({ page }) => {
    desactivarSello();
    await entrar(page);
    const conUnidades = nombreUnico("Precio sello");
    const sinUnidades = nombreUnico("Precio sello agotado");
    await altaProducto(page, { nombre: conUnidades, existencia: "5", precioVenta: "1,250.00" });
    await altaProducto(page, { nombre: sinUnidades, existencia: "0", precioVenta: "1,250.00" });

    async function precios() {
      await page.goto("/");
      const catalogo = await page.getByRole("article").filter({ hasText: conUnidades }).innerText();
      const propuestos: string[] = [];
      for (const [nombre, boton] of [
        [conUnidades, /^Vender/],
        [conUnidades, /^Apartar/],
        [sinUnidades, /^Encargar/],
      ] as const) {
        await page.goto("/admin");
        await page.getByRole("listitem").filter({ hasText: nombre }).getByRole("button", { name: boton }).click();
        const hoja = page.getByRole("dialog");
        propuestos.push(await hoja.getByLabel("Precio acordado").inputValue());
      }
      return { catalogo: catalogo.match(/\$[\d,.]+ MXN/)?.[0], propuestos };
    }

    const sinSello = await precios();
    fijarSello(BUEN_FIN, "rojo", true);
    const conSello = await precios();

    expect(sinSello.catalogo).toBe("$1,250.00 MXN");
    expect(sinSello.propuestos).toEqual(["1250.00", "1250.00", "1250.00"]);
    expect(conSello).toEqual(sinSello);
  });

  test("FR-014, SC-005: axe no encuentra faltas en el catálogo con cada color", async ({ page }) => {
    for (const color of COLORES) {
      fijarSello(BUEN_FIN, color.clave, true);
      await page.goto("/");
      await expect(franja(page)).toHaveAttribute("data-color", color.clave);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${color.nombre} ${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
    }
  });
});

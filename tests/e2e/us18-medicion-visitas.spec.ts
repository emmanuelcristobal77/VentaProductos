import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { EVENTO_INTERES, UMAMI } from "../../src/lib/estadisticas";
import { SIN_INFORMACION } from "../../src/lib/mensajes";
import { entrar, insertarProductosDePrueba, nombreUnico, sqlDePrueba } from "./ayudantes";
import { bloquearUmami, llamadasUmami, scriptUmami, simularUmami } from "./ayudantes-medicion";

// Spec 006. El teléfono del negocio en las pruebas es 5512345678 (playwright.config.ts).
const TELEFONO_NEGOCIO = "55 1234 5678";
const ENLACE_TEL = "tel:+525512345678";

const textoSql = (valor: string) => `'${valor.replace(/'/g, "''")}'`;

/** Abre la página de un producto nuevo, que es el más reciente y sale primero en el catálogo. */
async function abrirProductoNuevo(pagina: Page) {
  const [nombre] = await insertarProductosDePrueba([{ nombre: nombreUnico("Medición") }]);
  await pagina.goto("/");
  await pagina.locator('a[href^="/producto/"]').filter({ hasText: nombre }).first().click();
  await expect(pagina.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
  return { nombre, ruta: new URL(pagina.url()).pathname };
}

function crearArticuloEncargo() {
  const nombre = nombreUnico("Encargo medición");
  const ahora = new Date().toISOString();
  sqlDePrueba(
    `INSERT INTO articulos_encargo (id, nombre, descripcion, precio_centavos, activo, creado_en, actualizado_en)
     VALUES (${textoSql(randomUUID())}, ${textoSql(nombre)}, 'Descripción de prueba', 45000, 1, ${textoSql(ahora)}, ${textoSql(ahora)})`,
  );
  return nombre;
}

/**
 * Toca un teléfono sin que el navegador de pruebas intente abrir `tel:`. Un listener en `window`
 * corre después del de React y anota si alguien canceló el clic antes que él.
 */
async function tocarTelefono(pagina: Page, enlace: Locator) {
  await expect(enlace).toHaveAttribute("href", ENLACE_TEL);
  await pagina.evaluate(() => {
    window.addEventListener(
      "click",
      (evento) => {
        (window as unknown as { __prevenido: boolean }).__prevenido = evento.defaultPrevented;
        evento.preventDefault();
      },
      { once: true },
    );
  });
  await enlace.click();
  return pagina.evaluate(() => (window as unknown as { __prevenido?: boolean }).__prevenido);
}

async function esperarScript(pagina: Page) {
  await expect(scriptUmami(pagina)).toHaveCount(1);
}

function errores(pagina: Page) {
  const lista: Error[] = [];
  pagina.on("pageerror", (error) => lista.push(error));
  return lista;
}

const sinTelefonos = (llamadas: unknown[][]) => expect(JSON.stringify(llamadas)).not.toMatch(/\d{10}|\d{2} \d{4} \d{4}/);

test.describe("US1: saber cuánta gente visita el catálogo y qué ve", () => {
  test.beforeEach(({ page }) => simularUmami(page));

  test("FR-001: todas las páginas de cliente cargan el script con sus atributos", async ({ page }) => {
    const { ruta } = await abrirProductoNuevo(page);
    for (const destino of ["/", ruta, "/encargos", "/mis-apartados", "/aviso-de-privacidad"]) {
      await page.goto(destino);
      await esperarScript(page);
      const script = scriptUmami(page);
      await expect(script).toHaveAttribute("data-website-id", UMAMI.idSitio);
      await expect(script).toHaveAttribute("data-domains", UMAMI.dominios);
      await expect(script).toHaveAttribute("data-before-send", "antesDeEnviarUmami");
    }
  });

  test("FR-002, US1-4: el inicio de sesión y el panel no cargan el script", async ({ page }) => {
    await page.goto("/admin/entrar");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await page.waitForLoadState("load");
    await expect(scriptUmami(page)).toHaveCount(0);

    await entrar(page);
    for (const destino of ["/admin", "/admin/operaciones"]) {
      await page.goto(destino);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("load");
      await expect(scriptUmami(page)).toHaveCount(0);
    }
  });

  test("FR-002: el filtro antesDeEnviarUmami descarta las rutas del panel", async ({ page }) => {
    await page.goto("/");
    await esperarScript(page);
    expect(await page.evaluate(() => window.antesDeEnviarUmami?.("event", { url: "/admin" }))).toBe(false);
    const carga = await page.evaluate(() => window.antesDeEnviarUmami?.("event", { url: "/encargos" }));
    expect(carga).toEqual({ url: "/encargos" });
  });

  test("Navegación sin recargar: al abrir un producto con un clic sigue habiendo un solo script", async ({ page }) => {
    const [nombre] = await insertarProductosDePrueba([{ nombre: nombreUnico("Navegación") }]);
    await page.goto("/");
    await esperarScript(page);
    await page.locator('a[href^="/producto/"]').filter({ hasText: nombre }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
    await expect(scriptUmami(page)).toHaveCount(1);
  });

  test("FR-004, SC-005: consultar «Mis apartados» no envía el nombre ni el teléfono", async ({ page }) => {
    await page.goto("/mis-apartados");
    await esperarScript(page);
    await page.getByLabel("Nombre").fill("Ana Prueba");
    await page.getByLabel("Teléfono").fill("5598765432");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByText(SIN_INFORMACION)).toBeVisible();

    const llamadas = JSON.stringify(await llamadasUmami(page));
    expect(llamadas).not.toContain("Ana Prueba");
    expect(llamadas).not.toContain("5598765432");
    expect(page.url()).not.toContain("5598765432");
    expect(page.url()).not.toContain("Ana");
  });
});

test.describe("FR-005: con el servicio de estadísticas bloqueado", () => {
  test("las páginas de cliente cargan igual y sin errores", async ({ page }) => {
    await bloquearUmami(page);
    const lista = errores(page);
    const { ruta } = await abrirProductoNuevo(page);
    for (const destino of ["/", ruta, "/mis-apartados"]) {
      await page.goto(destino);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    expect(lista).toEqual([]);
  });
});

test.describe("US4: informar al cliente de la medición", () => {
  test("US4-1, SC-007: el aviso explica la medición anónima y sin cookies", async ({ page }) => {
    await page.goto("/aviso-de-privacidad");
    await expect(page.getByText(/medimos de forma anónima/)).toBeVisible();
    await expect(page.getByText(/No usamos cookies/)).toBeVisible();
  });
});

test.describe("US3: saber cuántas visitas terminan en interés por comprar", () => {
  test.beforeEach(({ page }) => simularUmami(page));

  test("US3-1, FR-006: el teléfono de un producto cuenta un interesado con ese producto", async ({ page }) => {
    const { nombre, ruta } = await abrirProductoNuevo(page);
    await esperarScript(page);
    const prevenido = await tocarTelefono(page, page.getByRole("link", { name: `Contacto: ${TELEFONO_NEGOCIO}` }));
    expect(prevenido).toBe(false);
    const llamadas = await llamadasUmami(page);
    expect(llamadas).toEqual([[EVENTO_INTERES, { pagina: ruta, producto: nombre }]]);
    sinTelefonos(llamadas);
  });

  test("US3-2: el teléfono de un artículo por encargo y el del pie de página", async ({ page }) => {
    const articulo = crearArticuloEncargo();
    await page.goto("/encargos");
    await esperarScript(page);
    const tarjeta = page.getByRole("listitem").filter({ hasText: articulo });
    await tocarTelefono(page, tarjeta.getByRole("link", { name: `Contacto: ${TELEFONO_NEGOCIO}` }));
    expect(await llamadasUmami(page)).toEqual([[EVENTO_INTERES, { pagina: "/encargos", producto: articulo }]]);

    await page.goto("/");
    await esperarScript(page);
    await tocarTelefono(page, page.getByRole("contentinfo").getByRole("link", { name: TELEFONO_NEGOCIO }));
    expect(await llamadasUmami(page)).toEqual([[EVENTO_INTERES, { pagina: "/" }]]);
  });

  test("FR-006: el teléfono de «Dudas» en el aviso de privacidad", async ({ page }) => {
    await page.goto("/aviso-de-privacidad");
    await esperarScript(page);
    await tocarTelefono(page, page.getByRole("main").getByRole("link", { name: TELEFONO_NEGOCIO }));
    expect(await llamadasUmami(page)).toEqual([[EVENTO_INTERES, { pagina: "/aviso-de-privacidad" }]]);
  });

  test("FR-006: el teléfono de una búsqueda sin resultados", async ({ page }) => {
    await page.goto("/");
    await esperarScript(page);
    await page.getByRole("searchbox", { name: "Buscar productos" }).fill("zzqq sin resultados");
    const mensaje = page.getByText(/No encontramos productos con/);
    await expect(mensaje).toBeVisible();
    await tocarTelefono(page, mensaje.getByRole("link", { name: TELEFONO_NEGOCIO }));
    expect(await llamadasUmami(page)).toEqual([[EVENTO_INTERES, { pagina: "/" }]]);
  });

  test("US3-3, FR-005: con el servicio bloqueado, el teléfono sigue igual y sin errores", async ({ page }) => {
    await page.unrouteAll();
    await bloquearUmami(page);
    const lista = errores(page);
    await abrirProductoNuevo(page);
    const enlace = page.getByRole("link", { name: `Contacto: ${TELEFONO_NEGOCIO}` });
    expect(await tocarTelefono(page, enlace)).toBe(false);
    await expect(enlace).toHaveAttribute("href", ENLACE_TEL);
    expect(lista).toEqual([]);
  });
});

test.describe("US2: saber de dónde llega la gente", () => {
  test.beforeEach(({ page }) => simularUmami(page));

  test("US2-1, US2-2: un enlace con etiquetas muestra el mismo catálogo y las conserva", async ({ page }) => {
    await page.goto("/");
    await esperarScript(page);
    const encabezado = await page.getByRole("heading", { level: 1 }).textContent();
    const tarjetas = await page.locator('a[href^="/producto/"]').count();

    await page.goto("/?utm_source=whatsapp&utm_campaign=prueba");
    await esperarScript(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(encabezado!);
    await expect(page.locator('a[href^="/producto/"]')).toHaveCount(tarjetas);
    const url = new URL(page.url());
    expect(url.searchParams.get("utm_source")).toBe("whatsapp");
    expect(url.searchParams.get("utm_campaign")).toBe("prueba");
  });

  test("Etiquetas mal escritas: la página carga normal", async ({ page }) => {
    await page.goto("/?utm_sorce=x");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await esperarScript(page);
  });
});

import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { altaProducto, entrar, insertarProductosDePrueba, nombreUnico, sqlDePrueba } from "./ayudantes";

const CASILLA = "Se informó al cliente del aviso de privacidad";
const FALTA_CASILLA = "Informa al cliente del aviso de privacidad y marca la casilla.";

function fila(pagina: Page, nombre: string) {
  return pagina.getByRole("listitem").filter({ hasText: nombre });
}

async function revisarCasilla(hoja: Locator) {
  await expect(hoja.getByRole("checkbox", { name: CASILLA })).not.toBeChecked();
  const enlace = hoja.getByRole("link", { name: /Ver aviso de privacidad/ });
  await expect(enlace).toHaveAttribute("href", "/aviso-de-privacidad");
  await expect(enlace).toHaveAttribute("target", "_blank");
}

test.describe("US11: constancia del aviso de privacidad (spec 003, historia 2)", () => {
  test("US2-1, US2-2, US2-3, US2-6 y US2-8: el apartado exige la casilla y el detalle muestra la constancia", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Yoyo");
    await altaProducto(page, { nombre });

    await fila(page, nombre).getByRole("button", { name: /^Apartar/ }).click();
    const hoja = page.getByRole("dialog");
    await revisarCasilla(hoja);
    await hoja.getByLabel("Nombre del cliente").fill("Ana López");
    await hoja.getByLabel("Teléfono").fill("5512345678");
    await hoja.getByLabel("Pago inicial").fill("100.00");
    await hoja.getByRole("button", { name: "Registrar apartado" }).click();

    // US2-2: no se guarda, el mensaje queda junto a la casilla y lo capturado se conserva.
    const casilla = hoja.getByRole("checkbox", { name: CASILLA });
    await expect(casilla).toHaveAccessibleDescription(FALTA_CASILLA);
    await expect(hoja.getByLabel("Nombre del cliente")).toHaveValue("Ana López");

    // US2-3 y US2-6: con la casilla se guarda y el detalle muestra la constancia con fecha y hora.
    await casilla.check();
    await hoja.getByRole("button", { name: "Registrar apartado" }).click();
    await expect(page.getByRole("heading", { name: /Apartado/ })).toBeVisible();
    await expect(page.getByText(CASILLA)).toBeVisible();
    await expect(page.getByText(/de \d{4}, \d{1,2}:\d{2} [ap]\. m\., hora del centro de México/).first()).toBeVisible();
  });

  test("US2-4, US2-5 y SC-004: la venta exige la casilla solo si hay datos del comprador", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Canica");
    await altaProducto(page, { nombre });

    await fila(page, nombre).getByRole("button", { name: /^Vender/ }).click();
    const hoja = page.getByRole("dialog");
    await revisarCasilla(hoja);
    await hoja.getByLabel("Teléfono (opcional)").fill("5512345678");
    await hoja.getByRole("button", { name: "Registrar venta" }).click();
    await expect(hoja.getByRole("checkbox", { name: CASILLA })).toHaveAccessibleDescription(FALTA_CASILLA);

    // SC-004: sin datos, la venta se registra con los mismos pasos que antes de la spec 003.
    await hoja.getByLabel("Teléfono (opcional)").fill("");
    await hoja.getByRole("button", { name: "Registrar venta" }).click();
    await expect(page.getByRole("heading", { name: /Venta/ })).toBeVisible();
    await expect(page.getByText(CASILLA)).toHaveCount(0);
  });

  test("FR-007 y FR-008: la hoja de encargo también tiene la casilla y la exige", async ({ page }) => {
    await entrar(page);
    const [nombre] = await insertarProductosDePrueba([{ nombre: nombreUnico("Agotado"), existencia: 0 }]);
    await page.goto("/admin");
    await fila(page, nombre).getByRole("button", { name: /^Encargar/ }).click();
    const hoja = page.getByRole("dialog");
    await revisarCasilla(hoja);
    await hoja.getByLabel("Nombre del cliente").fill("Ana López");
    await hoja.getByLabel("Teléfono").fill("5512345678");
    await hoja.getByLabel("Anticipo").fill("50.00");
    await hoja.getByRole("button", { name: "Registrar encargo" }).click();
    await expect(hoja.getByRole("checkbox", { name: CASILLA })).toHaveAccessibleDescription(FALTA_CASILLA);
    await hoja.getByRole("checkbox", { name: CASILLA }).check();
    await hoja.getByRole("button", { name: "Registrar encargo" }).click();
    await expect(page.getByRole("heading", { name: /Encargo/ })).toBeVisible();
    await expect(page.getByText(CASILLA)).toBeVisible();
  });

  test("US2-7: una operación anterior a la spec 003 muestra que no tiene constancia", async ({ page }) => {
    const [nombre] = await insertarProductosDePrueba([{ nombre: nombreUnico("Antiguo") }]);
    const id = randomUUID();
    sqlDePrueba(
      `INSERT INTO operaciones (id, tipo, estado, producto_id, cantidad, precio_unitario_centavos,
         cliente_nombre, cliente_nombre_norm, cliente_telefono, creado_en)
       VALUES ('${id}', 'apartado', 'pendiente', (SELECT id FROM productos WHERE nombre = '${nombre}'), 1, 99000,
         'Ana López', 'ana lopez', '5512345678', '2026-11-01T18:00:00.000Z');
       INSERT INTO pagos (id, operacion_id, importe_centavos, fecha)
       VALUES ('${randomUUID()}', '${id}', 10000, '2026-11-01T18:00:00.000Z');`,
    );
    await entrar(page);
    await page.goto(`/admin/operaciones/${id}`);
    await expect(page.getByText("Sin constancia del aviso: se registró antes de que existiera")).toBeVisible();
  });

  test("FR-019: la hoja de apartado con la casilla no tiene faltas de axe", async ({ page }) => {
    await entrar(page);
    const nombre = nombreUnico("Axe");
    await altaProducto(page, { nombre });
    await fila(page, nombre).getByRole("button", { name: /^Apartar/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Registrar apartado" }).click();
    await expect(page.getByRole("dialog").getByText(FALTA_CASILLA)).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { entrar, insertarProductosDePrueba, nombreUnico, sqlDePrueba } from "./ayudantes";
import { comprimido, renglon, subirCarga } from "./ayudantes-carga";

test.describe("US14: productos que ya existen (spec 004, historia 3)", () => {
  test("US3-1 a US3-3, US3-6 y SC-005: compara, actualiza solo los marcados y respeta los apartados", async ({ page }) => {
    await entrar(page);
    const base = nombreUnico("Existe");
    const [marcado, sinMarcar, apartado] = await insertarProductosDePrueba([
      { nombre: `${base} marcado` },
      { nombre: `${base} sin marcar` },
      { nombre: `${base} apartado` },
    ]);
    sqlDePrueba(
      `INSERT INTO operaciones (id, tipo, estado, producto_id, cantidad, precio_unitario_centavos, cliente_nombre,
         cliente_nombre_norm, cliente_telefono, aviso_informado, creado_en)
       VALUES ('${crypto.randomUUID()}', 'apartado', 'pendiente',
         (SELECT id FROM productos WHERE nombre = '${apartado}'), 3, 99000, 'Ana', 'ana', '5512345678', 1, '2026-11-07T10:00:00.000Z')`,
    );

    await subirCarga(
      page,
      comprimido([
        renglon(marcado.toUpperCase(), { precio_venta: "1100.00", fotos: "azul.png" }),
        renglon(sinMarcar, { precio_venta: "1200.00" }),
        renglon(apartado, { existencia: "1" }),
      ]),
    );

    const lista = page.getByRole("region", { name: "Productos que ya existen" });
    const tarjeta = lista.getByRole("listitem").filter({ hasText: `Actualizar «${marcado}»` });
    await expect(tarjeta.getByRole("row", { name: /Precio de venta · Cambia/ })).toContainText("$990.00 MXN");
    await expect(tarjeta.getByRole("row", { name: /Precio de venta · Cambia/ })).toContainText("$1,100.00 MXN");
    await expect(tarjeta.getByRole("row", { name: "Existencia" })).not.toContainText("Cambia");
    await expect(tarjeta.getByRole("img", { name: `Foto nueva 1 de ${marcado.toUpperCase()}` })).toBeVisible();
    await expect(lista.getByRole("listitem").filter({ hasText: `Actualizar «${apartado}»` })).toContainText(
      "Tiene 3 apartadas; no se podrá actualizar",
    );

    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);

    await page.getByRole("button", { name: "Marcar todos", exact: true }).click();
    await expect(page.getByRole("button", { name: "Actualizar marcados (3)" })).toBeVisible();
    await page.getByRole("button", { name: "Desmarcar todos" }).click();
    await page.getByRole("checkbox", { name: `Actualizar «${marcado}»` }).check();
    await page.getByRole("checkbox", { name: `Actualizar «${apartado}»` }).check();
    await page.getByRole("button", { name: "Actualizar marcados (2)" }).click();

    await expect(page.getByText("Se actualizó 1 producto.")).toBeVisible();
    await expect(tarjeta).toContainText("Actualizado");
    await expect(lista.getByRole("listitem").filter({ hasText: `Actualizar «${sinMarcar}»` })).toContainText("No actualizado");
    await expect(lista.getByRole("listitem").filter({ hasText: `Actualizar «${apartado}»` })).toContainText(
      "No se pudo actualizar: La existencia no puede ser menor a las unidades apartadas.",
    );
    await expect(page.getByRole("checkbox", { name: `Actualizar «${sinMarcar}»` })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Actualizar marcados/ })).toBeDisabled();

    await page.goto("/admin");
    await page.getByRole("searchbox").fill(base);
    await expect(page.getByRole("listitem").filter({ hasText: marcado.toUpperCase() })).toContainText("$1,100.00 MXN");
    await expect(page.getByRole("listitem").filter({ hasText: sinMarcar })).toContainText("$990.00 MXN");
  });

  test("US3-9: confirmar sin marcar ninguno no cambia nada", async ({ page }) => {
    await entrar(page);
    const [nombre] = await insertarProductosDePrueba([{ nombre: nombreUnico("Intacto") }]);
    await subirCarga(page, comprimido([renglon(nombre, { precio_venta: "1500.00" })]));
    await page.getByRole("button", { name: "Actualizar marcados (0)" }).click();
    await expect(page.getByText("No se actualizó ningún producto.")).toBeVisible();

    await page.goto("/admin");
    await page.getByRole("searchbox").fill(nombre);
    await expect(page.getByRole("listitem").filter({ hasText: nombre })).toContainText("$990.00 MXN");
  });
});

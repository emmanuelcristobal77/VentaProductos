import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import sharp from "sharp";

export const USUARIO = "vendedor";
export const CONTRASENA = "contrasena-de-prueba";

export async function entrar(pagina: Page) {
  await pagina.goto("/admin/entrar");
  await pagina.getByLabel("Usuario").fill(USUARIO);
  await pagina.getByLabel("Contraseña").fill(CONTRASENA);
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await expect(pagina.getByRole("heading", { name: "Productos", exact: true })).toBeVisible();
}

export async function fotoDePrueba() {
  const buffer = await sharp({
    create: { width: 40, height: 40, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer();
  return { name: "foto.png", mimeType: "image/png", buffer };
}

export async function agregarFoto(pagina: Page) {
  const antes = await pagina.locator('input[name="fotos"]').count();
  await pagina.getByLabel("Agregar fotos", { exact: true }).setInputFiles(await fotoDePrueba());
  await expect(pagina.locator('input[name="fotos"]')).toHaveCount(antes + 1);
}

export interface DatosAlta {
  nombre: string;
  descripcion?: string;
  categoria?: string;
  existencia?: string;
  precioCompra?: string;
  precioVenta?: string;
  conFoto?: boolean;
}

export async function llenarAlta(pagina: Page, datos: DatosAlta) {
  await pagina.goto("/admin/productos/nuevo");
  await pagina.getByLabel("Nombre", { exact: true }).fill(datos.nombre);
  await pagina.getByLabel("Descripción").fill(datos.descripcion ?? "Descripción de prueba");
  await pagina.getByLabel("Categoría", { exact: true }).selectOption({ label: datos.categoria ?? "Juguetes" });
  await pagina.getByLabel("Cantidad existente").fill(datos.existencia ?? "5");
  await pagina.getByLabel("Precio de compra").fill(datos.precioCompra ?? "800.00");
  await pagina.getByLabel("Precio de venta").fill(datos.precioVenta ?? "1,250.00");
  if (datos.conFoto !== false) await agregarFoto(pagina);
}

export async function altaProducto(pagina: Page, datos: DatosAlta) {
  await llenarAlta(pagina, datos);
  await pagina.getByRole("button", { name: "Guardar producto" }).click();
  await expect(pagina.getByRole("heading", { name: "Productos", exact: true })).toBeVisible();
}

export function nombreUnico(base: string) {
  return `${base} ${Date.now().toString(36)}`;
}

/** Ejecuta SQL contra la base de pruebas, para preparar datos de historias aún sin pantalla. */
export function sqlDePrueba(consulta: string) {
  execFileSync(
    process.execPath,
    [
      "-e",
      `const D=require('better-sqlite3');const d=new D('datos/e2e/vende-productos.sqlite');d.exec(process.argv[1]);d.close()`,
      consulta,
    ],
    { stdio: "pipe" },
  );
}

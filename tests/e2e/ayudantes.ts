import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
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
      // La consulta va por la entrada estándar: en Windows, una línea de comandos larga falla.
      `const D=require('better-sqlite3');const d=new D('datos/e2e/vende-productos.sqlite');d.exec(require('fs').readFileSync(0,'utf8'));d.close()`,
    ],
    { input: consulta, stdio: "pipe" },
  );
}

const FOTO_VALIDA = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Un archivo de foto ya guardado en la carpeta de pruebas; si no hay ninguno, lo crea. */
async function fotoExistente() {
  const carpeta = path.join("datos", "e2e", "fotos");
  mkdirSync(carpeta, { recursive: true });
  const existente = readdirSync(carpeta).find((archivo) => FOTO_VALIDA.test(archivo));
  if (existente) return existente;
  const archivo = `${randomUUID()}.png`;
  writeFileSync(path.join(carpeta, archivo), (await fotoDePrueba()).buffer);
  return archivo;
}

const textoSql = (valor: string) => `'${valor.replace(/'/g, "''")}'`;

/** Crea una categoría solo para una prueba, para contar sus productos sin los de otras pruebas. */
export function crearCategoriaDePrueba(nombre: string) {
  const id = randomUUID();
  sqlDePrueba(
    `INSERT INTO categorias (id, nombre, nombre_norm, activo)
     VALUES (${textoSql(id)}, ${textoSql(nombre)}, ${textoSql(nombre.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase())}, 1)`,
  );
  return id;
}

export interface ProductoDePrueba {
  nombre: string;
  descripcion?: string;
  existencia?: number;
  categoriaId?: string;
}

/**
 * Inserta productos activos con foto y fechas de alta distintas, en el orden en que la lista
 * los muestra: el primero es el más reciente.
 */
export async function insertarProductosDePrueba(lista: ProductoDePrueba[]) {
  const archivo = await fotoExistente();
  const base = Date.now();
  const categoria = (id?: string) =>
    id ? textoSql(id) : "(SELECT id FROM categorias WHERE nombre = 'Juguetes' AND activo = 1)";
  const sentencias = lista.map((producto, i) => {
    const id = randomUUID();
    const fecha = textoSql(new Date(base - i * 1000).toISOString());
    return `INSERT INTO productos (id, nombre, descripcion, categoria_id, existencia, precio_compra_centavos,
              precio_venta_centavos, activo, creado_en, actualizado_en)
            VALUES (${textoSql(id)}, ${textoSql(producto.nombre)}, ${textoSql(producto.descripcion ?? "Descripción de prueba")},
              ${categoria(producto.categoriaId)}, ${producto.existencia ?? 5}, 50000, 99000, 1, ${fecha}, ${fecha});
            INSERT INTO fotos (id, producto_id, archivo, orden, activo)
            VALUES (${textoSql(randomUUID())}, ${textoSql(id)}, ${textoSql(archivo)}, 0, 1);`;
  });
  sqlDePrueba(`BEGIN; ${sentencias.join("\n")} COMMIT;`);
  return lista.map((producto) => producto.nombre);
}

/** n productos activos con fechas de alta distintas; devuelve sus nombres del más reciente al más antiguo. */
export function crearProductosDePrueba(n: number, prefijo: string, opciones: Omit<ProductoDePrueba, "nombre"> = {}) {
  return insertarProductosDePrueba(
    Array.from({ length: n }, (_, i) => ({ ...opciones, nombre: `${prefijo} ${String(i + 1).padStart(3, "0")}` })),
  );
}

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { directorioDatos } from "./entorno";
import { ErrorNegocio } from "./resultado";

export const TAMANO_MAXIMO_FOTO = 10 * 1024 * 1024;

const EXTENSIONES: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };
const TIPOS: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const NOMBRE_VALIDO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const FOTO_INVALIDA = "La foto debe ser JPEG, PNG o WebP de hasta 10 MB.";

const carpeta = () => path.join(directorioDatos(), "fotos");

export async function guardarFoto(contenido: Buffer): Promise<string> {
  if (contenido.length === 0 || contenido.length > TAMANO_MAXIMO_FOTO) {
    throw new ErrorNegocio("DATOS_INVALIDOS", FOTO_INVALIDA);
  }

  const formato = await sharp(contenido)
    .metadata()
    .then((m) => m.format)
    .catch(() => undefined);
  const extension = formato && EXTENSIONES[formato];
  if (!extension) throw new ErrorNegocio("DATOS_INVALIDOS", FOTO_INVALIDA);

  const archivo = `${randomUUID()}.${extension}`;
  await mkdir(carpeta(), { recursive: true });
  await writeFile(path.join(carpeta(), archivo), contenido);
  return archivo;
}

export async function leerFoto(archivo: string) {
  if (!NOMBRE_VALIDO.test(archivo)) return null;
  try {
    const contenido = await readFile(path.join(carpeta(), archivo));
    return { contenido, tipo: TIPOS[archivo.split(".")[1]] };
  } catch {
    return null;
  }
}

export const urlFoto = (archivo: string) => `/api/fotos/${archivo}`;

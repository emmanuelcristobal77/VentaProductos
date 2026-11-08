/*
 * Reglas puras de la carga masiva (spec 004). No importa nada de la base, del disco ni de sharp,
 * para que el navegador y el servidor usen las mismas (plan, Structure Decision).
 * Los textos son los de contracts/archivo-carga.md y contracts/interfaz.md.
 */
import { ErrorNegocio } from "@/lib/resultado";
import { parsearImporteArchivo } from "./dinero";
import { normalizarNombre } from "./normalizacion";

export const COLUMNAS = [
  "nombre",
  "descripcion",
  "categoria",
  "subcategoria",
  "existencia",
  "precio_compra",
  "precio_venta",
  "fotos",
] as const;

export const COLUMNAS_REPORTE = [...COLUMNAS, "renglon", "lista", "resultado", "motivo"] as const;

export const LIMITE_RENGLONES = 200;
export const LIMITE_BYTES = 52_428_800;
export const LIMITE_TXT = 2 * 1024 * 1024;
export const LIMITE_ENTRADAS = 2000;

export const EJEMPLO = [
  COLUMNAS.join("|"),
  "Muñeca de trapo|Muñeca hecha a mano de 30 cm|Juguetes|Muñecas|5|120.00|250.00|muneca1.jpg,muneca2.jpg",
  "Playera infantil rayada|Playera de algodón talla 6|Ropa||12|80|149.90|playera.jpg",
];
export const RENGLON_EJEMPLO = EJEMPLO[2];
export const NOMBRE_EJEMPLO = "ejemplo-carga-masiva.txt";

/** Rechazos de toda la carga (contracts/archivo-carga.md). */
export const RECHAZO = {
  noEsZip: "El archivo no es un comprimido .zip válido.",
  muyGrande: "El comprimido pasa de 50 MB. Divide los productos en varias cargas.",
  demasiadasEntradas: "El comprimido trae demasiados archivos. Divide los productos en varias cargas.",
  sinTxt: "El comprimido no trae el archivo de productos (.txt).",
  variosTxt: "El comprimido trae más de un archivo .txt; deja solo el de productos.",
  txtGrande: "El archivo de productos es demasiado grande. Divide los productos en varias cargas.",
  noUtf8: "El archivo de productos debe guardarse con codificación UTF-8.",
  encabezado: "El encabezado no coincide con el formato.",
  sinProductos: "El archivo de productos no trae ningún producto.",
  demasiados: (n: number) => `El archivo trae ${n} productos; el máximo por carga es ${LIMITE_RENGLONES}.`,
  faltaColumna: (c: string) => `Falta la columna «${c}».`,
  sobraColumna: (c: string) => `Sobra la columna «${c}».`,
  otroOrden: "Las columnas están en otro orden.",
} as const;

/** Motivos por renglón (contracts/archivo-carga.md, Motivos). */
export const MOTIVO = {
  columnas: (n: number) => `El renglón trae ${n} columnas; deben ser ${COLUMNAS.length}.`,
  sinNombre: "Falta el nombre.",
  repetido: "Renglón repetido en el archivo",
  sinDescripcion: "Falta la descripción.",
  sinCategoria: "Falta la categoría.",
  todos: '"Todos" está reservado para el filtro; elige otro nombre.',
  existencia: "La existencia debe ser un número entero de 0 en adelante.",
  precioCompra:
    "El precio de compra debe ser mayor a cero, con punto decimal y hasta dos decimales, sin $ ni comas.",
  precioVenta:
    "El precio de venta debe ser mayor a cero, con punto decimal y hasta dos decimales, sin $ ni comas.",
  ambiguo: "Hay más de un producto con este nombre; actualízalo desde la edición individual",
  sinFoto: "El renglón no indica foto",
  fotoNoViene: (f: string) => `La foto no viene en el comprimido: ${f}`,
  fotoNoValida: (f: string) => `La foto no es una imagen válida: ${f}`,
  avisoNoViene: (f: string) => `No viene en el comprimido: ${f}`,
  avisoNoValida: (f: string) => `No es una imagen válida: ${f}`,
  productoInactivo: "El producto ya no está activo.",
  nombreNoUnico: "El nombre ya no corresponde a un solo producto.",
  fotosNoDisponibles: "Las fotos nuevas ya no están disponibles; vuelve a subir el comprimido.",
} as const;

export const LISTA = { sinFoto: "Nuevo sin foto", existe: "Ya existe", rechazado: "Rechazado" } as const;

export const RESULTADO = {
  pendiente: "Pendiente de decidir",
  actualizado: "Actualizado",
  noActualizado: "No actualizado",
  error: "No se pudo actualizar",
} as const;

export const NOMBRE_CAMBIO: Record<Cambio, string> = {
  nombre: "nombre",
  descripcion: "descripción",
  categoria: "categoría",
  subcategoria: "subcategoría",
  existencia: "existencia",
  precioCompra: "precio de compra",
  precioVenta: "precio de venta",
  fotos: "fotos",
};

export function textoActualizados(n: number): string {
  if (n === 0) return "No se actualizó ningún producto.";
  if (n === 1) return "Se actualizó 1 producto.";
  return `Se actualizaron ${n} productos.`;
}

// ── Tipos (contracts/interfaz.md) ──────────────────────────────────────────

export type Campos = string[];

export type Cambio =
  | "nombre"
  | "descripcion"
  | "categoria"
  | "subcategoria"
  | "existencia"
  | "precioCompra"
  | "precioVenta"
  | "fotos";

export interface DatosComparables {
  nombre: string;
  descripcion: string;
  categoria: string;
  subcategoria: string | null;
  existencia: number;
  precioCompraCentavos: number;
  precioVentaCentavos: number;
}

export interface DatosRenglon extends DatosComparables {
  /** Nombres normalizados con `normalizarNombreFoto`, sin repetidos y en su orden. */
  fotos: string[];
}

export interface RenglonConMotivo {
  numero: number;
  campos: Campos;
  motivo: string;
}

export interface FotoNueva {
  archivo: string;
  nombreOriginal: string;
}

export interface ExistenteConCambios {
  numero: number;
  campos: Campos;
  productoId: string;
  actual: DatosComparables & { apartadas: number; fotos: string[] };
  archivo: DatosComparables;
  cambios: Cambio[];
  fotosNuevas: FotoNueva[];
  fotosFaltantes: string[];
}

export interface ResumenCarga {
  fecha: string;
  cantidades: {
    nuevos: number;
    sinFoto: number;
    existentes: number;
    sinCambios: number;
    rechazados: number;
    fotosNoUsadas: number;
  };
  sinFoto: RenglonConMotivo[];
  rechazados: RenglonConMotivo[];
  existentes: ExistenteConCambios[];
  avisosFotos: { numero: number; nombre: string; avisos: string[] }[];
}

export type Decision =
  | { tipo: "pendiente" }
  | { tipo: "actualizado" }
  | { tipo: "noActualizado" }
  | { tipo: "error"; motivo: string };

// ── Archivo de productos ───────────────────────────────────────────────────

export interface RenglonLeido {
  numero: number;
  campos: Campos;
}

/** Nombre de una foto para compararla: sin carpeta, en NFC y minúsculas (research 3). */
export function normalizarNombreFoto(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? "";
  return base.trim().normalize("NFC").toLowerCase();
}

const separar = (renglon: string) => renglon.split("|").map((c) => c.trim());

/** Revisa el encabezado; devuelve el mensaje completo de rechazo o null si coincide. */
export function revisarEncabezado(campos: Campos): string | null {
  const recibidas = campos.map(normalizarNombre);
  const esperadas: readonly string[] = COLUMNAS;
  if (recibidas.length === esperadas.length && recibidas.every((c, i) => c === esperadas[i])) return null;

  const lineas = [
    ...esperadas.filter((c) => !recibidas.includes(c)).map(RECHAZO.faltaColumna),
    ...campos
      .filter((_, i) => !esperadas.includes(recibidas[i]))
      .map((c) => RECHAZO.sobraColumna(c || "(vacía)")),
  ];
  if (lineas.length === 0) lineas.push(RECHAZO.otroOrden);
  return [RECHAZO.encabezado, ...lineas].join("\n");
}

/**
 * Decodifica el .txt y separa sus renglones (research 4). Lanza un ErrorNegocio con el rechazo de
 * toda la carga si no es UTF-8, si el encabezado no coincide o si no hay productos o hay demasiados.
 */
export function leerArchivoProductos(bytes: Uint8Array): RenglonLeido[] {
  let texto: string;
  try {
    texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.noUtf8);
  }
  if (texto.startsWith("﻿")) texto = texto.slice(1);

  const renglones = texto
    .split(/\r?\n/)
    .map((linea, i) => ({ numero: i + 1, linea }))
    .filter(({ linea }) => linea.trim() !== "");

  const [encabezado, ...productos] = renglones;
  const error = encabezado ? revisarEncabezado(separar(encabezado.linea)) : RECHAZO.sinProductos;
  if (error) throw new ErrorNegocio("DATOS_INVALIDOS", error);
  if (productos.length === 0) throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.sinProductos);
  if (productos.length > LIMITE_RENGLONES) {
    throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.demasiados(productos.length));
  }
  return productos.map(({ numero, linea }) => ({ numero, campos: separar(linea) }));
}

const limpiarNombre = (texto: string) => texto.trim().replace(/\s+/g, " ");

/** Valida un renglón con las reglas del alta individual (FR-006); devuelve el primer motivo. */
export function validarRenglon(
  campos: Campos,
): { ok: true; datos: DatosRenglon } | { ok: false; motivo: string } {
  if (campos.length !== COLUMNAS.length) return { ok: false, motivo: MOTIVO.columnas(campos.length) };

  const [nombreCrudo, descripcion, categoriaCruda, subcategoriaCruda, existencia, compra, venta, fotos] =
    campos.map((c) => c.trim());
  const nombre = limpiarNombre(nombreCrudo);
  const categoria = limpiarNombre(categoriaCruda);
  const subcategoria = limpiarNombre(subcategoriaCruda);

  if (!nombre) return { ok: false, motivo: MOTIVO.sinNombre };
  if (!descripcion) return { ok: false, motivo: MOTIVO.sinDescripcion };
  if (!categoria) return { ok: false, motivo: MOTIVO.sinCategoria };
  if (normalizarNombre(categoria) === "todos" || normalizarNombre(subcategoria) === "todos") {
    return { ok: false, motivo: MOTIVO.todos };
  }
  if (!/^\d+$/.test(existencia) || !Number.isSafeInteger(Number(existencia))) {
    return { ok: false, motivo: MOTIVO.existencia };
  }
  const precioCompraCentavos = parsearImporteArchivo(compra);
  if (precioCompraCentavos === null) return { ok: false, motivo: MOTIVO.precioCompra };
  const precioVentaCentavos = parsearImporteArchivo(venta);
  if (precioVentaCentavos === null) return { ok: false, motivo: MOTIVO.precioVenta };

  const listaFotos: string[] = [];
  for (const foto of fotos.split(",")) {
    const nombreFoto = normalizarNombreFoto(foto);
    if (nombreFoto && !listaFotos.includes(nombreFoto)) listaFotos.push(nombreFoto);
  }

  return {
    ok: true,
    datos: {
      nombre,
      descripcion,
      categoria,
      subcategoria: subcategoria || null,
      existencia: Number(existencia),
      precioCompraCentavos,
      precioVentaCentavos,
      fotos: listaFotos,
    },
  };
}

/** Campos que cambian entre el producto y el renglón (FR-012, research 7). */
export function compararConActual(
  actual: DatosComparables,
  archivo: DatosComparables,
  hayFotosNuevas: boolean,
): Cambio[] {
  const texto = (a: string | null, b: string | null) => normalizarNombre(a ?? "") !== normalizarNombre(b ?? "");
  const cambios: Cambio[] = [];
  if (texto(actual.nombre, archivo.nombre)) cambios.push("nombre");
  if (texto(actual.descripcion, archivo.descripcion)) cambios.push("descripcion");
  if (texto(actual.categoria, archivo.categoria)) cambios.push("categoria");
  if (texto(actual.subcategoria, archivo.subcategoria)) cambios.push("subcategoria");
  if (actual.existencia !== archivo.existencia) cambios.push("existencia");
  if (actual.precioCompraCentavos !== archivo.precioCompraCentavos) cambios.push("precioCompra");
  if (actual.precioVentaCentavos !== archivo.precioVentaCentavos) cambios.push("precioVenta");
  if (hayFotosNuevas) cambios.push("fotos");
  return cambios;
}

// ── Reporte (contracts/archivo-carga.md, Reporte; research 9) ──────────────

const BOM = "﻿";
const FIN = "\r\n";

/** Texto con BOM y renglones \r\n, como lo pide el Bloc de notas (FR-020). */
export function textoParaBlocDeNotas(renglones: string[]): string {
  return BOM + renglones.join(FIN) + FIN;
}

export function textoEjemplo(): string {
  return textoParaBlocDeNotas(EJEMPLO);
}

const camposDeReporte = (campos: Campos) =>
  campos.length < COLUMNAS.length ? [...campos, ...Array(COLUMNAS.length - campos.length).fill("")] : campos;

export function motivoDeCambios(cambios: Cambio[]): string {
  return `Cambia: ${cambios.map((c) => NOMBRE_CAMBIO[c]).join(", ")}`;
}

/** Hay renglones que revisar: sin foto, existentes con cambios o rechazados (US4-5). */
export function hayQueRevisar(resumen: ResumenCarga): boolean {
  return resumen.sinFoto.length + resumen.existentes.length + resumen.rechazados.length > 0;
}

/** Arma el reporte; `decisiones` va por `productoId` y falta antes de confirmar (FR-019). */
export function armarReporte(resumen: ResumenCarga, decisiones: Record<string, Decision> = {}): string {
  const filas: { numero: number; texto: string }[] = [];
  const agregar = (numero: number, campos: Campos, lista: string, resultado: string, motivo: string) =>
    filas.push({
      numero,
      texto: [...camposDeReporte(campos), String(numero), lista, resultado, motivo].join("|"),
    });

  for (const r of resumen.sinFoto) agregar(r.numero, r.campos, LISTA.sinFoto, "", r.motivo);
  for (const r of resumen.rechazados) agregar(r.numero, r.campos, LISTA.rechazado, "", r.motivo);
  for (const e of resumen.existentes) {
    const decision = decisiones[e.productoId] ?? { tipo: "pendiente" };
    const motivo = decision.tipo === "error" ? decision.motivo : motivoDeCambios(e.cambios);
    agregar(e.numero, e.campos, LISTA.existe, RESULTADO[decision.tipo], motivo);
  }

  filas.sort((a, b) => a.numero - b.numero);
  return textoParaBlocDeNotas([COLUMNAS_REPORTE.join("|"), ...filas.map((f) => f.texto)]);
}

const relojMexico = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** `reporte-carga-AAAA-MM-DD-HHMM.txt`, con la hora de México. */
export function nombreReporte(fecha: string): string {
  const p = Object.fromEntries(relojMexico.formatToParts(new Date(fecha)).map((x) => [x.type, x.value]));
  return `reporte-carga-${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}.txt`;
}

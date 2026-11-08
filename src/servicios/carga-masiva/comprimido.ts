import { unzipSync, type UnzipFileInfo } from "fflate";
import {
  LIMITE_ENTRADAS,
  LIMITE_TXT,
  normalizarNombreFoto,
  RECHAZO,
} from "@/dominio/carga-masiva";
import { TAMANO_MAXIMO_FOTO } from "@/lib/fotos";
import { ErrorNegocio } from "@/lib/resultado";

/** Página de códigos 850, bytes 0x80 a 0xFF (research 3). */
const CP850 =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ";

const utf8Estricto = new TextDecoder("utf-8", { fatal: true });

function decodificarCp850(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => (b < 0x80 ? String.fromCharCode(b) : CP850[b - 0x80])).join("");
}

/**
 * Lee las banderas del directorio central para saber qué nombres traen la marca UTF-8 (bit 11).
 * `fflate` entrega los nombres sin esa marca como latin-1 y no informa la bandera. Devuelve null si
 * el directorio no se puede recorrer (por ejemplo, Zip64); entonces se usan los nombres de `fflate`.
 */
function banderasUtf8(datos: Uint8Array): boolean[] | null {
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength);
  let fin = datos.length - 22;
  while (fin >= 0 && vista.getUint32(fin, true) !== 0x06054b50) fin--;
  if (fin < 0) return null;

  const cuantas = vista.getUint16(fin + 10, true);
  let posicion = vista.getUint32(fin + 16, true);
  const banderas: boolean[] = [];
  for (let i = 0; i < cuantas; i++) {
    if (posicion + 46 > datos.length || vista.getUint32(posicion, true) !== 0x02014b50) return null;
    banderas.push((vista.getUint16(posicion + 8, true) & 0x0800) !== 0);
    posicion +=
      46 +
      vista.getUint16(posicion + 28, true) +
      vista.getUint16(posicion + 30, true) +
      vista.getUint16(posicion + 32, true);
  }
  return banderas;
}

/** Nombre legible de una entrada, con la bandera UTF-8 o por CP850 si no la trae (research 3). */
function decodificarNombre(nombre: string, utf8: boolean | undefined): string {
  if (utf8 !== false || [...nombre].some((c) => c.charCodeAt(0) > 0xff)) return nombre;
  const bytes = Uint8Array.from(nombre, (c) => c.charCodeAt(0));
  try {
    return utf8Estricto.decode(bytes);
  } catch {
    return decodificarCp850(bytes);
  }
}

interface Entrada {
  indice: number;
  /** Nombre que entrega `fflate`, que sirve de llave para descomprimir. */
  llave: string;
  ruta: string;
  base: string;
  tamano: number;
  tamanoOriginal: number;
}

const ignorada = (ruta: string) => {
  const partes = ruta.split(/[\\/]/);
  const base = partes[partes.length - 1];
  return ruta.endsWith("/") || base === "" || partes.includes("__MACOSX") || base.startsWith("._");
};

export type FotoDelComprimido = Uint8Array | "noViene" | "noValida";

export interface Comprimido {
  txt: Uint8Array;
  foto(nombre: string): FotoDelComprimido;
  fotosNoUsadas(mencionadas: Set<string>): number;
}

function descomprimir(datos: Uint8Array, entrada: Entrada): Uint8Array | null {
  let indice = 0;
  try {
    const archivos = unzipSync(datos, { filter: () => indice++ === entrada.indice });
    const contenido = archivos[entrada.llave];
    return contenido && contenido.length === entrada.tamanoOriginal ? contenido : null;
  } catch {
    return null;
  }
}

/** Lee el comprimido de una carga (FR-002, research 1 a 3). Lanza los rechazos de toda la carga. */
export function leerComprimido(datos: Uint8Array): Comprimido {
  const infos: UnzipFileInfo[] = [];
  try {
    unzipSync(datos, {
      filter: (info) => {
        infos.push(info);
        return false;
      },
    });
  } catch {
    throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.noEsZip);
  }
  if (infos.length >= LIMITE_ENTRADAS) throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.demasiadasEntradas);

  const banderas = banderasUtf8(datos);
  const usarBanderas = banderas?.length === infos.length;
  const entradas: Entrada[] = infos
    .map((info, indice) => {
      const ruta = decodificarNombre(info.name, usarBanderas ? banderas![indice] : undefined);
      return {
        indice,
        llave: info.name,
        ruta,
        base: normalizarNombreFoto(ruta),
        tamano: info.size,
        tamanoOriginal: info.originalSize,
      };
    })
    .filter((e) => !ignorada(e.ruta));

  const txts = entradas.filter((e) => e.base.endsWith(".txt"));
  if (txts.length === 0) throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.sinTxt);
  if (txts.length > 1) throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.variosTxt);
  if (txts[0].tamanoOriginal > LIMITE_TXT) throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.txtGrande);

  const txt = descomprimir(datos, txts[0]);
  if (!txt) throw new ErrorNegocio("DATOS_INVALIDOS", RECHAZO.noEsZip);

  const fotos = new Map<string, Entrada>();
  for (const entrada of entradas) {
    if (entrada !== txts[0] && !fotos.has(entrada.base)) fotos.set(entrada.base, entrada);
  }
  const otras = entradas.filter((e) => e !== txts[0]);

  return {
    txt,
    foto(nombre) {
      const entrada = fotos.get(normalizarNombreFoto(nombre));
      if (!entrada) return "noViene";
      if (entrada.tamanoOriginal === 0 || entrada.tamanoOriginal > TAMANO_MAXIMO_FOTO) return "noValida";
      return descomprimir(datos, entrada) ?? "noValida";
    },
    fotosNoUsadas(mencionadas) {
      return otras.filter((e) => !mencionadas.has(e.base)).length;
    },
  };
}

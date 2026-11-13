import { DIAS_CONSERVADOS } from "./respaldo";

/**
 * Texto del aviso de privacidad (spec 003, FR-004; research 1). Es el único lugar donde se redacta:
 * para corregirlo, se cambia aquí, se actualiza `actualizado` y se vuelve a publicar la app.
 * El propietario debe aprobar la redacción antes de publicarla, idealmente con revisión de un abogado.
 */

export interface SeccionAviso {
  id: "responsable" | "datos" | "finalidades" | "terceros" | "conservacion" | "derechos" | "dudas" | "cambios";
  titulo: string;
  parrafos: string[];
}

const RESPONSABLE = "Emmanuel Cristóbal Trejo";
const DOMICILIO = "Andador Poleo No. 20, Col. La Magdalena Chichicaspa, Huixquilucan, Estado de México";
const CORREO = "emmanuelcristobal@yahoo.com.mx";

export const AVISO_PRIVACIDAD = {
  responsable: RESPONSABLE,
  domicilio: DOMICILIO,
  correo: CORREO,
  /** Fecha de la última actualización, en `AAAA-MM-DD` de la Ciudad de México. */
  actualizado: "2026-11-12",
  secciones: [
    {
      id: "responsable",
      titulo: "Responsable",
      parrafos: [
        `${RESPONSABLE}, con domicilio en ${DOMICILIO}, es el responsable de tus datos personales en Productos Eli's.`,
      ],
    },
    {
      id: "datos",
      titulo: "Datos que recabamos",
      parrafos: [
        "Cuando haces un apartado o un encargo, o cuando compras y decides darnos tus datos, el vendedor registra tu nombre y tu teléfono.",
        "Junto con ellos guardamos las ventas, apartados y encargos que haces, y los pagos que registras en cada uno.",
        "No recabamos datos sensibles.",
        // Spec 006, contracts/interfaz.md, sección 3.
        "Cuando visitas esta página, medimos de forma anónima qué páginas ves, la ciudad o el país aproximados desde donde entras, el tipo de dispositivo, el tamaño de la pantalla, el navegador y su idioma, el sitio desde el que llegaste y cuántas veces se toca el teléfono de contacto. No usamos cookies, no guardamos tu dirección IP y estos datos no sirven para identificarte.",
      ],
    },
    {
      id: "finalidades",
      titulo: "Para qué los usamos",
      parrafos: [
        "Usamos tus datos para registrar y dar seguimiento a tus ventas, apartados y encargos, para contactarte sobre ellos y para que puedas consultar tus apartados y encargos en la sección «Mis apartados».",
        "Usamos los datos de visitas solo para saber qué productos interesan más y mejorar la página.",
      ],
    },
    {
      id: "terceros",
      titulo: "Con quién los compartimos",
      parrafos: [
        "No usamos tus datos para publicidad ni los compartimos con terceros para que los usen con sus propios fines.",
        "Se guardan con proveedores de tecnología que solo los almacenan por cuenta nuestra: el servidor donde funciona esta página y el servicio donde guardamos las copias de respaldo.",
        "Los datos de visitas se guardan en el mismo servidor donde funciona esta página y no los compartimos con nadie.",
      ],
    },
    {
      id: "conservacion",
      titulo: "Cuánto tiempo los guardamos",
      parrafos: [
        "Guardamos tus datos mientras sirvan para dar seguimiento a tus operaciones y para el historial del negocio, hasta que nos pidas borrarlos. No se borran de forma automática.",
        `Si pides que los borremos, quitamos tu nombre y tu teléfono de todas tus operaciones. Las copias de respaldo se conservan ${DIAS_CONSERVADOS} días; pasado ese plazo, ya no contienen los datos borrados.`,
      ],
    },
    {
      id: "derechos",
      titulo: "Tus derechos y cómo ejercerlos",
      parrafos: [
        "Tienes derecho de acceso a tus datos, de rectificación si están mal, de cancelación para que los borremos y de oposición a que los usemos. También puedes revocar tu consentimiento.",
        "Para hacerlo, envía un correo con tu solicitud y una copia de una identificación oficial, para confirmar que los datos son tuyos.",
      ],
    },
    {
      id: "dudas",
      titulo: "Dudas",
      parrafos: ["Si tienes dudas sobre este aviso, también puedes llamarnos al teléfono del negocio."],
    },
    {
      id: "cambios",
      titulo: "Cambios a este aviso",
      parrafos: [
        "Cualquier cambio a este aviso lo publicaremos en esta misma página, con su nueva fecha de actualización.",
      ],
    },
  ] satisfies SeccionAviso[],
};

import { COLORES, ETIQUETAS_PROMOCION, type ClaveColor } from "@/dominio/promocion";

/**
 * Franja del sello promocional (spec 005, contracts/interfaz.md). Sirve igual en el servidor (layout
 * de cliente) y en el cliente (vista previa del panel), para que se vean idénticas. Es texto normal:
 * sin enlace, sin botón y sin forma de cerrarla. React escapa el texto (FR-012).
 *
 * En la sección de cliente va entre `<header>` y `<main>`, así que es un `<aside>` con nombre, para
 * que quede dentro de un landmark (regla `region` de axe). En la vista previa ya está dentro de
 * `<main>`, donde un `<aside>` no puede ir, y se dibuja como `<div>`.
 */
export function SelloPromocional({
  texto,
  color,
  vacio = false,
  vistaPrevia = false,
}: {
  texto: string;
  color: ClaveColor;
  /** Solo en la vista previa: muestra el texto de ejemplo cuando aún no hay texto. */
  vacio?: boolean;
  vistaPrevia?: boolean;
}) {
  const colores = COLORES.find((c) => c.clave === color) ?? COLORES[0];
  const props = {
    "data-sello-promocional": true,
    "data-color": colores.clave,
    style: { background: colores.fondo, color: vacio ? colores.textoEjemplo : colores.texto },
    className: "w-full",
  };
  const contenido = (
    <p className="mx-auto max-w-6xl px-4 py-2 text-center text-sm font-medium break-words">
      {vacio ? ETIQUETAS_PROMOCION.textoEjemplo : texto}
    </p>
  );

  return vistaPrevia ? (
    <div {...props}>{contenido}</div>
  ) : (
    <aside aria-label={ETIQUETAS_PROMOCION.titulo} {...props}>
      {contenido}
    </aside>
  );
}

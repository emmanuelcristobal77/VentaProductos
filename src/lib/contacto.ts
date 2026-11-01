import { entorno } from "./entorno";

export function telefonoNegocio() {
  const telefono = entorno().TELEFONO_NEGOCIO;
  return {
    enlace: `tel:+52${telefono}`,
    texto: `${telefono.slice(0, 2)} ${telefono.slice(2, 6)} ${telefono.slice(6)}`,
  };
}

export type TipoOperacion = "venta" | "apartado" | "encargo";
export type EstadoVenta = "pagada" | "entregada" | "anulada";
export type EstadoPedido = "pendiente" | "pagado" | "entregado" | "cancelado";
export type EstadoOperacion = EstadoVenta | EstadoPedido;

const TRANSICIONES_VENTA: Record<string, string[]> = {
  pagada: ["entregada", "anulada"],
  entregada: ["anulada"],
};

const TRANSICIONES_PEDIDO: Record<string, string[]> = {
  pendiente: ["pagado", "cancelado"],
  pagado: ["pendiente", "entregado", "cancelado"],
};

export function puedeTransicionar(tipo: TipoOperacion, de: string, a: string): boolean {
  const transiciones = tipo === "venta" ? TRANSICIONES_VENTA : TRANSICIONES_PEDIDO;
  return transiciones[de]?.includes(a) ?? false;
}

export function calcularEstado(totalCentavos: number, pagadoCentavos: number): "pendiente" | "pagado" {
  return pagadoCentavos >= totalCentavos ? "pagado" : "pendiente";
}

export const ESTADOS_APARTADO_VIGENTE = ["pendiente", "pagado"] as const;

export const ETIQUETA_ESTADO: Record<EstadoOperacion, string> = {
  pagada: "Pagada",
  entregada: "Entregada",
  anulada: "Anulada",
  pendiente: "Pendiente",
  pagado: "Pagado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ETIQUETA_TIPO: Record<TipoOperacion, string> = {
  venta: "Venta",
  apartado: "Apartado",
  encargo: "Encargo",
};

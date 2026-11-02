import { sql } from "drizzle-orm";

/*
 * Suma de los pagos vigentes de la operación de la fila actual.
 * Va escrita a mano y calificada por la misma razón que `unidadesApartadas`.
 */
export const pagadoCentavos = sql<number>`(
  SELECT coalesce(sum(p.importe_centavos), 0)
  FROM pagos p
  WHERE p.operacion_id = "operaciones"."id"
    AND p.anulado_en IS NULL
)`;

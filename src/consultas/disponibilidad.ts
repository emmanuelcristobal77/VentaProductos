import { sql } from "drizzle-orm";

/*
 * Unidades reservadas por apartados vigentes del producto de la fila actual (FR-011).
 * Las columnas van escritas a mano y calificadas: Drizzle omite el nombre de la tabla
 * en consultas de una sola tabla, y la subconsulta compararía contra su propio id.
 */
export const unidadesApartadas = sql<number>`(
  SELECT coalesce(sum(o.cantidad), 0)
  FROM operaciones o
  WHERE o.producto_id = "productos"."id"
    AND o.tipo = 'apartado'
    AND o.estado IN ('pendiente', 'pagado')
)`;

export const unidadesDisponibles = sql<number>`"productos"."existencia" - ${unidadesApartadas}`;

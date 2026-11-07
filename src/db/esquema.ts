import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const ahora = (nombre: string) => text(nombre).notNull().$defaultFn(() => new Date().toISOString());
const activo = () => integer("activo", { mode: "boolean" }).notNull().default(true);

export const categorias = sqliteTable(
  "categorias",
  {
    id: id(),
    nombre: text("nombre").notNull(),
    nombreNorm: text("nombre_norm").notNull(),
    activo: activo(),
  },
  (t) => [
    uniqueIndex("categorias_nombre_activo").on(t.nombreNorm).where(sql`activo = 1`),
    check("categorias_no_todos", sql`nombre_norm <> 'todos'`),
  ],
);

export const subcategorias = sqliteTable(
  "subcategorias",
  {
    id: id(),
    categoriaId: text("categoria_id").notNull().references(() => categorias.id),
    nombre: text("nombre").notNull(),
    nombreNorm: text("nombre_norm").notNull(),
    activo: activo(),
  },
  (t) => [
    uniqueIndex("subcategorias_nombre_activo").on(t.categoriaId, t.nombreNorm).where(sql`activo = 1`),
    check("subcategorias_no_todos", sql`nombre_norm <> 'todos'`),
  ],
);

export const productos = sqliteTable(
  "productos",
  {
    id: id(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion").notNull(),
    categoriaId: text("categoria_id").notNull().references(() => categorias.id),
    subcategoriaId: text("subcategoria_id").references(() => subcategorias.id),
    existencia: integer("existencia").notNull(),
    precioCompraCentavos: integer("precio_compra_centavos").notNull(),
    precioVentaCentavos: integer("precio_venta_centavos").notNull(),
    activo: activo(),
    creadoEn: ahora("creado_en"),
    actualizadoEn: ahora("actualizado_en"),
  },
  (t) => [
    check("productos_existencia", sql`existencia >= 0`),
    check("productos_precio_compra", sql`precio_compra_centavos > 0`),
    check("productos_precio_venta", sql`precio_venta_centavos > 0`),
    index("productos_categoria").on(t.categoriaId, t.subcategoriaId),
  ],
);

export const articulosEncargo = sqliteTable(
  "articulos_encargo",
  {
    id: id(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion").notNull(),
    precioCentavos: integer("precio_centavos").notNull(),
    activo: activo(),
    creadoEn: ahora("creado_en"),
    actualizadoEn: ahora("actualizado_en"),
  },
  () => [check("articulos_precio", sql`precio_centavos > 0`)],
);

export const fotos = sqliteTable(
  "fotos",
  {
    id: id(),
    productoId: text("producto_id").references(() => productos.id),
    articuloEncargoId: text("articulo_encargo_id").references(() => articulosEncargo.id),
    archivo: text("archivo").notNull(),
    orden: integer("orden").notNull(),
    activo: activo(),
  },
  (t) => [
    check("fotos_propietario", sql`(producto_id IS NULL) <> (articulo_encargo_id IS NULL)`),
    index("fotos_producto").on(t.productoId),
    index("fotos_articulo").on(t.articuloEncargoId),
  ],
);

export const operaciones = sqliteTable(
  "operaciones",
  {
    id: id(),
    tipo: text("tipo", { enum: ["venta", "apartado", "encargo"] }).notNull(),
    estado: text("estado", {
      enum: ["pagada", "entregada", "anulada", "pendiente", "pagado", "entregado", "cancelado"],
    }).notNull(),
    productoId: text("producto_id").references(() => productos.id),
    articuloEncargoId: text("articulo_encargo_id").references(() => articulosEncargo.id),
    cantidad: integer("cantidad").notNull(),
    precioUnitarioCentavos: integer("precio_unitario_centavos").notNull(),
    clienteNombre: text("cliente_nombre"),
    clienteNombreNorm: text("cliente_nombre_norm"),
    clienteTelefono: text("cliente_telefono"),
    motivo: text("motivo"),
    creadoEn: ahora("creado_en"),
    entregadoEn: text("entregado_en"),
    cerradoEn: text("cerrado_en"),
    // Spec 003: 1 si se informó del aviso, 0 en una venta sin datos, nulo antes de la spec 003.
    avisoInformado: integer("aviso_informado", { mode: "boolean" }),
    datosBorradosEn: text("datos_borrados_en"),
  },
  (t) => [
    check("operaciones_tipo", sql`tipo IN ('venta', 'apartado', 'encargo')`),
    check(
      "operaciones_estado",
      sql`(tipo = 'venta' AND estado IN ('pagada', 'entregada', 'anulada'))
        OR (tipo <> 'venta' AND estado IN ('pendiente', 'pagado', 'entregado', 'cancelado'))`,
    ),
    check("operaciones_articulo", sql`(producto_id IS NULL) <> (articulo_encargo_id IS NULL)`),
    check("operaciones_articulo_solo_encargo", sql`articulo_encargo_id IS NULL OR tipo = 'encargo'`),
    check("operaciones_cantidad", sql`cantidad > 0`),
    check("operaciones_precio", sql`precio_unitario_centavos > 0`),
    check(
      "operaciones_telefono",
      sql`cliente_telefono IS NULL
        OR (length(cliente_telefono) = 10 AND cliente_telefono NOT GLOB '*[^0-9]*')`,
    ),
    check(
      "operaciones_cliente",
      sql`tipo = 'venta' OR datos_borrados_en IS NOT NULL
        OR (cliente_nombre IS NOT NULL AND cliente_telefono IS NOT NULL)`,
    ),
    check(
      "operaciones_datos_borrados",
      sql`datos_borrados_en IS NULL
        OR (cliente_nombre IS NULL AND cliente_nombre_norm IS NULL AND cliente_telefono IS NULL)`,
    ),
    check(
      "operaciones_aviso",
      sql`aviso_informado IS NOT 0 OR (cliente_nombre IS NULL AND cliente_telefono IS NULL)`,
    ),
    check("operaciones_motivo", sql`estado NOT IN ('anulada', 'cancelado') OR motivo IS NOT NULL`),
    index("operaciones_telefono_idx").on(t.clienteTelefono),
    index("operaciones_nombre_idx").on(t.clienteNombreNorm),
    index("operaciones_tipo_estado_idx").on(t.tipo, t.estado),
    index("operaciones_producto_idx").on(t.productoId),
  ],
);

export const pagos = sqliteTable(
  "pagos",
  {
    id: id(),
    operacionId: text("operacion_id").notNull().references(() => operaciones.id),
    importeCentavos: integer("importe_centavos").notNull(),
    fecha: ahora("fecha"),
    anuladoEn: text("anulado_en"),
  },
  (t) => [
    check("pagos_importe", sql`importe_centavos > 0`),
    index("pagos_fecha_idx").on(t.fecha),
    index("pagos_operacion_idx").on(t.operacionId),
  ],
);

export const limiteIntentos = sqliteTable("limite_intentos", {
  clave: text("clave").primaryKey(),
  intentos: integer("intentos").notNull(),
  ventanaInicia: text("ventana_inicia").notNull(),
});

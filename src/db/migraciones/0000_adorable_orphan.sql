CREATE TABLE `articulos_encargo` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text NOT NULL,
	`precio_centavos` integer NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL,
	`actualizado_en` text NOT NULL,
	CONSTRAINT "articulos_precio" CHECK(precio_centavos > 0)
);
--> statement-breakpoint
CREATE TABLE `categorias` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`nombre_norm` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	CONSTRAINT "categorias_no_todos" CHECK(nombre_norm <> 'todos')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nombre_activo` ON `categorias` (`nombre_norm`) WHERE activo = 1;--> statement-breakpoint
CREATE TABLE `fotos` (
	`id` text PRIMARY KEY NOT NULL,
	`producto_id` text,
	`articulo_encargo_id` text,
	`archivo` text NOT NULL,
	`orden` integer NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`articulo_encargo_id`) REFERENCES `articulos_encargo`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "fotos_propietario" CHECK((producto_id IS NULL) <> (articulo_encargo_id IS NULL))
);
--> statement-breakpoint
CREATE INDEX `fotos_producto` ON `fotos` (`producto_id`);--> statement-breakpoint
CREATE INDEX `fotos_articulo` ON `fotos` (`articulo_encargo_id`);--> statement-breakpoint
CREATE TABLE `limite_intentos` (
	`clave` text PRIMARY KEY NOT NULL,
	`intentos` integer NOT NULL,
	`ventana_inicia` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operaciones` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`estado` text NOT NULL,
	`producto_id` text,
	`articulo_encargo_id` text,
	`cantidad` integer NOT NULL,
	`precio_unitario_centavos` integer NOT NULL,
	`cliente_nombre` text,
	`cliente_nombre_norm` text,
	`cliente_telefono` text,
	`motivo` text,
	`creado_en` text NOT NULL,
	`entregado_en` text,
	`cerrado_en` text,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`articulo_encargo_id`) REFERENCES `articulos_encargo`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "operaciones_tipo" CHECK(tipo IN ('venta', 'apartado', 'encargo')),
	CONSTRAINT "operaciones_estado" CHECK((tipo = 'venta' AND estado IN ('pagada', 'entregada', 'anulada'))
        OR (tipo <> 'venta' AND estado IN ('pendiente', 'pagado', 'entregado', 'cancelado'))),
	CONSTRAINT "operaciones_articulo" CHECK((producto_id IS NULL) <> (articulo_encargo_id IS NULL)),
	CONSTRAINT "operaciones_articulo_solo_encargo" CHECK(articulo_encargo_id IS NULL OR tipo = 'encargo'),
	CONSTRAINT "operaciones_cantidad" CHECK(cantidad > 0),
	CONSTRAINT "operaciones_precio" CHECK(precio_unitario_centavos > 0),
	CONSTRAINT "operaciones_telefono" CHECK(cliente_telefono IS NULL
        OR (length(cliente_telefono) = 10 AND cliente_telefono NOT GLOB '*[^0-9]*')),
	CONSTRAINT "operaciones_cliente" CHECK(tipo = 'venta' OR (cliente_nombre IS NOT NULL AND cliente_telefono IS NOT NULL)),
	CONSTRAINT "operaciones_motivo" CHECK(estado NOT IN ('anulada', 'cancelado') OR motivo IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `operaciones_telefono_idx` ON `operaciones` (`cliente_telefono`);--> statement-breakpoint
CREATE INDEX `operaciones_nombre_idx` ON `operaciones` (`cliente_nombre_norm`);--> statement-breakpoint
CREATE INDEX `operaciones_tipo_estado_idx` ON `operaciones` (`tipo`,`estado`);--> statement-breakpoint
CREATE INDEX `operaciones_producto_idx` ON `operaciones` (`producto_id`);--> statement-breakpoint
CREATE TABLE `pagos` (
	`id` text PRIMARY KEY NOT NULL,
	`operacion_id` text NOT NULL,
	`importe_centavos` integer NOT NULL,
	`fecha` text NOT NULL,
	`anulado_en` text,
	FOREIGN KEY (`operacion_id`) REFERENCES `operaciones`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pagos_importe" CHECK(importe_centavos > 0)
);
--> statement-breakpoint
CREATE INDEX `pagos_fecha_idx` ON `pagos` (`fecha`);--> statement-breakpoint
CREATE INDEX `pagos_operacion_idx` ON `pagos` (`operacion_id`);--> statement-breakpoint
CREATE TABLE `productos` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text NOT NULL,
	`categoria_id` text NOT NULL,
	`subcategoria_id` text,
	`existencia` integer NOT NULL,
	`precio_compra_centavos` integer NOT NULL,
	`precio_venta_centavos` integer NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL,
	`actualizado_en` text NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subcategoria_id`) REFERENCES `subcategorias`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "productos_existencia" CHECK(existencia >= 0),
	CONSTRAINT "productos_precio_compra" CHECK(precio_compra_centavos > 0),
	CONSTRAINT "productos_precio_venta" CHECK(precio_venta_centavos > 0)
);
--> statement-breakpoint
CREATE INDEX `productos_categoria` ON `productos` (`categoria_id`,`subcategoria_id`);--> statement-breakpoint
CREATE TABLE `subcategorias` (
	`id` text PRIMARY KEY NOT NULL,
	`categoria_id` text NOT NULL,
	`nombre` text NOT NULL,
	`nombre_norm` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "subcategorias_no_todos" CHECK(nombre_norm <> 'todos')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subcategorias_nombre_activo` ON `subcategorias` (`categoria_id`,`nombre_norm`) WHERE activo = 1;
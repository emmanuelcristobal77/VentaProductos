-- Spec 003, research 4: reconstruye operaciones para cambiar sus CHECK. aplicarMigraciones apaga las
-- llaves foráneas antes de abrir la transacción y revisa foreign_key_check al terminar. Las columnas
-- nuevas no se copian porque la tabla anterior no las tiene: quedan en NULL.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_operaciones` (
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
	`aviso_informado` integer,
	`datos_borrados_en` text,
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
	CONSTRAINT "operaciones_cliente" CHECK(tipo = 'venta' OR datos_borrados_en IS NOT NULL
        OR (cliente_nombre IS NOT NULL AND cliente_telefono IS NOT NULL)),
	CONSTRAINT "operaciones_datos_borrados" CHECK(datos_borrados_en IS NULL
        OR (cliente_nombre IS NULL AND cliente_nombre_norm IS NULL AND cliente_telefono IS NULL)),
	CONSTRAINT "operaciones_aviso" CHECK(aviso_informado IS NOT 0 OR (cliente_nombre IS NULL AND cliente_telefono IS NULL)),
	CONSTRAINT "operaciones_motivo" CHECK(estado NOT IN ('anulada', 'cancelado') OR motivo IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_operaciones`("id", "tipo", "estado", "producto_id", "articulo_encargo_id", "cantidad", "precio_unitario_centavos", "cliente_nombre", "cliente_nombre_norm", "cliente_telefono", "motivo", "creado_en", "entregado_en", "cerrado_en") SELECT "id", "tipo", "estado", "producto_id", "articulo_encargo_id", "cantidad", "precio_unitario_centavos", "cliente_nombre", "cliente_nombre_norm", "cliente_telefono", "motivo", "creado_en", "entregado_en", "cerrado_en" FROM `operaciones`;--> statement-breakpoint
DROP TABLE `operaciones`;--> statement-breakpoint
ALTER TABLE `__new_operaciones` RENAME TO `operaciones`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `operaciones_telefono_idx` ON `operaciones` (`cliente_telefono`);--> statement-breakpoint
CREATE INDEX `operaciones_nombre_idx` ON `operaciones` (`cliente_nombre_norm`);--> statement-breakpoint
CREATE INDEX `operaciones_tipo_estado_idx` ON `operaciones` (`tipo`,`estado`);--> statement-breakpoint
CREATE INDEX `operaciones_producto_idx` ON `operaciones` (`producto_id`);
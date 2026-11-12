CREATE TABLE `sello_promocional` (
	`id` integer PRIMARY KEY NOT NULL,
	`texto` text NOT NULL,
	`color` text NOT NULL,
	`activo` integer NOT NULL,
	`actualizado_en` text NOT NULL,
	CONSTRAINT "sello_una_fila" CHECK(id = 1),
	CONSTRAINT "sello_color" CHECK(color IN ('rojo', 'verde', 'dorado', 'azul')),
	CONSTRAINT "sello_activo_con_texto" CHECK(activo = 0 OR length(trim(texto)) > 0),
	CONSTRAINT "sello_bytes" CHECK(length(CAST(texto AS BLOB)) <= 400)
);

ALTER TABLE `fotos` ADD `nombre_original` text;--> statement-breakpoint
CREATE UNIQUE INDEX `fotos_nombre_original` ON `fotos` (`producto_id`,`nombre_original`) WHERE nombre_original IS NOT NULL;
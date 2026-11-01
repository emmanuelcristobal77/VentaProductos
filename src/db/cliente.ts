import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { directorioDatos } from "@/lib/entorno";
import * as esquema from "./esquema";

export type Bd = BetterSQLite3Database<typeof esquema> & { $client: Database.Database };
/** La base o una transacción abierta: las funciones internas aceptan cualquiera de las dos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Conexion = BaseSQLiteDatabase<"sync", any, typeof esquema>;

const global_ = globalThis as unknown as { bdVendeProductos?: Bd };

export function abrirBase(ruta: string): Bd {
  mkdirSync(path.dirname(ruta), { recursive: true });
  const sqlite = new Database(ruta);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema: esquema });
}

export function rutaBase(): string {
  return path.join(directorioDatos(), "vende-productos.sqlite");
}

export function obtenerBd(): Bd {
  global_.bdVendeProductos ??= abrirBase(rutaBase());
  return global_.bdVendeProductos;
}

export function establecerBd(bd: Bd | undefined) {
  global_.bdVendeProductos = bd;
}

export function aplicarMigraciones(bd: Bd) {
  migrate(bd, { migrationsFolder: path.join(process.cwd(), "src/db/migraciones") });
}

/** Abre una transacción BEGIN IMMEDIATE: las escrituras se atienden una tras otra. */
export function conTransaccion<T>(accion: (tx: Conexion) => T): T {
  return obtenerBd().transaction((tx) => accion(tx), { behavior: "immediate" });
}

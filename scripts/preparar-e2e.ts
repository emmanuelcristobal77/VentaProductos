import { rmSync } from "node:fs";
import { aplicarMigraciones, obtenerBd } from "../src/db/cliente";
import { sembrar } from "../src/db/semilla";

const directorio = process.env.DATOS_DIR ?? "";
if (!directorio.endsWith("e2e")) throw new Error("preparar-e2e solo limpia la carpeta de pruebas");

rmSync(directorio, { recursive: true, force: true });
const bd = obtenerBd();
aplicarMigraciones(bd);
sembrar(bd);

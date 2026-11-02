import path from "node:path";
import { pathToFileURL } from "node:url";
import { aplicarMigraciones, establecerBd, obtenerBd } from "../src/db/cliente";
import { sembrar } from "../src/db/semilla";

const bd = obtenerBd();
aplicarMigraciones(bd);
sembrar(bd);
console.log("Base lista.");

// El servidor corre en este mismo proceso y abre su propia conexión.
bd.$client.close();
establecerBd(undefined);
void import(pathToFileURL(path.join(process.cwd(), "server.js")).href);

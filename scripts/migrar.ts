import { aplicarMigraciones, obtenerBd } from "../src/db/cliente";

aplicarMigraciones(obtenerBd());
console.log("Migraciones aplicadas.");

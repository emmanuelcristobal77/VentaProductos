import { obtenerBd } from "../src/db/cliente";
import { sembrar } from "../src/db/semilla";

sembrar(obtenerBd());
console.log("Categorías iniciales listas.");

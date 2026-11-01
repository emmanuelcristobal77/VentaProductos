import { crearHash } from "../src/lib/contrasena";

const contrasena = process.argv[2];
if (!contrasena) {
  console.error('Uso: npx tsx scripts/generar-hash.ts "su-contraseña"');
  process.exit(1);
}
console.log(crearHash(contrasena));

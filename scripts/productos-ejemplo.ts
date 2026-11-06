/*
 * Llena una base de PRUEBA con productos de ejemplo para medir la velocidad (spec 002, SC-002 y SC-003).
 * Nunca se ejecuta contra la carpeta de datos de producción: exige un DATOS_DIR que contenga "prueba".
 *
 *   DATOS_DIR=./datos/prueba-500 npx tsx scripts/productos-ejemplo.ts --cantidad 500
 */
import sharp from "sharp";
import { aplicarMigraciones, obtenerBd } from "../src/db/cliente";
import { categorias, fotos, productos, subcategorias } from "../src/db/esquema";
import { sembrar } from "../src/db/semilla";
import { guardarFoto } from "../src/lib/fotos";

const directorio = process.env.DATOS_DIR ?? "";
if (!directorio || !directorio.includes("prueba")) {
  throw new Error('productos-ejemplo solo corre con un DATOS_DIR de prueba, por ejemplo "./datos/prueba-500".');
}

const posicion = process.argv.indexOf("--cantidad");
const cantidad = posicion >= 0 ? Number(process.argv[posicion + 1]) : 500;
if (!Number.isInteger(cantidad) || cantidad < 1) throw new Error("--cantidad debe ser un entero mayor a cero.");

const ARTICULOS = [
  "Muñeca", "Pelota", "Carrito", "Rompecabezas", "Peluche", "Camión", "Tren", "Yoyo", "Trompo",
  "Playera", "Pantalón", "Vestido", "Suéter", "Chamarra", "Calcetines", "Pijama", "Gorra",
  "Mochila", "Lonchera", "Termo", "Cuaderno", "Lámpara", "Almohada", "Toalla", "Piñata",
];
const DETALLES = [
  "de trapo", "de madera", "roja", "azul", "con luces", "de peluche", "de algodón", "de mezclilla",
  "estampada", "para bebé", "musical", "de tela", "acolchada", "con diseño de ñandú", "clásica",
];
const DESCRIPCIONES = [
  "Lavable a mano y fácil de guardar.",
  "Ideal para regalo de cumpleaños.",
  "Hecha a mano por artesanos de Oaxaca.",
  "Material resistente, perfecta para el día a día.",
  "Colores vivos que no se despintan.",
  "Incluye caja de regalo.",
  "Tamaño mediano, cabe en la mochila.",
  "Suave al tacto y muy cómoda.",
];

const elegir = <T>(lista: T[], i: number) => lista[i % lista.length];

async function fotoDeEjemplo(i: number) {
  const contenido = await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: { r: (i * 37) % 256, g: (i * 71) % 256, b: (i * 113) % 256 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  return guardarFoto(contenido);
}

async function main() {
  const bd = obtenerBd();
  aplicarMigraciones(bd);
  sembrar(bd);

  const cats = bd.select().from(categorias).all();
  const subs = bd.select().from(subcategorias).all();
  const base = Date.now();

  for (let i = 0; i < cantidad; i++) {
    const categoria = elegir(cats, i);
    const opciones = subs.filter((s) => s.categoriaId === categoria.id);
    const subcategoria = opciones.length > 0 ? elegir(opciones, Math.floor(i / cats.length)) : null;
    const archivo = await fotoDeEjemplo(i);
    const fecha = new Date(base - i * 60_000).toISOString();

    bd.transaction((tx) => {
      const { id } = tx
        .insert(productos)
        .values({
          nombre: `${elegir(ARTICULOS, i)} ${elegir(DETALLES, Math.floor(i / ARTICULOS.length))} ${i + 1}`,
          descripcion: elegir(DESCRIPCIONES, i * 3),
          categoriaId: categoria.id,
          subcategoriaId: subcategoria?.id ?? null,
          existencia: i % 9,
          precioCompraCentavos: 5_000 + (i % 40) * 1_000,
          precioVentaCentavos: 9_900 + (i % 40) * 1_500,
          creadoEn: fecha,
          actualizadoEn: fecha,
        })
        .returning({ id: productos.id })
        .get();
      tx.insert(fotos).values({ productoId: id, archivo, orden: 0 }).run();
    });
  }

  console.log(`Listo: ${cantidad} productos de ejemplo en ${directorio}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

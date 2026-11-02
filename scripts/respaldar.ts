import { createClient } from "@supabase/supabase-js";
import { obtenerBd } from "../src/db/cliente";
import { entorno } from "../src/lib/entorno";
import { respaldar, type AlmacenRespaldo } from "../src/lib/respaldo";

const BUCKET = "respaldos";
const TAMANO_PAGINA = 1000;

function clienteSupabase(url: string, llave: string) {
  return createClient(url, llave, { auth: { persistSession: false } });
}

function almacenSupabase(url: string, llave: string): AlmacenRespaldo {
  const bucket = clienteSupabase(url, llave).storage.from(BUCKET);

  return {
    async listar(prefijo) {
      const carpeta = prefijo.replace(/\/$/, "");
      const rutas: string[] = [];
      for (let desplazamiento = 0; ; desplazamiento += TAMANO_PAGINA) {
        const { data, error } = await bucket.list(carpeta, {
          limit: TAMANO_PAGINA,
          offset: desplazamiento,
        });
        if (error) throw error;
        rutas.push(...data.map((objeto) => `${carpeta}/${objeto.name}`));
        if (data.length < TAMANO_PAGINA) return rutas;
      }
    },
    async subir(ruta, contenido) {
      const { error } = await bucket.upload(ruta, contenido, { upsert: true });
      if (error) throw error;
    },
    async borrar(rutas) {
      const { error } = await bucket.remove(rutas);
      if (error) throw error;
    },
  };
}

const { RESPALDO_SUPABASE_URL, RESPALDO_SUPABASE_LLAVE } = entorno();

async function principal() {
  if (!RESPALDO_SUPABASE_URL || !RESPALDO_SUPABASE_LLAVE) {
    throw new Error("Faltan RESPALDO_SUPABASE_URL o RESPALDO_SUPABASE_LLAVE.");
  }
  await respaldar(obtenerBd(), almacenSupabase(RESPALDO_SUPABASE_URL, RESPALDO_SUPABASE_LLAVE));

  // Supabase pausa los proyectos Free sin actividad en la base de datos; subir a Storage no basta.
  const { error } = await clienteSupabase(RESPALDO_SUPABASE_URL, RESPALDO_SUPABASE_LLAVE)
    .from("latido")
    .upsert({ id: 1, ultimo_respaldo: new Date().toISOString() });
  if (error) throw error;
  console.log("Respaldo completado.");
}

// Sale con error para que el fallo se vea en los registros de Easypanel.
principal().catch((error) => {
  console.error("Respaldo fallido:", error);
  process.exitCode = 1;
});

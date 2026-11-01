import { z } from "zod";

const esquema = z.object({
  DATOS_DIR: z.string().min(1).default("./datos"),
  ADMIN_USUARIO: z.string().min(1),
  ADMIN_HASH_CONTRASENA: z.string().startsWith("scrypt:"),
  SESION_SECRETO: z.string().min(32),
  IP_SAL: z.string().min(1),
  TELEFONO_NEGOCIO: z.string().regex(/^\d{10}$/),
  RESPALDO_SUPABASE_URL: z.string().optional(),
  RESPALDO_SUPABASE_LLAVE: z.string().optional(),
});

export type Entorno = z.infer<typeof esquema>;

export function entorno(): Entorno {
  const resultado = esquema.safeParse(process.env);
  if (!resultado.success) {
    const faltantes = resultado.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Variables de entorno inválidas: ${faltantes}`);
  }
  return resultado.data;
}

export function directorioDatos(): string {
  return process.env.DATOS_DIR || "./datos";
}

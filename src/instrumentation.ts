export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { entorno } = await import("@/lib/entorno");
    entorno();
  }
}

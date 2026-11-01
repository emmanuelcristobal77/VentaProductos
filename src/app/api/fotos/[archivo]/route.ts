import { leerFoto } from "@/lib/fotos";

export async function GET(_solicitud: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const foto = await leerFoto((await params).archivo);
  if (!foto) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(foto.contenido), {
    headers: {
      "Content-Type": foto.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

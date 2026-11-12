import Link from "next/link";
import { Phone } from "lucide-react";
import { NavegacionInferior, NavegacionSuperior } from "@/components/cliente/navegacion";
import { SelloPromocional } from "@/components/sello-promocional";
import { telefonoNegocio } from "@/lib/contacto";
import { obtenerSello } from "@/servicios/promocion";

// Spec 005, research 5: el sello se lee en cada petición para que el cambio se vea al recargar.
export const dynamic = "force-dynamic";

export default function LayoutCliente({ children }: { children: React.ReactNode }) {
  const telefono = telefonoNegocio();
  const sello = obtenerSello();

  return (
    <div className="flex min-h-dvh flex-col pb-20 md:pb-0">
      <header className="bg-background/90 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Productos Eli&apos;s
          </Link>
          <NavegacionSuperior />
        </div>
      </header>
      {sello.activo && <SelloPromocional texto={sello.texto} color={sello.color} />}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">{children}</main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm">
          <p>¿Te interesa algún producto? Contáctanos.</p>
          <a href={telefono.enlace} className="text-foreground inline-flex items-center gap-2 font-medium">
            <Phone aria-hidden className="size-4" />
            {telefono.texto}
          </a>
          <Link
            href="/aviso-de-privacidad"
            className="text-foreground mt-2 inline-flex min-h-11 items-center self-start underline underline-offset-4"
          >
            Aviso de privacidad
          </Link>
        </div>
      </footer>

      <NavegacionInferior />
    </div>
  );
}

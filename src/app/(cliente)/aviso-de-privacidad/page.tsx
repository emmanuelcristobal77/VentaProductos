import { formatearFecha, inicioDeDia } from "@/dominio/fechas";
import { AVISO_PRIVACIDAD } from "@/lib/aviso-privacidad";
import { telefonoNegocio } from "@/lib/contacto";

// El layout lee el teléfono del negocio, que solo existe al ejecutar, no al compilar (research 10).
export const dynamic = "force-dynamic";
export const metadata = { title: "Aviso de privacidad" };

const enlace = "text-foreground font-medium underline underline-offset-4";

export default function PaginaAvisoPrivacidad() {
  const telefono = telefonoNegocio();
  const actualizado = formatearFecha(inicioDeDia(AVISO_PRIVACIDAD.actualizado) ?? AVISO_PRIVACIDAD.actualizado);

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Aviso de privacidad</h1>
        <p className="text-muted-foreground mt-1">Última actualización: {actualizado}</p>
      </header>

      {AVISO_PRIVACIDAD.secciones.map((seccion) => (
        <section key={seccion.id} aria-labelledby={`aviso-${seccion.id}`} className="flex flex-col gap-3">
          <h2 id={`aviso-${seccion.id}`} className="text-xl font-semibold">
            {seccion.titulo}
          </h2>
          {seccion.parrafos.map((parrafo) => (
            <p key={parrafo} className="leading-relaxed break-words">
              {parrafo}
            </p>
          ))}
          {seccion.id === "derechos" && (
            <p className="leading-relaxed break-words">
              Correo:{" "}
              <a href={`mailto:${AVISO_PRIVACIDAD.correo}`} className={enlace}>
                {AVISO_PRIVACIDAD.correo}
              </a>
            </p>
          )}
          {seccion.id === "dudas" && (
            <p className="leading-relaxed">
              Teléfono:{" "}
              <a href={telefono.enlace} className={enlace}>
                {telefono.texto}
              </a>
            </p>
          )}
        </section>
      ))}
    </article>
  );
}

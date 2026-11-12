"use client";

import { useActionState, useState } from "react";
import { guardarPromocion } from "@/acciones/promocion";
import { SelloPromocional } from "@/components/sello-promocional";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COLORES,
  ETIQUETAS_PROMOCION,
  MAXIMO_CARACTERES,
  MENSAJES_PROMOCION,
  contarCaracteres,
  normalizarTexto,
  textoContador,
  type ClaveColor,
  type Sello,
} from "@/dominio/promocion";
import type { Resultado } from "@/lib/resultado";
import { cn } from "@/lib/utils";

/** Formulario de la sección «Promoción» (spec 005, contracts/interfaz.md). */
export function FormularioPromocion({ sello }: { sello: Sello }) {
  const [texto, setTexto] = useState(sello.texto);
  const [color, setColor] = useState<ClaveColor>(sello.color);
  const [activo, setActivo] = useState(sello.activo);

  const [estado, accion, enviando] = useActionState(
    async (anterior: Resultado<Sello> | null, formulario: FormData) => {
      const resultado = await guardarPromocion(anterior, formulario);
      // «Dos vendedores editando a la vez»: el panel muestra siempre lo que quedó guardado.
      if (resultado.ok) {
        setTexto(resultado.datos.texto);
        setColor(resultado.datos.color);
        setActivo(resultado.datos.activo);
      }
      return resultado;
    },
    null,
  );

  const normalizado = normalizarTexto(texto);
  const caracteres = contarCaracteres(normalizado);
  const excedido = caracteres > MAXIMO_CARACTERES;

  const errores = estado && !estado.ok ? (estado.campos ?? {}) : {};
  const mensaje = !estado
    ? ""
    : estado.ok
      ? estado.datos.activo
        ? MENSAJES_PROMOCION.listoActivo
        : MENSAJES_PROMOCION.listoDesactivado
      : estado.campos
        ? ""
        : estado.mensaje;
  const descripcionTexto = ["sello-texto-contador", errores.texto && "sello-texto-error"].filter(Boolean).join(" ");

  return (
    <form action={accion} noValidate className="bg-card flex flex-col gap-6 rounded-xl border p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sello-texto">{ETIQUETAS_PROMOCION.campoTexto}</Label>
        <Input
          id="sello-texto"
          name="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          aria-invalid={Boolean(errores.texto) || excedido}
          aria-describedby={descripcionTexto}
          className="h-11"
        />
        <p
          id="sello-texto-contador"
          aria-live="polite"
          className={cn("text-sm", excedido ? "text-destructive font-medium" : "text-muted-foreground")}
        >
          {textoContador(caracteres)}
        </p>
        {errores.texto && (
          <p id="sello-texto-error" className="text-destructive text-sm">
            {errores.texto}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3" aria-describedby={errores.color ? "sello-color-error" : undefined}>
        <legend className="mb-1 text-sm font-medium">{ETIQUETAS_PROMOCION.campoColor}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COLORES.map((opcion) => (
            <label
              key={opcion.clave}
              className="has-[:checked]:border-primary has-[:checked]:bg-accent flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm"
            >
              <input
                type="radio"
                name="color"
                value={opcion.clave}
                checked={color === opcion.clave}
                onChange={() => setColor(opcion.clave)}
                className="accent-primary size-4"
              />
              <span aria-hidden className="size-5 shrink-0 rounded-full border" style={{ background: opcion.fondo }} />
              {opcion.nombre}
            </label>
          ))}
        </div>
        {errores.color && (
          <p id="sello-color-error" className="text-destructive text-sm">
            {errores.color}
          </p>
        )}
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="activo"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="accent-primary size-5"
        />
        {ETIQUETAS_PROMOCION.casilla}
      </label>

      {/* FR-006: el mismo componente de la franja, aunque la casilla esté desmarcada. */}
      <section aria-labelledby="sello-vista-previa" className="flex flex-col gap-2">
        <h2 id="sello-vista-previa" className="text-sm font-medium">
          {ETIQUETAS_PROMOCION.vistaPrevia}
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <SelloPromocional texto={normalizado} color={color} vacio={normalizado === ""} vistaPrevia />
        </div>
      </section>

      <Button type="submit" disabled={enviando || excedido} className="h-11">
        {enviando ? "Guardando…" : ETIQUETAS_PROMOCION.guardar}
      </Button>

      <p aria-live="polite" className="text-sm font-medium">
        {mensaje}
      </p>
    </form>
  );
}

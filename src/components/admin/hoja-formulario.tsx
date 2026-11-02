"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Resultado } from "@/lib/resultado";

type Accion = (anterior: null, formulario: FormData) => Promise<Resultado<{ id: string }>>;
type Fallo = Extract<Resultado<never>, { ok: false }>;

const ErroresCampo = createContext<Record<string, string> | undefined>(undefined);

export function Campo({
  nombre,
  etiqueta,
  ...props
}: { nombre: string; etiqueta: string } & React.ComponentProps<typeof Input>) {
  const error = useContext(ErroresCampo)?.[nombre];
  const id = `campo-${nombre}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input
        id={id}
        name={nombre}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/** Hoja con un formulario de operación; al guardar lleva al detalle de la operación. */
export function HojaFormulario({
  disparador,
  titulo,
  descripcion,
  accion,
  envio,
  varianteDisparador = "outline",
  children,
}: {
  disparador: React.ReactNode;
  titulo: string;
  descripcion: string;
  accion: Accion;
  envio: string;
  varianteDisparador?: "default" | "outline";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [enviando, iniciar] = useTransition();

  // Se envía a mano: `<form action>` vaciaría lo capturado aunque la acción rechace los datos.
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      const resultado = await accion(null, datos);
      if (resultado.ok) {
        setFallo(null);
        setAbierta(false);
        router.push(`/admin/operaciones/${resultado.datos.id}`);
      } else {
        setFallo(resultado);
      }
    });
  }

  return (
    <Sheet open={abierta} onOpenChange={setAbierta}>
      <SheetTrigger asChild>
        <Button variant={varianteDisparador} size="sm">
          {disparador}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{titulo}</SheetTitle>
          <SheetDescription>{descripcion}</SheetDescription>
        </SheetHeader>
        <ErroresCampo.Provider value={fallo?.campos}>
          <form onSubmit={enviar} noValidate className="flex flex-col gap-4 px-4 pb-6">
            {children}
            {fallo && (
              <p role="alert" className="text-destructive text-sm">
                {fallo.mensaje}
              </p>
            )}
            <Button type="submit" disabled={enviando} className="h-11">
              {enviando ? "Guardando…" : envio}
            </Button>
          </form>
        </ErroresCampo.Provider>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/acciones/sesion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularioEntrar() {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(iniciarSesion, null);

  useEffect(() => {
    if (estado?.ok) router.replace("/admin");
  }, [estado, router]);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="usuario">Usuario</Label>
        <Input
          id="usuario"
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contrasena">Contraseña</Label>
        <Input id="contrasena" name="contrasena" type="password" autoComplete="current-password" required />
      </div>
      {estado && !estado.ok && (
        <p role="alert" className="text-destructive text-sm">
          {estado.mensaje}
        </p>
      )}
      <Button type="submit" disabled={enviando} className="h-11">
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

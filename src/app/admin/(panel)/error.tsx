"use client";

import { AvisoError } from "@/components/aviso-error";

export default function PaginaError({ reset }: { error: Error; reset: () => void }) {
  return <AvisoError reintentar={reset} />;
}

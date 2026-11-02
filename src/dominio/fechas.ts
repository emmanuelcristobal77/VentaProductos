const ZONA = "America/Mexico_City";

const fecha = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, dateStyle: "long" });
const hora = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const relojMexico = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** Diferencia, en milisegundos, entre la hora de México y UTC en ese instante. */
function desfase(instante: number): number {
  const partes = Object.fromEntries(
    relojMexico.formatToParts(instante).map(({ type, value }) => [type, Number(value)]),
  );
  return (
    Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, partes.second) - instante
  );
}

/** Convierte un `AAAA-MM-DD` de México al instante UTC en que ese día empieza; null si no existe. */
export function inicioDeDia(dia: string, desplazamientoDias = 0): string | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!coincidencia) return null;

  const [anio, mes, numero] = coincidencia.slice(1).map(Number);
  const medianoche = new Date(Date.UTC(anio, mes - 1, numero));
  if (medianoche.getUTCMonth() !== mes - 1 || medianoche.getUTCDate() !== numero) return null;

  const instante = Date.UTC(anio, mes - 1, numero + desplazamientoDias);
  return new Date(instante - desfase(instante)).toISOString();
}

export function inicioDelDiaSiguiente(dia: string): string | null {
  return inicioDeDia(dia, 1);
}

export function formatearFecha(valor: string | Date): string {
  return fecha.format(new Date(valor));
}

export function formatearHora(valor: string | Date): string {
  const partes = hora.formatToParts(new Date(valor));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value;
  const periodo = parte("dayPeriod") === "AM" ? "a. m." : "p. m.";
  return `${parte("hour")}:${parte("minute")} ${periodo}, hora del centro de México`;
}

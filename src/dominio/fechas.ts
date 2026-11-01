const ZONA = "America/Mexico_City";

const fecha = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, dateStyle: "long" });
const hora = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatearFecha(valor: string | Date): string {
  return fecha.format(new Date(valor));
}

export function formatearHora(valor: string | Date): string {
  const partes = hora.formatToParts(new Date(valor));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value;
  const periodo = parte("dayPeriod") === "AM" ? "a. m." : "p. m.";
  return `${parte("hour")}:${parte("minute")} ${periodo}, hora del centro de México`;
}

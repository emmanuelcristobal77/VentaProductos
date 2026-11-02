import { ErrorNegocio } from "@/lib/resultado";
import { registrarVenta } from "@/servicios/operaciones";

// Proceso independiente: espera la señal de salida y compite por la última unidad.
const [productoId, salida] = process.argv.slice(2);

while (Date.now() < Number(salida));

try {
  registrarVenta({ productoId, cantidad: 1, precioUnitarioCentavos: 10000 });
  console.log("completada");
} catch (error) {
  if (!(error instanceof ErrorNegocio)) throw error;
  console.log(error.codigo);
}

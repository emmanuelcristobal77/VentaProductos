# Aceptación: Carga masiva de productos

**Feature**: [spec.md](../spec.md) | **Quickstart**: [quickstart.md](../quickstart.md)

## T042: tiempo de procesamiento (plan, Performance Goals)

- **Fecha**: 2026-11-07, en la laptop de desarrollo.
- **Carga**: 50 productos nuevos con una foto JPEG cada uno; comprimido de 8.8 MB. Las fotos generadas salieron de 180 KB en promedio, no de 500 KB como pedía la tarea.
- **Resultado**: `procesarCarga` tardó **0.42 s** y registró los 50. La meta es de menos de 30 s, así que hay margen aunque las fotos fueran tres veces más grandes.

## T045: ensayo de la migración `0002`

- **Fecha**: 2026-11-07.
- **Base**: copia en `C:\restauracion-prueba\ensayo-0002` de la base de `ensayo-0001`, que es el respaldo de producción del 2026-11-06 con la migración `0001` ya aplicada. **No es el respaldo más reciente**: antes de publicar conviene repetirlo con el del día.
- **Comando**: `DATOS_DIR=C:/restauracion-prueba/ensayo-0002 npx tsx scripts/migrar.ts`.

| Dato | Antes | Después |
|---|---|---|
| Migraciones aplicadas | 2 | 3 |
| Fotos (total / activas) | 57 / 56 | 57 / 56 |
| Productos | 48 | 48 |
| Columna `nombre_original` | No | Sí, en nulo en todas |
| `PRAGMA foreign_key_check` | — | 0 filas |

## T046: cargas A, B, C y D hechas por el propietario

- **Fecha**: 2026-11-07, en local (`npm run dev`), desde la laptop.
- **Quién**: el propietario, con sus propios datos de prueba, y comprimidos hechos con el Bloc de notas y el Explorador de Windows.
- **Lo que vio el propietario**: todo correcto en las cuatro cargas; el reporte se descargó y se lee bien en el Bloc de notas.
- **Lo que quedó en la base** (revisado el mismo día):
  - Las fotos con «ñ» en el nombre se encontraron: `muñeca.jpg`, `muñeca1.jpg` y `muñeca2.jpg`. Eso confirma la lectura de nombres en CP850.
  - 4 productos nuevos, cada uno con su foto.
  - 2 productos existentes actualizados con el precio del archivo. Uno recibió una foto nueva sin perder la anterior.
  - Ninguna foto repetida en un producto y ninguna categoría duplicada.
- **Paso 20 (celular real)**: hecho el 2026-11-07 en local, desde el celular del propietario en la misma red Wi-Fi (`http://192.168.0.16:3000`). El comprimido se subió y se procesó. Al principio la pantalla no respondía: Next.js en modo de desarrollo bloquea los scripts que pide otro dispositivo. Se resolvió con `allowedDevOrigins`, que se lee de la variable `ORIGENES_DESARROLLO` de `.env.local`. En producción ese bloqueo no existe. El propietario indicó que la carga masiva se hará normalmente desde la laptop.

## Pendientes del propietario

- T047 (SC-007 y SC-001): **diferida por decisión del propietario (2026-11-07)**. Por ahora solo el propietario hace las cargas, así que no hay a quién probar sin ayuda. Se hace cuando otra persona vaya a usar la función. Mientras tanto, SC-007 y SC-001 quedan sin comprobar.
- T048: pasos 2, 5, 14, 16 y 20 en producción después de publicar. El paso 24 queda diferido hasta la primera carga grande (decisión del propietario, 2026-11-07).

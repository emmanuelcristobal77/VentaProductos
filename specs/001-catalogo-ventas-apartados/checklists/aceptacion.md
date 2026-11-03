# Aceptación: VendeProductos v0

**Feature**: [spec.md](../spec.md) · **Guía**: [quickstart.md](../quickstart.md)

## Velocidad del catálogo (T092 y T085)

Meta de [plan.md](../plan.md): primera vista del catálogo en menos de 2.5 segundos en una conexión móvil 4G.

Medido el 2026-11-03 en `https://app.cristobalia.com/`, con 34 productos con foto. Herramienta: Lighthouse 12.8.2 en perfil móvil, con su simulación por defecto (4G lento: 1.6 Mbps, 150 ms de latencia y CPU 4 veces más lenta). Tres pasadas por versión; se reporta la mediana.

| Versión | Puntaje | FCP | LCP | Cumple |
|---|---|---|---|---|
| Inicial | 77 | 2.6 s | 3.0 s | No |
| `2070787`: fotos con prioridad alta y fuente solo latina | 94 | 1.1 s | 2.7 s | No |
| `affbf4f`: avisos solo en administración | 94 | 1.1 s | 2.6 s (2.5–2.8) | No |

- Con la versión `affbf4f`, la foto principal se descarga en unos 0.2 s, pero tarda unos 0.55 s más en pintarse mientras el teléfono ejecuta el JavaScript, que es sobre todo React y Next.js.
- Con un 4G normal (perfil "Fast 4G" de Chrome: 9 Mbps y 60 ms de latencia, con la misma CPU 4 veces más lenta), la versión `affbf4f` da una mediana de puntaje 99, FCP 0.6 s y LCP 0.9 s.
- **Pendiente**: decidir cómo cerrar la diferencia y validar en un móvil real los pasos 1 y 2 del quickstart.
